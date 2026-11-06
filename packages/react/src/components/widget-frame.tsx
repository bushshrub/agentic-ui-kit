import type { ToolCallPart, VisualizeInput, WidgetPart } from "@agentic-ui-kit/core";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLabels } from "../primitives/labels";

/*
 * WidgetFrame draws untrusted HTML in a sandboxed iframe: model-written fragments (the visualize tool, `widget`
 * parts) and MCP App UIs. Fixed on purpose, not options:
 * - sandbox="allow-scripts" only: an opaque origin with no access to the page, its cookies or storage, no
 *   popups, no top navigation, no forms.
 * - A CSP meta tag blocks every request except to the domains in `allow` (scripts and styles inline only).
 * - Messages are accepted only from that frame's window, and only the requests below do anything.
 * Protocol: MCP Apps (spec 2026-01-26), JSON-RPC 2.0 over postMessage.
 */

/** Origins a widget may load from, e.g. "https://unpkg.com". Entries that are not plain origins are dropped. */
export interface WidgetAllow {
  /** Scripts, styles, images, fonts, media: a CDN for a library, a map tile server. */
  resourceDomains?: string[];
  /** fetch, XHR and WebSocket. */
  connectDomains?: string[];
}

/** An MCP App UI resource, read by the host (the kit never fetches anything for a widget). */
export interface WidgetResource {
  /** The full HTML document (`text/html;profile=mcp-app`). */
  html: string;
  /** What the resource asks to load (its `_meta.ui.csp`); intersected with the host's `allow`. */
  csp?: WidgetAllow;
}

/** What widgets in this chat may do. A callback left out turns that ability off. */
export interface WidgetHost {
  /** The most any widget may load. Nothing by default. */
  allow?: WidgetAllow;
  /** The widget's sendPrompt(text) / MCP `ui/message`: send a message as the user. */
  onPrompt?: (text: string) => void | undefined;
  /** The widget's openLink(url) / MCP `ui/open-link`. Only http(s) URLs get here. */
  onOpenLink?: (url: string) => void | undefined;
  /** MCP `tools/call` from an app UI: call a tool on its server. Resolves to the MCP CallToolResult. */
  onCallTool?: (name: string, args: Record<string, unknown>) => Promise<unknown> | undefined;
  /** Reads the UI resource of a `widget` part with a `resourceUri`. Without it such parts render nothing. */
  readResource?: (uri: string) => Promise<WidgetResource>;
  /**
   * A widget's script failed (an exception or a rejected promise), e.g. to send back to the model so it can
   * fix the widget. `partId` is the widget part or tool call. Each message is reported once per widget.
   */
  onWidgetError?: ((error: { partId: string; message: string }) => void) | undefined;
}

const WidgetHostContext = createContext<WidgetHost>({});

/** Sets what widgets below may do. ChatView and ChatTranscript set it from their `widgets` prop. */
export function WidgetHostProvider({ host, children }: { host: WidgetHost; children: ReactNode }) {
  return <WidgetHostContext.Provider value={host}>{children}</WidgetHostContext.Provider>;
}

export function useWidgetHost(): WidgetHost {
  return useContext(WidgetHostContext);
}

export interface WidgetFrameProps extends Omit<WidgetHost, "readResource" | "onWidgetError"> {
  /** The widget's script failed; each message once. */
  onError?: (message: string) => void;
  /** A fragment (no <html>/<body>) or an <svg>, as the model writes it; or a full document when `document`. */
  html: string;
  /** `html` is a full MCP App document: it runs as is and talks MCP Apps itself. */
  document?: boolean;
  /** True while the model is still writing the fragment: it fills in as it arrives, scripts run once done. */
  streaming?: boolean;
  title?: string;
  /** Shown in turn while streaming, e.g. "Finding free slots". */
  loadingMessages?: string[];
  /** What the widget asks to load (MCP `_meta.ui.csp`). Intersected with `allow`, never more. */
  csp?: WidgetAllow;
  /** App UIs: the tool call's arguments (`ui/notifications/tool-input`). */
  toolInput?: Record<string, unknown>;
  /** App UIs: the tool's CallToolResult (`ui/notifications/tool-result`). */
  toolResult?: unknown;
  /** App UIs: set when the call was cancelled, with the reason (`ui/notifications/tool-cancelled`). */
  cancelled?: string;
  className?: string;
}

