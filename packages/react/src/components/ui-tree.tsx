import {
  isStateRef,
  parseUiMarkup,
  salvageJson,
  uiMarkupLanguage,
  matchesSchema,
  uiActionSchema,
  type RenderUiInput,
  type ToolCallPart,
  type UiAction,
  type UiComponentSpec,
  type UiNode,
} from "@agentic-ui-kit/core";
import { Component, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { WidgetFrame, useWidgetHost } from "./widget-frame";

/** A component the model may use in a `render_ui` tree: its spec for the model and the React that draws it. */
export interface UiComponent<Props = any> extends UiComponentSpec {
  /** Gets the node's props (already checked against `props`, state refs resolved) and its rendered children. */
  render: ComponentType<Props & { children?: ReactNode }>;
}

/** Keeps a widget's state across reloads, keyed by the tool call's id. */
export interface UiStateStore {
  load(id: string): Record<string, unknown> | undefined;
  save(id: string, state: Record<string, unknown>): void;
}

interface Registry {
  components: Map<string, UiComponent>;
  persist?: UiStateStore | undefined;
  markup: string | false;
}

const RegistryContext = createContext<Registry | undefined>(undefined);

export interface UiComponentsProviderProps {
  components: readonly UiComponent[];
  /** Keeps each widget's state (ticks, picked tab) across reloads. */
  persist?: UiStateStore;
  /** Fence language of UI blocks in replies (```ui); `false` shows them as code. */
  markup?: string | false;
  children: ReactNode;
}

/**
 * The components the model may use: in ```ui blocks of its replies (see `uiMarkupGuide` in
 * agentic-ui-kit/core) and in tool calls drawn with `uiTreeToolView`. `persist` keeps each widget's state.
 */
export function UiComponentsProvider({ components, persist, markup = uiMarkupLanguage, children }: UiComponentsProviderProps) {
  const value = useMemo(() => ({ components: new Map(components.map((c) => [c.name, c])), persist, markup }), [components, persist, markup]);
  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

interface TreeContext {
  state: Record<string, unknown>;
  run: (action: UiAction) => void;
  streaming: boolean;
}

const TreeContext = createContext<TreeContext>({ state: {}, run: () => {}, streaming: false });

/** Inside a registered component: runs an action from its props, e.g. `run(props.onPress)`. Bad actions do nothing. */
export function useUiAction(): (action: unknown) => void {
  const { run } = useContext(TreeContext);
  return useCallback((action: unknown) => matchesSchema(uiActionSchema, action) && run(action as UiAction), [run]);
}

/** Inside a registered component: the widget's state and a setter, for inputs that write to it. */
export function useUiState(): [Record<string, unknown>, (key: string, value: unknown) => void] {
  const { state, run } = useContext(TreeContext);
  return [state, useCallback((key: string, value: unknown) => run({ action: "set", key, value }), [run])];
}

/** Replaces `{ "$state": key }` anywhere in the props with the state's value. */
function resolve(value: unknown, state: Record<string, unknown>): unknown {
  if (isStateRef(value)) return state[value.$state];
  if (Array.isArray(value)) return value.map((v) => resolve(v, state));
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = resolve(v, state);
      if (r !== undefined) out[k] = r;
    }
    return out;
  }
  return value;
}

