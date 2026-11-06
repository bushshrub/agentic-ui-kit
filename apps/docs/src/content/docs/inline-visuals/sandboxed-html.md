---
title: Sandboxed HTML
description: Let the model draw with HTML in a sandboxed iframe, themed with your variables.
sidebar:
  order: 2
---

![A calendar widget the model wrote, running in the sandboxed frame](/images/widget-calendar.jpg)

[Try it live in Storybook](/storybook/?path=/story/inline-visuals-sandboxed-html--calendar)

Give the model `visualizeTool` and put `visualizeGuide` in its instructions (both from
`agentic-ui-kit/visuals/core`). Its `show_widget` calls, and `widget` parts, render in a `WidgetFrame`: an iframe with
`sandbox="allow-scripts"` only and a CSP that blocks every request, themed with your `--chat-*` variables.
The same frame hosts MCP App UIs (MCP Apps spec 2026-01-26: `ui/initialize`, tool input and result,
`tools/call`); the kit never fetches anything itself, your `readResource` does.

```tsx
import { VisualsProvider } from "agentic-ui-kit/visuals";

<VisualsProvider
  host={{
    allow: { resourceDomains: ["https://unpkg.com", "https://tile.openstreetmap.org"] }, // the most any widget may load
    onCallTool: (name, args) => mcp.callTool(name, args), // MCP App UIs; leave out to turn it off
  }}
>
  <ChatView {...chat} />
</VisualsProvider>
```

A widget's `sendPrompt(text)` sends through `onSend`, and its links open in a new tab; set either callback to
`undefined` to turn it off. `ChatTranscript` widgets cannot send messages or call tools.

## If your app's CSP blocks inline scripts

By default the frame is an `srcdoc` iframe, and an `srcdoc` frame inherits your page's CSP. If your
`script-src` has no `'unsafe-inline'`, the widget's markup shows but its scripts never run. Rather than
loosening your whole app, serve the kit's frame page from one path and point `frameUrl` at it:

```ts
// e.g. a route for /widget-frame.html
import { widgetFrameLoader } from "agentic-ui-kit/visuals/core";

res.setHeader("Content-Type", "text/html; charset=utf-8");
res.setHeader(
  "Content-Security-Policy",
  "default-src 'none'; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:; img-src data: blob: https:; font-src data: https:; connect-src https:",
);
res.end(widgetFrameLoader);
```

```tsx
<VisualsProvider host={{ frameUrl: "/widget-frame.html" }}>
  <ChatView {...chat} />
</VisualsProvider>
```

The kit loads that page sandboxed (an opaque origin with no access to your app, its cookies or storage),
posts the widget's document to it, and the loader writes it in. The kit's own CSP inside the document still
limits what the widget may load to your `allow`, so the header on that path only has to be no stricter than
that. Don't send `X-Frame-Options` or a `frame-ancestors` that excludes your app on it.
[Storybook: Host frame page](/storybook/?path=/story/inline-visuals-sandboxed-html--host-frame-page).
