import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Message } from "@agentic-ui-kit/core";
import { ChatTranscript } from "../views/chat-transcript";
import { ChatView } from "../views/chat-view";
import { ToolViewsProvider, defaultToolViews } from "../components/tools";
import { VisualsProvider } from "./provider";
import { intersectAllow, WidgetFrame, widgetCsp, widgetToolView } from "./widget-frame";

afterEach(cleanup);

function frameOf(container: HTMLElement) {
  return container.querySelector("iframe")!;
}

/** Posts `data` to the page as if it came from `source`. */
async function fromWindow(source: Window | null, data: object) {
  await act(async () => {
    window.dispatchEvent(new MessageEvent("message", { data: { jsonrpc: "2.0", ...data }, source }));
  });
}

it("blocks everything by default", () => {
  expect(widgetCsp()).toBe(
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; " +
      "media-src data: blob:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'",
  );
});

it("adds only plain origins to the policy", () => {
  const csp = widgetCsp({
    resourceDomains: ["https://unpkg.com/", "'unsafe-eval'", "https://a.com; script-src *", "javascript:alert(1)"],
    connectDomains: ["wss://api.example.com"],
  });
  expect(csp).toContain("script-src 'unsafe-inline' https://unpkg.com;");
  expect(csp).toContain("connect-src wss://api.example.com;");
  expect(csp).not.toContain("unsafe-eval");
  expect(csp).not.toContain("a.com");
  expect(csp).not.toContain("javascript");
});

it("never gives a widget more than the host allows", () => {
  const allow = { resourceDomains: ["https://*.tiles.org", "https://unpkg.com"], connectDomains: [] };
  const got = intersectAllow(
    { resourceDomains: ["https://a.tiles.org", "https://evil.com", "https://unpkg.com", "http://a.tiles.org"], connectDomains: ["https://unpkg.com"] },
    allow,
  );
  expect(got).toEqual({ resourceDomains: ["https://a.tiles.org", "https://unpkg.com"], connectDomains: [] });
});

it("sandboxes the frame with scripts only and the policy in its document", () => {
  const { container } = render(<WidgetFrame html="<p>hi</p>" allow={{ resourceDomains: ["https://unpkg.com"] }} />);
  const frame = frameOf(container);
  expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
  const doc = frame.getAttribute("srcdoc")!;
  expect(doc).toContain(`<meta http-equiv="Content-Security-Policy" content="${widgetCsp({ resourceDomains: ["https://unpkg.com"] })}">`);
  expect(doc).toContain("--chat-fg");
});

it("puts the policy first in an app's own document and loads only what it asks for", () => {
  const html = `<!doctype html><html><head><script src="https://unpkg.com/x.js"></script></head><body></body></html>`;
  const { container } = render(<WidgetFrame document html={html} allow={{ resourceDomains: ["https://unpkg.com"] }} />);
  const doc = frameOf(container).getAttribute("srcdoc")!;
  expect(doc.indexOf("Content-Security-Policy")).toBeLessThan(doc.indexOf("<script"));
  // No `csp` request: an app gets nothing, even though the host would allow unpkg.
  expect(doc).toContain(`content="${widgetCsp()}"`);
});

it("ignores messages from any window but its own frame", async () => {
  const onPrompt = vi.fn();
  const onOpenLink = vi.fn();
  const { container } = render(<WidgetFrame html="" onPrompt={onPrompt} onOpenLink={onOpenLink} />);
  const own = frameOf(container).contentWindow!;
  const prompt = { method: "ui/message", params: { role: "user", content: [{ type: "text", text: "add them" }] } };

  await fromWindow(window, prompt);
  await fromWindow(null, prompt);
  await fromWindow(window, { method: "ui/open-link", params: { url: "https://example.com" } });
  expect(onPrompt).not.toHaveBeenCalled();
  expect(onOpenLink).not.toHaveBeenCalled();

  await fromWindow(own, prompt);
  await fromWindow(own, { method: "ui/open-link", params: { url: "javascript:alert(1)" } });
  await fromWindow(own, { method: "ui/open-link", params: { url: "https://example.com" } });
  expect(onPrompt).toHaveBeenCalledWith("add them");
  expect(onOpenLink).toHaveBeenCalledTimes(1);
  expect(onOpenLink).toHaveBeenCalledWith("https://example.com");
});

