// Prototype of the kit's WidgetFrame, kept in the playground until the design is settled.
// Draws model-written HTML or SVG (a `widget` part, like claude.ai's visualize tool) in a sandboxed iframe:
// - sandbox="allow-scripts" only: an opaque origin, no access to the page, its cookies or storage.
// - A CSP blocks every network request unless the host allows the domain (`allow`).
// - The page's --chat-* variables are copied in, so the widget matches the theme.
// - Messages use MCP Apps names (ui/message, ui/open-link, ui/notifications/size-changed, tool-input[-partial])
//   so the same frame can later host MCP App UIs.
// - While the model writes, the markup fills in as it arrives (scripts inert); scripts run once it is done.
import { useEffect, useMemo, useRef, useState } from "react";

export interface WidgetAllow {
  /** Origins for scripts, styles, images, fonts: e.g. a CDN for a library, a map tile server. */
  resourceDomains?: string[];
  /** Origins for fetch / XHR / WebSocket. */
  connectDomains?: string[];
}

export interface WidgetFrameProps {
  /** The widget's markup so far: an HTML fragment (no <html>/<body>) or an <svg>. */
  html: string;
  /** True while the model is still writing it. */
  streaming: boolean;
  title?: string;
  /** Shown in turn while streaming, e.g. "Laying out the week". */
  loadingMessages?: string[];
  /** What the widget may load. Nothing by default. */
  allow?: WidgetAllow;
  /** The widget's sendPrompt(text): send a message as the user. Leave out to turn it off (read-only chats). */
  onPrompt?: (text: string) => void;
  /** The widget's openLink(url). Leave out to turn it off. */
  onOpenLink?: (url: string) => void;
}

const THEME_VARS = [
  "bg", "fg", "muted", "subtle", "surface", "raised", "hover", "selected", "border", "border-strong", "divider",
  "accent", "accent-fg", "check", "warning", "danger", "code-bg", "font-sans", "font-serif", "font-mono",
  "radius-sm", "radius-md", "radius-lg", "ui-font-size", "ui-font-size-sm", "message-font-size",
];

/** Runs inside the frame. Kept small: it renders, reports its height, and forwards the two allowed requests. */
const BOOT = `(() => {
  const root = document.getElementById("widget");
  const post = (method, params) => parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
  window.sendPrompt = (text) => post("ui/message", { role: "user", content: [{ type: "text", text: String(text) }] });
  window.openLink = (url) => post("ui/open-link", { url: String(url) });
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
  addEventListener("message", (e) => {
    if (e.source !== parent) return;
    const m = e.data || {};
    const code = m.params && m.params.arguments && m.params.arguments.widget_code;
    if (typeof code !== "string") return;
    if (m.method === "ui/notifications/tool-input-partial" && !done) root.innerHTML = code;
    if (m.method === "ui/notifications/tool-input" && !done) { done = true; root.innerHTML = code; runScripts(); }
  });
  let last = 0;
  new ResizeObserver(() => {
    const h = Math.ceil(root.getBoundingClientRect().height);
    if (h !== last) { last = h; post("ui/notifications/size-changed", { height: h }); }
  }).observe(root);
  addEventListener("error", (e) => post("notifications/message", { level: "error", data: String(e.message) }));
  post("ui/notifications/initialized", {});
})();`;

function csp(allow: WidgetAllow = {}) {
  const res = (allow.resourceDomains ?? []).join(" ");
  const conn = (allow.connectDomains ?? []).join(" ");
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${res}`,
    `style-src 'unsafe-inline' ${res}`,
    `img-src data: blob: ${res}`,
    `font-src data: ${res}`,
    `media-src data: blob: ${res}`,
    `connect-src ${conn || "'none'"}`,
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

function srcDoc(themeCss: string, scheme: string, allow?: WidgetAllow) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp(allow)}">
<style>
:root { ${themeCss} color-scheme: ${scheme}; }
html, body { margin: 0; background: transparent; color: var(--chat-fg); font-family: var(--chat-font-sans);
  font-size: var(--chat-ui-font-size); line-height: 1.5; }
#widget { display: flow-root; }
*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; color: inherit; }
</style></head><body><div id="widget"></div><script>${BOOT}</script></body></html>`;
}

export function WidgetFrame({ html, streaming, title, loadingMessages = [], allow, onPrompt, onOpenLink }: WidgetFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);
  const [theme, setTheme] = useState<{ css: string; scheme: string }>();
  const [tick, setTick] = useState(0);
  const latest = useRef({ onPrompt, onOpenLink });
  latest.current = { onPrompt, onOpenLink };

  // Copy the theme from where the widget sits, so it follows a nested ChatTheme.
  useEffect(() => {
    const style = getComputedStyle(host.current!);
    const css = THEME_VARS.map((v) => `--chat-${v}: ${style.getPropertyValue(`--chat-${v}`).trim()};`).join(" ");
    setTheme({ css, scheme: style.colorScheme || "dark" });
  }, []);

  // Keyed by value: a new `allow` object with the same domains must not reload the frame.
  const allowKey = JSON.stringify(allow ?? {});
  const doc = useMemo(() => theme && srcDoc(theme.css, theme.scheme, JSON.parse(allowKey) as WidgetAllow), [theme, allowKey]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const m = e.data ?? {};
      if (m.method === "ui/notifications/initialized") setReady(true);
      if (m.method === "ui/notifications/size-changed") setHeight(Math.min(Math.max(0, Number(m.params?.height) || 0), 2000));
      if (m.method === "ui/message") {
        const text = m.params?.content?.find?.((c: { type: string }) => c.type === "text")?.text;
        if (typeof text === "string" && text.trim()) latest.current.onPrompt?.(text.slice(0, 4000));
      }
      if (m.method === "ui/open-link") {
        const url = String(m.params?.url ?? "");
        if (/^https?:\/\//.test(url)) latest.current.onOpenLink?.(url);
      }
      if (m.method === "notifications/message") console.warn("widget:", m.params?.data);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const method = streaming ? "ui/notifications/tool-input-partial" : "ui/notifications/tool-input";
    frame.current?.contentWindow?.postMessage({ jsonrpc: "2.0", method, params: { arguments: { widget_code: html } } }, "*");
  }, [ready, html, streaming]);

  // Rotate the loading line while the model writes.
  useEffect(() => {
    if (!streaming || loadingMessages.length < 2) return;
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, [streaming, loadingMessages.length]);

  return (
    <figure ref={host} className="my-2" aria-label={title}>
      {streaming && loadingMessages.length > 0 && (
        <div className="mb-2 animate-pulse font-chat-sans text-(length:--chat-ui-font-size) text-chat-muted motion-reduce:animate-none">
          {loadingMessages[tick % loadingMessages.length]}
        </div>
      )}
      {doc && (
        <iframe
          ref={frame}
          title={title ?? "Widget"}
          sandbox="allow-scripts"
          srcDoc={doc}
          style={{ height: height || (streaming ? 120 : 0), transition: "height 150ms ease-out" }}
          className="block w-full border-0 bg-transparent"
        />
      )}
    </figure>
  );
}
