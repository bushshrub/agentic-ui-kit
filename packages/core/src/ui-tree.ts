/**
 * Host-registered components: instead of HTML, the model writes a small tree of components the host
 * registered (trusted React, themed, able to read the app's own data). The kit validates each node against
 * its component's schema; bad nodes render nothing. Idea from OpenUI (github.com/thesysdev/openui).
 */

import { salvageJson } from "./partial-json";

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

const show = (v: unknown) => {
  const text = JSON.stringify(v);
  return text === undefined ? String(v) : text.length > 40 ? text.slice(0, 37) + "..." : text;
};
const kind = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/**
 * Why `value` doesn't fit `schema`, one line per problem, each starting with its path ("props.items[2].label").
 * Empty when it fits. Covers the common JSON Schema keywords (type, enum, const, properties, required,
 * additionalProperties, items, anyOf/oneOf/allOf, lengths, ranges, pattern); others are ignored.
 */
export function schemaErrors(schema: JsonSchema | boolean | undefined, value: unknown, path = "value"): string[] {
  if (schema === undefined || schema === true) return [];
  if (schema === false) return [`${path}: not allowed`];
  const s = schema as Record<string, any>;
  if (s.type !== undefined && ![s.type].flat().some((t: string) => typeOk(t, value))) {
    return [`${path}: expected ${[s.type].flat().join(" or ")}, got ${kind(value)} ${show(value)}`];
  }
  if (s.const !== undefined && JSON.stringify(s.const) !== JSON.stringify(value)) return [`${path}: must be ${show(s.const)}`];
  if (Array.isArray(s.enum) && !s.enum.some((e: unknown) => JSON.stringify(e) === JSON.stringify(value))) {
    return [`${path}: must be one of ${s.enum.map(show).join(", ")}, got ${show(value)}`];
  }
  const anyOf = s.anyOf ?? s.oneOf;
  if (Array.isArray(anyOf)) {
    const each = anyOf.map((sub: JsonSchema) => schemaErrors(sub, value, path));
    if (!each.some((e: string[]) => e.length === 0)) {
      // Report the closest option: the one with the fewest problems.
      return each.reduce((a: string[], b: string[]) => (b.length < a.length ? b : a));
    }
  }
  const out: string[] = [];
  if (Array.isArray(s.allOf)) for (const sub of s.allOf) out.push(...schemaErrors(sub, value, path));
  if (typeof value === "string") {
    if (typeof s.minLength === "number" && value.length < s.minLength) out.push(`${path}: at least ${s.minLength} characters`);
    if (typeof s.maxLength === "number" && value.length > s.maxLength) out.push(`${path}: at most ${s.maxLength} characters`);
    if (typeof s.pattern === "string" && !new RegExp(s.pattern).test(value)) out.push(`${path}: must match ${s.pattern}, got ${show(value)}`);
  }
  if (typeof value === "number") {
    if (typeof s.minimum === "number" && value < s.minimum) out.push(`${path}: at least ${s.minimum}, got ${value}`);
    if (typeof s.maximum === "number" && value > s.maximum) out.push(`${path}: at most ${s.maximum}, got ${value}`);
  }
  if (Array.isArray(value)) {
    if (typeof s.minItems === "number" && value.length < s.minItems) out.push(`${path}: at least ${s.minItems} items, got ${value.length}`);
    if (typeof s.maxItems === "number" && value.length > s.maxItems) out.push(`${path}: at most ${s.maxItems} items, got ${value.length}`);
    if (s.items !== undefined) value.forEach((v, i) => out.push(...schemaErrors(s.items, v, `${path}[${i}]`)));
  }
  if (typeOk("object", value)) {
    const obj = value as Record<string, unknown>;
    const props = (s.properties ?? {}) as Record<string, JsonSchema>;
    if (Array.isArray(s.required)) for (const k of s.required as string[]) if (obj[k] === undefined) out.push(`${path}.${k}: required`);
    for (const [k, v] of Object.entries(obj)) {
      if (k in props) out.push(...schemaErrors(props[k], v, `${path}.${k}`));
      else if (s.additionalProperties === false) out.push(`${path}.${k}: unknown prop (allowed: ${Object.keys(props).join(", ") || "none"})`);
      else if (s.additionalProperties !== undefined) out.push(...schemaErrors(s.additionalProperties, v, `${path}.${k}`));
    }
  }
  return out;
}

