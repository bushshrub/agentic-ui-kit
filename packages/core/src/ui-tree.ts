/**
 * Host-registered components: instead of HTML, the model writes a small tree of components the host
 * registered (trusted React, themed, able to read the app's own data). The kit validates each node against
 * its component's schema; bad nodes render nothing. Idea from OpenUI (github.com/thesysdev/openui).
 */

export type JsonSchema = Record<string, unknown>;

/** One node of the tree. */
export interface UiNode {
  component: string;
  props?: Record<string, unknown>;
  children?: UiNode[];
}

/**
 * What a component can do when the user acts on it. Fixed set; prefer `set` (local state) over round trips.
 * - set: sets a key of the widget's state, which props read with `{ "$state": key }`.
 * - send: sends `text` to the assistant as the user.
 * - open: opens an http(s) URL.
 * - copy: copies `text` to the clipboard.
 */
export type UiAction =
  | { action: "set"; key: string; value: unknown }
  | { action: "send"; text: string }
  | { action: "open"; url: string }
  | { action: "copy"; text: string };

/** Input of the render tool. */
export interface RenderUiInput {
  root: UiNode;
  /** Starting values of the widget's state. */
  state?: Record<string, unknown>;
}

/** A component as the model sees it. */
export interface UiComponentSpec {
  name: string;
  /** When to use it, for the model. */
  description: string;
  /** JSON Schema of its props (an object schema). With zod: `z.toJSONSchema(schema)`. */
  props?: JsonSchema;
  /** Whether it takes child nodes. */
  children?: boolean;
}

/** Schema for a prop that holds an action, e.g. `{ onPress: uiActionSchema }`. */
export const uiActionSchema: JsonSchema = {
  anyOf: [
    { type: "object", properties: { action: { const: "set" }, key: { type: "string" }, value: {} }, required: ["action", "key", "value"] },
    { type: "object", properties: { action: { const: "send" }, text: { type: "string", minLength: 1 } }, required: ["action", "text"] },
    { type: "object", properties: { action: { const: "open" }, url: { type: "string", pattern: "^https?://" } }, required: ["action", "url"] },
    { type: "object", properties: { action: { const: "copy" }, text: { type: "string" } }, required: ["action", "text"] },
  ],
};

export const renderUiToolName = "render_ui";

const typeOk = (type: string, value: unknown) => {
  switch (type) {
    case "string": return typeof value === "string";
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "integer": return Number.isInteger(value);
    case "boolean": return typeof value === "boolean";
    case "null": return value === null;
    case "array": return Array.isArray(value);
    case "object": return typeof value === "object" && value !== null && !Array.isArray(value);
    default: return true;
  }
};

/**
 * Whether `value` fits `schema`. Covers the common JSON Schema keywords (type, enum, const, properties,
 * required, additionalProperties, items, anyOf/oneOf, lengths, ranges, pattern); others are ignored.
 */
export function matchesSchema(schema: JsonSchema | boolean | undefined, value: unknown): boolean {
  if (schema === undefined || schema === true) return true;
  if (schema === false) return false;
  const s = schema as Record<string, any>;
  if (s.type !== undefined && ![s.type].flat().some((t: string) => typeOk(t, value))) return false;
  if (s.const !== undefined && JSON.stringify(s.const) !== JSON.stringify(value)) return false;
  if (Array.isArray(s.enum) && !s.enum.some((e: unknown) => JSON.stringify(e) === JSON.stringify(value))) return false;
  const anyOf = s.anyOf ?? s.oneOf;
  if (Array.isArray(anyOf) && !anyOf.some((sub: JsonSchema) => matchesSchema(sub, value))) return false;
  if (Array.isArray(s.allOf) && !s.allOf.every((sub: JsonSchema) => matchesSchema(sub, value))) return false;
  if (typeof value === "string") {
    if (typeof s.minLength === "number" && value.length < s.minLength) return false;
    if (typeof s.maxLength === "number" && value.length > s.maxLength) return false;
    if (typeof s.pattern === "string" && !new RegExp(s.pattern).test(value)) return false;
  }
  if (typeof value === "number") {
    if (typeof s.minimum === "number" && value < s.minimum) return false;
    if (typeof s.maximum === "number" && value > s.maximum) return false;
  }
  if (Array.isArray(value)) {
    if (typeof s.minItems === "number" && value.length < s.minItems) return false;
    if (typeof s.maxItems === "number" && value.length > s.maxItems) return false;
    if (s.items !== undefined && !value.every((v) => matchesSchema(s.items, v))) return false;
  }
  if (typeOk("object", value)) {
    const obj = value as Record<string, unknown>;
    const props = (s.properties ?? {}) as Record<string, JsonSchema>;
    if (Array.isArray(s.required) && !s.required.every((k: string) => obj[k] !== undefined)) return false;
    for (const [k, v] of Object.entries(obj)) {
      if (k in props) {
        if (!matchesSchema(props[k], v)) return false;
      } else if (s.additionalProperties !== undefined && !matchesSchema(s.additionalProperties, v)) return false;
    }
  }
  return true;
}

/** A prop that reads the widget's state: `{ "$state": "tab" }`. */
export function isStateRef(value: unknown): value is { $state: string } {
  return typeof value === "object" && value !== null && typeof (value as { $state?: unknown }).$state === "string";
}

/** The render tool for these components, with a description generated from them. */
export function renderUiTool(components: readonly UiComponentSpec[]) {
  const list = components
    .map((c) => {
      const props = c.props ? JSON.stringify(c.props) : "{}";
      return `- ${c.name}${c.children ? " (takes children)" : ""}: ${c.description}\n  props: ${props}`;
    })
    .join("\n");
  return {
    name: renderUiToolName,
    description: `Show an interactive visual built from the app's components, inline in your reply.
Write a tree: { "root": { "component": "<name>", "props": { ... }, "children": [ ...nodes ] }, "state": { ... } }.
Only these components exist; a node with an unknown component or props that don't fit is not shown.
${list}

Actions: a prop the schema marks as an action takes one of
{ "action": "set", "key": "<state key>", "value": <any> } (change the widget's state; prefer this),
{ "action": "send", "text": "..." } (send a message as the user, for what needs you),
{ "action": "open", "url": "https://..." }, { "action": "copy", "text": "..." }.
State: "state" holds starting values; any prop can read one with { "$state": "<key>" }.
Set apart what you added or changed from what was already there.`,
    inputSchema: {
      type: "object",
      properties: {
        root: { type: "object", description: "The top node.", properties: { component: { enum: components.map((c) => c.name) } }, required: ["component"] },
        state: { type: "object", description: "Starting values of the widget's state." },
      },
      required: ["root"],
    },
  };
}