it("answers requests, and refuses what the host left out", async () => {
  const { container } = render(<WidgetFrame document html="<p></p>" onCallTool={async (name, args) => ({ content: [{ type: "text", text: `${name}:${String(args.q)}` }] })} />);
  const own = frameOf(container).contentWindow!;
  const replies: unknown[] = [];
  vi.spyOn(own, "postMessage").mockImplementation((m: unknown) => void replies.push(m));

  await fromWindow(own, { id: 1, method: "ui/initialize", params: { protocolVersion: "2026-01-26" } });
  await fromWindow(own, { id: 2, method: "ui/message", params: { role: "user", content: [{ type: "text", text: "x" }] } });
  await fromWindow(own, { id: 3, method: "tools/call", params: { name: "search", arguments: { q: "lisbon" } } });
  await fromWindow(own, { id: 4, method: "ui/request-display-mode", params: { mode: "fullscreen" } });

  const byId = Object.fromEntries((replies as { id?: number }[]).filter((r) => r.id).map((r) => [r.id, r]));
  expect(byId[1]).toMatchObject({ result: { protocolVersion: "2026-01-26", hostCapabilities: { serverTools: {} }, hostContext: { displayMode: "inline" } } });
  expect((byId[1] as { result: { hostCapabilities: object } }).result.hostCapabilities).not.toHaveProperty("openLinks");
  expect(byId[2]).toMatchObject({ error: { code: -32000 } });
  expect(byId[3]).toMatchObject({ result: { content: [{ type: "text", text: "search:lisbon" }] } });
  expect(byId[4]).toMatchObject({ error: { code: -32601 } });
});

it("streams a fragment's markup, then sends the whole of it once", async () => {
  const { container, rerender } = render(<WidgetFrame html="<p>he" streaming />);
  const own = frameOf(container).contentWindow!;
  const sent: { method?: string; params?: { arguments?: { widget_code?: string } } }[] = [];
  vi.spyOn(own, "postMessage").mockImplementation((m: unknown) => void sent.push(m as (typeof sent)[number]));
  await fromWindow(own, { method: "ui/notifications/initialized" });
  rerender(<WidgetFrame html="<p>hello</p>" />);
  expect(sent.map((m) => [m.method, m.params?.arguments?.widget_code])).toEqual([
    ["ui/notifications/tool-input-partial", "<p>he"],
    ["ui/notifications/tool-input", "<p>hello</p>"],
  ]);
});

it("takes its height from the frame, capped", async () => {
  const { container } = render(<WidgetFrame html="" />);
  const frame = frameOf(container);
  await fromWindow(frame.contentWindow, { method: "ui/notifications/size-changed", params: { height: 333 } });
  expect(frame.style.height).toBe("333px");
  await fromWindow(frame.contentWindow, { method: "ui/notifications/size-changed", params: { height: 99999 } });
  expect(frame.style.height).toBe("2000px");
});

it("re-sends the theme when it changes, without reloading the frame", async () => {
  const { container } = render(
    <div data-chat-theme="dark" style={{ ["--chat-fg" as string]: "white" }}>
      <WidgetFrame html="" />
    </div>,
  );
  const frame = frameOf(container);
  const doc = frame.getAttribute("srcdoc");
  const sent: { method?: string; params?: { styles?: { variables?: Record<string, string> } } }[] = [];
  vi.spyOn(frame.contentWindow!, "postMessage").mockImplementation((m: unknown) => void sent.push(m as (typeof sent)[number]));
  const theme = container.firstElementChild as HTMLElement;
  await act(async () => {
    theme.style.setProperty("--chat-fg", "black");
    theme.dataset.chatTheme = "light";
    await new Promise((r) => setTimeout(r, 0));
  });
  const change = sent.find((m) => m.method === "ui/notifications/host-context-changed");
  expect(change?.params?.styles?.variables?.["--chat-fg"]).toBe("black");
  expect(frame.getAttribute("srcdoc")).toBe(doc);
});