/** A component that throws renders nothing instead of taking the message down. */
class Contain extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.warn("render_ui:", error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Node({ node, registry }: { node: unknown; registry: Registry }): ReactNode {
  const { state } = useContext(TreeContext);
  if (Array.isArray(node)) return node.map((child, i) => <Node key={i} node={child} registry={registry} />);
  if (typeof node !== "object" || node === null) return null;
  const { component, props = {}, children } = node as Partial<UiNode>;
  const spec = typeof component === "string" ? registry.components.get(component) : undefined;
  if (!spec || typeof props !== "object") return null;
  const resolved = resolve(props, state) as Record<string, unknown>;
  if (!matchesSchema(spec.props ?? { type: "object" }, resolved)) return null;
  const Render = spec.render;
  const kids = spec.children && Array.isArray(children) ? children.map((child, i) => <Node key={i} node={child} registry={registry} />) : undefined;
  return (
    <Contain>
      <Render {...resolved}>{kids}</Render>
    </Contain>
  );
}

export interface UiTreeProps {
  /** Identifies the widget, usually the tool call's id. Keys its state in the store unless `stateKey` is set. */
  id: string;
  /**
   * Keys the widget's state in the `persist` store instead of `id`. Pass an id that is the same while the
   * message streams and after it is saved, when the part ids differ between the two (e.g. your tool activity id).
   */
  stateKey?: string;
  /** The tree so far; it may be cut short while it streams. */
  root: unknown;
  /** Starting values of the state, from the tree. */
  state?: Record<string, unknown>;
  streaming?: boolean;
}

/** Draws a `render_ui` tree with the registered components. Unknown components and bad props render nothing. */
export function UiTree({ id, stateKey, root, state: initial, streaming = false }: UiTreeProps) {
  const storeKey = stateKey ?? id;
  const registry = useContext(RegistryContext);
  const host = useWidgetHost();
  const [local, setLocal] = useState<Record<string, unknown>>(() => registry?.persist?.load(storeKey) ?? {});
  const changed = useRef(false);
  const latest = useRef(host);
  latest.current = host;

  useEffect(() => {
    if (changed.current) registry?.persist?.save(storeKey, local);
  }, [storeKey, local, registry]);

  const run = useCallback((action: UiAction) => {
    switch (action.action) {
      case "set":
        changed.current = true;
        return setLocal((s) => ({ ...s, [action.key]: action.value }));
      case "send":
        return latest.current.onPrompt?.(action.text);
      case "open":
        return /^https?:\/\//i.test(action.url) && latest.current.onOpenLink?.(action.url);
      case "copy":
        return void navigator.clipboard?.writeText(action.text).catch(() => {});
    }
  }, []);

  const state = useMemo(() => ({ ...(typeof initial === "object" && initial ? initial : {}), ...local }), [initial, local]);
  const context = useMemo(() => ({ state, run, streaming }), [state, run, streaming]);
  if (!registry) return null;
  return (
    <TreeContext.Provider value={context}>
      <div className="chat-ui-tree my-2" aria-busy={streaming || undefined}>
        <Node node={root} registry={registry} />
      </div>
    </TreeContext.Provider>
  );
}

/** The fence language drawn as UI here, or undefined outside a `UiComponentsProvider`. */
export function useUiMarkupLanguage(): string | undefined {
  const registry = useContext(RegistryContext);
  return registry && registry.markup !== false ? registry.markup : undefined;
}

/** A ```ui block from a reply, drawn with the registered components. Safe on a block that is still streaming. */
export function UiMarkupBlock({ id, stateKey, source, streaming = false }: { id: string; stateKey?: string; source: string; streaming?: boolean }) {
  const { nodes, state } = useMemo(() => parseUiMarkup(source), [source]);
  return <UiTree id={id} {...(stateKey && { stateKey })} root={nodes} state={state} streaming={streaming} />;
}

export interface UiToolViewOptions {
  /** The key for the widget's `persist` state, when the call's id differs between live and saved parts. See `UiTreeProps.stateKey`. */
  stateKey?: (part: ToolCallPart) => string | undefined;
}

function stateKeyOf(options: UiToolViewOptions, part: ToolCallPart) {
  const stateKey = options.stateKey?.(part);
  return stateKey ? { stateKey } : {};
}

/**
 * A tool view that draws a call's (streaming) JSX markup with your registered components, for whatever tool
 * your harness uses; the suggested one is core's `showUiTool`. Register it under your tool's name:
 * `{ show_ui: uiMarkupToolView() }`. `read` maps your tool's input to the markup; the default reads `markup`.
 */
export function uiMarkupToolView(
  read: (input: unknown) => string | undefined = (input) => {
    const markup = (input as { markup?: unknown } | undefined)?.markup;
    return typeof markup === "string" ? markup : undefined;
  },
  options: UiToolViewOptions = {},
) {
  function UiMarkupToolBlock({ part }: { part: ToolCallPart }) {
    const markup = read(part.input ?? part.partialInput);
    if (!markup) return null;
    return <UiMarkupBlock id={part.id} {...stateKeyOf(options, part)} source={markup} streaming={part.status === "streaming" || part.status === "input"} />;
  }
  return { Block: UiMarkupToolBlock };
}

/** Reads `{ root, state }`. Models sometimes send `root` or `state` as a JSON string; those are parsed too. */
export function readTreeInput(input: unknown): { root?: unknown; state?: Record<string, unknown> } {
  const i = (input ?? {}) as Partial<Record<keyof RenderUiInput, unknown>>;
  const unwrap = (v: unknown) => (typeof v === "string" ? salvageJson(v).value : v);
  const root = unwrap(i.root);
  const state = unwrap(i.state);
  return { ...(root !== undefined && { root }), ...(typeof state === "object" && state !== null && { state: state as Record<string, unknown> }) };
}

/**
 * A tool view that draws a call's (streaming) input as a tree of your registered components, for whatever
 * tool your harness uses. Register it under your tool's name: `{ render_ui: uiTreeToolView() }`. `read` maps
 * your tool's input to the tree and its starting state; the default reads `{ root, state }`, the shape of
 * the suggested `renderUiTool`.
 */
export function uiTreeToolView(read: (input: unknown) => { root?: unknown; state?: Record<string, unknown> } = readTreeInput, options: UiToolViewOptions = {}) {
  function UiTreeToolBlock({ part }: { part: ToolCallPart }) {
    const { root, state } = read(part.input ?? part.partialInput);
    if (!root) return null;
    const ok = typeof state === "object" && state !== null;
    return <UiTree id={part.id} {...stateKeyOf(options, part)} root={root} {...(ok && { state })} streaming={part.status === "streaming" || part.status === "input"} />;
  }
  return { Block: UiTreeToolBlock };
}

/**
 * The escape hatch: raw HTML or SVG in a sandboxed WidgetFrame, as a node of the tree. Register it only if
 * the model may write HTML; it gets what the chat's `widgets` host allows.
 */
export const htmlComponent: UiComponent<{ html: string; title?: string }> = {
  name: "Html",
  description: "Raw HTML or <svg> in a sandboxed frame, only for what the other components cannot show. Follow the visual design guide.",
  props: { type: "object", properties: { html: { type: "string" }, title: { type: "string" } }, required: ["html"] },
  render: function Html({ html, title }) {
    const { streaming } = useContext(TreeContext);
    const { allow, onPrompt, onOpenLink } = useWidgetHost();
    return (
      <WidgetFrame
        html={html}
        streaming={streaming}
        {...(title && { title })}
        {...(allow && { allow })}
        {...(onPrompt && { onPrompt })}
        {...(onOpenLink && { onOpenLink })}
      />
    );
  },
};
