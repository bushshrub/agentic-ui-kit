---
title: Quick start
description: Put a ChatView on the page, and use it with Tailwind v4.
sidebar:
  order: 2
---

```tsx
import { ChatView, sseTransport, useChat } from "agentic-ui-kit";
import "agentic-ui-kit/styles.css";

const transport = sseTransport({ url: "/api/chat" });

export function App() {
  const chat = useChat({ transport });
  return (
    <div style={{ height: "100dvh" }}>
      <ChatView
        messages={chat.messages}
        busy={chat.busy}
        onSend={(text) => chat.send(text)}
        onStop={chat.stop}
        approvals={chat.approvals}
        onApprove={chat.respond}
      />
    </div>
  );
}
```

`ChatView` sizes itself from its container, so it works as a full page, a side panel or a small box in a form
(`density="full" | "panel" | "inline"`), and several fit side by side.

## Using Tailwind v4?

Import the Tailwind source instead of `styles.css`, so utilities are generated once by your build:

```css
@import "tailwindcss";
@import "agentic-ui-kit/tailwind.css";
```

`styles.css` includes Tailwind's base reset (preflight). In an app that already has its own reset, use
`tailwind.css`.

## The composer

Its text and buttons are yours:

- **Placeholder:** `composer={{ placeholder: "Ask anything" }}`. To change the default ("Reply…") for every
  chat, or translate it, use `<ChatTheme labels={{ replyPlaceholder: "…" }}>`.
- **Inside the box:** `leading` (left of the toolbar), `trailing` (right, before send), `above` (over the
  text, e.g. attachment chips).
- **Outside the box:** `renderComposer={(composer, where) => …}` wraps it on the empty screen
  (`where === "empty"`) and docked under the chat (`"docked"`), so you can put buttons above, beside or
  under it.

```tsx
<ChatView
  renderComposer={(composer, where) => (
    <div className="flex flex-col gap-2">
      {where === "empty" && <SuggestionChips onPick={send} />}
      {composer}
    </div>
  )}
/>
```