/** The tallest a widget may grow, in px. */
export const WIDGET_MAX_HEIGHT = 2000;
const PROTOCOL_VERSION = "2026-01-26";
const THEME_VARS = [
  "bg", "fg", "muted", "subtle", "surface", "raised", "hover", "selected", "border", "border-strong", "divider",
  "accent", "accent-fg", "check", "warning", "danger", "code-bg", "font-sans", "font-serif", "font-mono",
  "radius-sm", "radius-md", "radius-lg", "ui-font-size", "ui-font-size-sm", "message-font-size",
];

const ORIGIN = /^(https?|wss?):\/\/(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/;

function origins(list: string[] | undefined): string[] {
  return (list ?? []).map((d) => d.trim().toLowerCase().replace(/\/$/, "")).filter((d) => ORIGIN.test(d));
}

/** Whether `origin` is covered by `allowed`, which may be a wildcard like "https://*.example.com". */
function covers(allowed: string, origin: string) {
  if (allowed === origin) return true;
  const wild = /^([a-z]+:\/\/)\*\.(.+)$/.exec(allowed);
  return !!wild && origin.startsWith(wild[1]!) && origin.slice(wild[1]!.length).endsWith("." + wild[2]) && !origin.includes("*");
}

/** The part of a widget's request that the host allows. */
export function intersectAllow(request: WidgetAllow, allow: WidgetAllow = {}): WidgetAllow {
  const keep = (asked: string[] | undefined, max: string[] | undefined) => origins(asked).filter((o) => origins(max).some((m) => covers(m, o)));
  return { resourceDomains: keep(request.resourceDomains, allow.resourceDomains), connectDomains: keep(request.connectDomains, allow.connectDomains) };
}

/** The Content-Security-Policy of a widget's document. */
export function widgetCsp(allow: WidgetAllow = {}): string {
  const res = origins(allow.resourceDomains).join(" ");
  const conn = origins(allow.connectDomains).join(" ");
  const with_ = (base: string) => (res ? `${base} ${res}` : base);
  return [
    "default-src 'none'",
    with_("script-src 'unsafe-inline'"),
    with_("style-src 'unsafe-inline'"),
    with_("img-src data: blob:"),
    with_("font-src data:"),
    with_("media-src data: blob:"),
    `connect-src ${conn || "'none'"}`,
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

/** Runs inside a fragment's frame: renders the markup, reports its height, offers sendPrompt and openLink. */
const BOOT = `(() => {
  const root = document.getElementById("widget");
  let id = 0;
  const post = (method, params, request) => parent.postMessage(request ? { jsonrpc: "2.0", id: ++id, method, params } : { jsonrpc: "2.0", method, params }, "*");
  window.sendPrompt = (text) => post("ui/message", { role: "user", content: [{ type: "text", text: String(text) }] }, true);
  window.openLink = (url) => post("ui/open-link", { url: String(url) }, true);
  let done = false;
  const runScripts = async () => {
    for (const old of [...root.querySelectorAll("script")]) {
      const s = document.createElement("script");
      for (const a of old.attributes) s.setAttribute(a.name, a.value);
      s.textContent = old.textContent;
      const loaded = s.src ? new Promise((ok) => { s.onload = s.onerror = ok; }) : null;
      old.replaceWith(s);
      if (loaded) await loaded;
    }
  };
  const theme = (ctx) => {
    const vars = (ctx && ctx.styles && ctx.styles.variables) || {};
    for (const k in vars) if (k.startsWith("--chat-")) document.documentElement.style.setProperty(k, vars[k]);
    if (ctx && ctx.theme) document.documentElement.style.colorScheme = ctx.theme;
  };
  addEventListener("message", (e) => {
    if (e.source !== parent) return;
    const m = e.data || {};
    if (m.method === "ui/notifications/host-context-changed") return theme(m.params);
    const code = m.params && m.params.arguments && m.params.arguments.widget_code;
    if (typeof code !== "string" || done) return;
    if (m.method === "ui/notifications/tool-input-partial") root.innerHTML = code;
    if (m.method === "ui/notifications/tool-input") { done = true; root.innerHTML = code; runScripts(); }
  });
  let last = -1;
  new ResizeObserver(() => {
    const h = Math.ceil(root.getBoundingClientRect().height);
    if (h !== last) { last = h; post("ui/notifications/size-changed", { height: h }); }
    // The frame grows to fit, a moment behind; only content past the cap gets a scrollbar.
    document.documentElement.style.overflowY = h > ${WIDGET_MAX_HEIGHT} ? "auto" : "hidden";
  }).observe(root);
  const seen = new Set();
  const report = (text) => { if (!seen.has(text) && seen.size < 10) { seen.add(text); post("notifications/message", { level: "error", logger: "widget", data: text }); } };
  addEventListener("error", (e) => report(String(e.message) + (e.lineno ? " (line " + e.lineno + ")" : "")));
  addEventListener("unhandledrejection", (e) => report("Unhandled promise rejection: " + String(e.reason && e.reason.message || e.reason)));
  post("ui/notifications/initialized", {});
})();`;

function fragmentDoc(csp: string, theme: Theme) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
:root { ${Object.entries(theme.vars).map(([k, v]) => `${k}: ${v};`).join(" ")} color-scheme: ${theme.scheme}; }
html { overflow: hidden; }
html, body { margin: 0; background: transparent; color: var(--chat-fg); font-family: var(--chat-font-sans);
  font-size: var(--chat-ui-font-size); line-height: 1.5; }
#widget { display: flow-root; }
*, *::before, *::after { box-sizing: border-box; }
button, input, select, textarea { font: inherit; color: inherit; }
</style></head><body><div id="widget"></div><script>${BOOT}</script></body></html>`;
}

/** An app's own document with the host's CSP put first in its head (a second policy can only narrow it). */
function appDoc(csp: string, html: string) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (head) return html.slice(0, head.index + head[0].length) + meta + html.slice(head.index + head[0].length);
  const root = /<html(\s[^>]*)?>/i.exec(html);
  if (root) return html.slice(0, root.index + root[0].length) + `<head>${meta}</head>` + html.slice(root.index + root[0].length);
  return `<!doctype html><html><head>${meta}</head><body>${html}</body></html>`;
}

interface Theme {
  vars: Record<string, string>;
  scheme: "light" | "dark";
}

function readTheme(el: Element): Theme {
  const style = getComputedStyle(el);
  const vars = Object.fromEntries(THEME_VARS.map((v) => [`--chat-${v}`, style.getPropertyValue(`--chat-${v}`).trim()]));
  const scheme = /light/.test(style.colorScheme) && !/dark/.test(style.colorScheme) ? "light" : "dark";
  return { vars, scheme };
}

/** Calls `onChange` when anything above `el` changes attributes (a theme switch) or the OS scheme flips. */
function watchTheme(el: Element, onChange: () => void) {
  const observer = new MutationObserver(onChange);
  for (let node: Element | null = el; node; node = node.parentElement) {
    observer.observe(node, { attributes: true, attributeFilter: ["class", "style", "data-chat-theme"] });
  }
  const media = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : undefined;
  media?.addEventListener?.("change", onChange);
  return () => {
    observer.disconnect();
    media?.removeEventListener?.("change", onChange);
  };
}

interface RpcMessage {
  jsonrpc?: string;
  id?: string | number;
  method?: string;
  params?: Record<string, unknown> & { [key: string]: any };
}

export function WidgetFrame({
  html,
  document: isDocument = false,
  streaming = false,
  title,
  loadingMessages,
  allow,
  csp: request,
  onPrompt,
  onOpenLink,
  onCallTool,
  onError,
  toolInput,
  toolResult,
  cancelled,
  className,
}: WidgetFrameProps) {
  const labels = useLabels();
  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);
  // The theme the document is built with; later changes go over postMessage so the frame never reloads.
  const [initial, setInitial] = useState<Theme>();
  const theme = useRef<Theme>(undefined);
  const [tick, setTick] = useState(0);

  // Model fragments may load what the host allows; app documents only what they ask for, within that.
  const effective = request ? intersectAllow(request, allow) : isDocument ? {} : allow ?? {};
  const policy = widgetCsp(effective);
  const doc = useMemo(
    () => initial && (isDocument ? appDoc(policy, html) : fragmentDoc(policy, initial)),
    // A fragment's markup arrives over postMessage; only an app document is the page itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial, policy, isDocument, isDocument && html],
  );

  const latest = useRef({ onPrompt, onOpenLink, onCallTool, onError, policy, effective });
  latest.current = { onPrompt, onOpenLink, onCallTool, onError, policy, effective };

  const send = (message: object) => frame.current?.contentWindow?.postMessage({ jsonrpc: "2.0", ...message }, "*");
  const context = () => ({
    theme: theme.current?.scheme,
    styles: { variables: theme.current?.vars },
    displayMode: "inline",
    availableDisplayModes: ["inline"],
    containerDimensions: { maxHeight: WIDGET_MAX_HEIGHT, ...(host.current && { width: host.current.clientWidth }) },
    platform: "web",
    ...(labels.locale && { locale: labels.locale }),
  });

  useEffect(() => {
    const el = host.current!;
    theme.current = readTheme(el);
    setInitial(theme.current);
    return watchTheme(el, () => {
      const next = readTheme(el);
      if (JSON.stringify(next) === JSON.stringify(theme.current)) return;
      theme.current = next;
      send({ method: "ui/notifications/host-context-changed", params: { theme: next.scheme, styles: { variables: next.vars } } });
    });
  }, []);

  // A new document is a new widget: it must say it is ready again.
  useEffect(() => setReady(false), [doc]);

  useEffect(() => {
    const reply = (id: RpcMessage["id"], result: unknown) => id !== undefined && send({ id, result });
    const fail = (id: RpcMessage["id"], code: number, message: string) => id !== undefined && send({ id, error: { code, message } });
    const onMessage = async (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const m = (e.data ?? {}) as RpcMessage;
      if (typeof m !== "object" || typeof m.method !== "string") return;
      const { onPrompt, onOpenLink, onCallTool, effective } = latest.current;
      switch (m.method) {
        case "ui/initialize":
          return reply(m.id, {
            protocolVersion: PROTOCOL_VERSION,
            hostInfo: { name: "agentic-ui-kit", version: "1" },
            hostCapabilities: {
              ...(onOpenLink && { openLinks: {} }),
              ...(onCallTool && { serverTools: {} }),
              logging: {},
              sandbox: { csp: effective },
            },
            hostContext: context(),
          });
        case "ui/notifications/initialized":
          return setReady(true);
        case "ui/notifications/size-changed":
          return setHeight(Math.min(Math.max(0, Number(m.params?.height) || 0), WIDGET_MAX_HEIGHT));
        case "ui/message": {
          const content = Array.isArray(m.params?.content) ? m.params.content : [];
          const text = content.find((c: { type?: string }) => c?.type === "text")?.text;
          if (!onPrompt) return fail(m.id, -32000, "Sending messages is off");
          if (typeof text !== "string" || !text.trim()) return fail(m.id, -32602, "Empty message");
          onPrompt(text.slice(0, 4000));
          return reply(m.id, {});
        }
        case "ui/open-link": {
          const url = String(m.params?.url ?? "");
          if (!onOpenLink) return fail(m.id, -32000, "Opening links is off");
          if (!/^https?:\/\//i.test(url)) return fail(m.id, -32602, "Only http(s) links");
          onOpenLink(url);
          return reply(m.id, {});
        }
        case "tools/call": {
          if (!onCallTool) return fail(m.id, -32000, "Calling tools is off");
          const name = String(m.params?.name ?? "");
          const args = (m.params?.arguments ?? {}) as Record<string, unknown>;
          try {
            return reply(m.id, await onCallTool(name, args));
          } catch (error) {
            return fail(m.id, -32000, error instanceof Error ? error.message : String(error));
          }
        }
        case "ping":
          return reply(m.id, {});
        case "notifications/message": {
          const data = typeof m.params?.data === "string" ? m.params.data : JSON.stringify(m.params?.data);
          if (m.params?.level === "error" && data) latest.current.onError?.(data.slice(0, 1000));
          return;
        }
        default:
          return fail(m.id, -32601, "Method not found");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fragments: the markup so far, then the whole of it once.
  useEffect(() => {
    if (!ready || isDocument) return;
    const method = streaming ? "ui/notifications/tool-input-partial" : "ui/notifications/tool-input";
    send({ method, params: { arguments: { widget_code: html } } });
  }, [ready, isDocument, html, streaming]);

  // App documents: the call's input, result and cancellation as they come.
  const inputKey = isDocument && toolInput !== undefined ? JSON.stringify(toolInput) : undefined;
  useEffect(() => {
    if (!ready || inputKey === undefined) return;
    send({ method: streaming ? "ui/notifications/tool-input-partial" : "ui/notifications/tool-input", params: { arguments: JSON.parse(inputKey) } });
  }, [ready, inputKey, streaming]);
  useEffect(() => {
    if (ready && isDocument && toolResult !== undefined) send({ method: "ui/notifications/tool-result", params: toolResult });
  }, [ready, isDocument, toolResult]);
  useEffect(() => {
    if (ready && isDocument && cancelled !== undefined) send({ method: "ui/notifications/tool-cancelled", params: { reason: cancelled } });
  }, [ready, isDocument, cancelled]);

  const lines = loadingMessages?.length ? loadingMessages : [labels.drawingWidget];
  useEffect(() => {
    if (!streaming || lines.length < 2) return;
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, [streaming, lines.length]);

  return (
    <figure ref={host} className={className ?? "my-2"} aria-label={title ?? labels.widget} aria-busy={streaming || undefined}>
      {streaming && (
        <div className="mb-2 animate-pulse font-chat-sans text-(length:--chat-ui-font-size) text-chat-muted motion-reduce:animate-none">
          {lines[tick % lines.length]}
        </div>
      )}
      {doc && (
        <iframe
          ref={frame}
          title={title ?? labels.widget}
          sandbox="allow-scripts"
          srcDoc={doc}
          style={{ height: height || (streaming ? 120 : 0), transition: "height 150ms ease-out" }}
          className="block w-full border-0 bg-transparent"
        />
      )}
    </figure>
  );
}

/** Pulls the host's abilities from context into frame props. */
function useHostProps(partId: string): Omit<WidgetFrameProps, "html"> {
  const { allow, onPrompt, onOpenLink, onCallTool, onWidgetError } = useWidgetHost();
  return {
    ...(allow && { allow }),
    ...(onPrompt && { onPrompt }),
    ...(onOpenLink && { onOpenLink }),
    ...(onCallTool && { onCallTool }),
    ...(onWidgetError && { onError: (message: string) => onWidgetError({ partId, message }) }),
  };
}

/** The default look of a `widget` part: inline html, or an app UI the host reads from `resourceUri`. */
export function WidgetPartView({ part }: { part: WidgetPart }) {
  const host = useWidgetHost();
  const props = useHostProps(part.id);
  const [resource, setResource] = useState<WidgetResource>();
  const uri = part.html === undefined ? part.resourceUri : undefined;
  useEffect(() => {
    if (!uri || !host.readResource) return;
    let live = true;
    host.readResource(uri).then((r) => live && setResource(r), (e) => console.warn("widget:", e));
    return () => {
      live = false;
    };
  }, [uri, host.readResource]);
  if (part.html !== undefined) {
    return <WidgetFrame html={part.html} streaming={part.status === "streaming"} {...(part.title && { title: part.title })} {...props} />;
  }
  if (!resource) return null;
  return <WidgetFrame document html={resource.html} {...(resource.csp && { csp: resource.csp })} {...(part.title && { title: part.title })} {...props} />;
}

/** What a widget tool call's input means for the frame. */
export interface WidgetToolInput {
  html?: string;
  title?: string;
  loadingMessages?: string[];
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** Reads the fields of the suggested `visualizeTool` (widget_code, title, loading_messages). */
export function readVisualizeInput(input: unknown): WidgetToolInput {
  const i = (input ?? {}) as Partial<Record<keyof VisualizeInput, unknown>>;
  const loading = Array.isArray(i.loading_messages) ? i.loading_messages.filter((l): l is string => typeof l === "string" && l !== "") : [];
  return { ...(str(i.widget_code) !== undefined && { html: str(i.widget_code)! }), ...(str(i.title) && { title: str(i.title)! }), ...(loading.length && { loadingMessages: loading.slice(0, 4) }) };
}

/**
 * A tool view that draws a call's (streaming) input in a WidgetFrame, for whatever tool your harness uses
 * to write HTML. Register it under your tool's name: `{ show_widget: widgetToolView() }`. `read` maps your
 * tool's input (possibly cut short while it streams) to the frame's fields; the default reads the suggested
 * `visualizeTool`'s fields.
 */
export function widgetToolView(read: (input: unknown) => WidgetToolInput = readVisualizeInput) {
  function WidgetToolBlock({ part }: { part: ToolCallPart }) {
    const props = useHostProps(part.id);
    const { html = "", title, loadingMessages } = read(part.input ?? part.partialInput);
    if (part.status === "error" && !html) return null;
    return (
      <WidgetFrame
        html={html}
        streaming={part.status === "streaming" || part.status === "input"}
        {...(title && { title })}
        {...(loadingMessages?.length && { loadingMessages })}
        {...props}
      />
    );
  }
  return { Block: WidgetToolBlock };
}

/** The default `onOpenLink` of ChatView and ChatTranscript: a new tab with no opener. */
export function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