/** Whether `value` fits `schema`; see `schemaErrors` for why not. */
export function matchesSchema(schema: JsonSchema | boolean | undefined, value: unknown): boolean {
  return schemaErrors(schema, value).length === 0;
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
"root" is a JSON object, never a string. Only these components exist; a node with an unknown component or
props that don't fit is not shown. One visual per answer: don't also draw the same thing another way.
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

/** What `checkUiTree` found. */
export interface UiTreeCheck {
  /** Every node will show as written. */
  ok: boolean;
  /** One line per problem, with the node's path ("root.children[2]"). */
  errors: string[];
  /** A message to return to the model as the tool result, so it can fix the tree in its next call. */
  feedback: string;
}

/**
 * Checks a render tool's input against the registered components before it reaches the user, so a harness
 * can send the problems back to the model (as the tool result, or a tool error) instead of retrying blind.
 * Accepts what models actually send: `root` as an object, or as a JSON string.
 */
export interface UiTreeCheckOptions {
  /** The tool the feedback tells the model to call again. */
  toolName?: string;
  /** Names a node in messages; default its path ("root.children[2]"). */
  where?: (node: unknown, path: string) => string;
}

export function checkUiTree(input: unknown, components: readonly UiComponentSpec[], options: string | UiTreeCheckOptions = {}): UiTreeCheck {
  const { toolName = renderUiToolName, where } = typeof options === "string" ? { toolName: options } : options;
  const errors: string[] = [];
  const byName = new Map(components.map((c) => [c.name, c]));
  const lower = new Map(components.map((c) => [c.name.toLowerCase(), c.name]));
  let total = 0;
  let bad = 0;
  const fail = (line: string) => errors.push(line);

  const unwrap = (key: string, value: unknown) => {
    if (typeof value !== "string") return value;
    const { value: parsed, error } = salvageJson(value);
    fail(`${key}: must be a JSON object like {"component":"Stack","children":[...]}, not a string: don't put it in quotes or escape it${error ? ` (the string also has ${error})` : ""}`);
    return parsed;
  };
  const i = typeof input === "string" ? unwrap("input", input) : input;
  if (typeof i !== "object" || i === null) {
    const feedback = `Not shown: the input must be an object { "root": { "component": ..., "props": {...}, "children": [...] }, "state": {...} }. Call ${toolName} again.`;
    return { ok: false, errors: ["input: expected an object"], feedback };
  }
  const { root, state: rawState } = i as { root?: unknown; state?: unknown };
  const state = unwrap("state", rawState);
  if (state !== undefined && (typeof state !== "object" || state === null || Array.isArray(state))) fail("state: expected an object of starting values");
  const values = (typeof state === "object" && state !== null ? state : {}) as Record<string, unknown>;

  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node) && path === "root") return node.forEach((n, k) => walk(n, `root[${k}]`));
    total++;
    const at = where ? where(node, path) : path;
    const before = errors.length;
    if (typeof node !== "object" || node === null || Array.isArray(node)) {
      fail(`${at}: expected a node { "component": ..., "props": {...} }, got ${kind(node)}`);
      bad++;
    } else {
      const { component, props = {}, children, ...rest } = node as Record<string, unknown>;
      const extra = Object.keys(rest);
      if (typeof props === "object" && props !== null && "children" in props) fail(`${at}.props.children: children go in the node's "children" array, next to "props", not inside props`);
      if (extra.length) fail(`${at}: unknown key ${extra.map((k) => `"${k}"`).join(", ")} (a node has only component, props, children)`);
      const spec = typeof component === "string" ? byName.get(component) : undefined;
      if (typeof component !== "string") fail(`${at}.component: required, one of ${components.map((c) => c.name).join(", ")}`);
      else if (!spec) {
        const near = lower.get(component.toLowerCase());
        fail(`${at}.component: unknown "${component}"${near ? `; did you mean "${near}"?` : `; use one of ${components.map((c) => c.name).join(", ")}`}`);
      }
      if (typeof props !== "object" || props === null || Array.isArray(props)) fail(`${at}.props: expected an object`);
      else if (spec) {
        // A state ref stands for its starting value; one without a value yet is fine as long as it is set later.
        const unset = new Set<string>();
        const resolve = (v: unknown, at: string): unknown => {
          if (isStateRef(v)) {
            if (!(v.$state in values)) unset.add(at);
            return values[v.$state];
          }
          if (Array.isArray(v)) return v.map((x, n) => resolve(x, `${at}[${n}]`));
          if (typeof v === "object" && v !== null) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, `${at}.${k}`)]).filter(([, x]) => x !== undefined));
          return v;
        };
        const resolved = resolve(props, `${at}.props`);
        for (const line of schemaErrors(spec.props ?? { type: "object" }, resolved, `${at}.props`)) {
          if (line.startsWith(`${at}.props.children:`)) continue;
          if (![...unset].some((u) => line.startsWith(u + ":") || line.startsWith(u + "."))) fail(line);
        }
      }
      // Only the node's own problems leave it out; extra children are just dropped.
      if (errors.length > before) bad++;
      if (children !== undefined) {
        if (spec && !spec.children) fail(`${at}.children: ${spec.name} takes no children (they are not shown)`);
        else if (!Array.isArray(children)) fail(`${at}.children: expected an array of nodes`);
        else children.forEach((child, n) => walk(child, `${path}.children[${n}]`));
      }
    }
  };
  if (root === undefined) fail("root: required");
  else walk(unwrap("root", root), "root");

  const ok = errors.length === 0;
  const feedback = ok
    ? "Shown to the user."
    : `${bad === 0 ? "Not shown as written" : `Only part of it is shown: ${bad} of ${total} nodes were left out`}. Fix these and call ${toolName} again:\n` +
      errors.slice(0, 20).map((e) => `- ${e}`).join("\n") +
      (errors.length > 20 ? `\n- ...and ${errors.length - 20} more` : "");
  return { ok, errors, feedback };
}
