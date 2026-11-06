---
title: Sandboxed HTML
description: Let the model draw with HTML in a sandboxed iframe, themed with your variables.
sidebar:
  order: 2
---

Give the model `visualizeTool` and put `visualizeGuide` in its instructions (both from
`agentic-ui-kit/core`). Its `show_widget` calls, and `widget` parts, render in a `WidgetFrame`: an iframe with
`sandbox="allow-scripts"` only and a CSP that blocks every request, themed with your `--chat-*` variables.
The same frame hosts MCP App UIs (MCP Apps spec 2026-01-26: `ui/initialize`, tool input and result,
`tools/call`); the kit never fetches anything itself, your `readResource` does.

```tsx
<ChatView
  {...chat}
  widgets={{
    allow: { resourceDomains: ["https://unpkg.com", "https://tile.openstreetmap.org"] }, // the most any widget may load
    onCallTool: (name, args) => mcp.callTool(name, args), // MCP App UIs; leave out to turn it off
  }}
/>
```

A widget's `sendPrompt(text)` sends through `onSend`, and its links open in a new tab; set either callback to
`undefined` to turn it off. `ChatTranscript` widgets cannot send messages or call tools.