const reply: Message = {
  id: "a", parentId: null, role: "assistant", status: "done", createdAt: "2026-11-05T10:00:00Z",
  parts: [
    { type: "widget", id: "w1", status: "done", title: "week", html: "<p>week</p>" },
    { type: "tool_call", id: "w2", name: "show_widget", status: "done", inputJson: "{}", input: { widget_code: "<p>map</p>", title: "map" } },
  ],
};

const views = { ...defaultToolViews, show_widget: widgetToolView() };

it("draws widget parts and calls of the tool the host maps to widgetToolView; a ChatView's widgets send through onSend, a transcript's cannot", async () => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollTo ??= () => {};
  const prompt = { method: "ui/message", params: { role: "user", content: [{ type: "text", text: "more" }] } };
  const onSend = vi.fn();
  const view = render(<VisualsProvider><ToolViewsProvider tools={views}><ChatView messages={[reply]} onSend={onSend} /></ToolViewsProvider></VisualsProvider>);
  const frames = [...view.container.querySelectorAll("iframe")];
  expect(frames.map((f) => f.title)).toEqual(["week", "map"]);
  await fromWindow(frames[1]!.contentWindow, prompt);
  expect(onSend).toHaveBeenCalledWith("more");
  view.unmount();

  const shared = render(<VisualsProvider><ChatTranscript messages={[reply]} /></VisualsProvider>);
  const own = shared.container.querySelector("iframe")!.contentWindow!;
  const replies: unknown[] = [];
  vi.spyOn(own, "postMessage").mockImplementation((m: unknown) => void replies.push(m));
  await fromWindow(own, { id: 7, ...prompt });
  expect(replies).toEqual([expect.objectContaining({ id: 7, error: expect.objectContaining({ code: -32000 }) })]);
});

it("draws visuals only inside a VisualsProvider, with no tool views to set up", () => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollTo ??= () => {};
  const off = render(<ChatView messages={[reply]} onSend={vi.fn()} />);
  expect(off.container.querySelectorAll("iframe")).toHaveLength(0);
  off.unmount();
  const on = render(<VisualsProvider><ChatView messages={[reply]} onSend={vi.fn()} /></VisualsProvider>);
  expect([...on.container.querySelectorAll("iframe")].map((f) => f.title)).toEqual(["week", "map"]);
});

it("passes a widget's script errors to the host", async () => {
  const onError = vi.fn();
  const { container } = render(<WidgetFrame html="" onError={onError} />);
  const own = frameOf(container).contentWindow!;
  await fromWindow(own, { method: "notifications/message", params: { level: "error", data: "x is not defined (line 3)" } });
  await fromWindow(own, { method: "notifications/message", params: { level: "info", data: "hello" } });
  await fromWindow(window, { method: "notifications/message", params: { level: "error", data: "forged" } });
  expect(onError.mock.calls).toEqual([["x is not defined (line 3)"]]);
});

it("the frame's boot script parses", () => {
  const { container } = render(<WidgetFrame html="<p>hi</p>" />);
  const doc = frameOf(container).getAttribute("srcdoc")!;
  const boot = [...doc.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1]!;
  expect(() => new Function(boot)).not.toThrow();
});

it("with a frameUrl, loads that page and sends it the document when it is ready", async () => {
  const { widgetLoaderMessages } = await import("@agentic-ui-kit/core/visuals");
  const { container } = render(<WidgetFrame html="<p>hi</p>" frameUrl="/widget-frame.html" />);
  const frame = frameOf(container);
  expect(frame.getAttribute("src")).toBe("/widget-frame.html");
  expect(frame.hasAttribute("srcdoc")).toBe(false);
  const post = vi.spyOn(frame.contentWindow!, "postMessage");
  window.dispatchEvent(new MessageEvent("message", { data: { type: widgetLoaderMessages.ready }, source: frame.contentWindow }));
  expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: widgetLoaderMessages.document, html: expect.stringContaining("Content-Security-Policy") }), "*");
});
