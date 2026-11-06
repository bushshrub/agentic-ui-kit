---
title: Build chatgpt.com's web chat
description: The same components themed like chatgpt.com, with CSS variables only.
sidebar:
  order: 2
---

![The same app themed like chatgpt.com: sans messages, a blue bubble, rounder corners](/images/example-chatgpt.jpg)

[Try it live in Storybook](/storybook/?path=/story/views-app--chat-gpt-style)

Start from [the claude.ai example](/examples/claude-ai/): same `AppShell`, `Sidebar`, `ChatList` and
`ChatView`. The difference is only the theme. Every color, font, radius and size is a `--chat-*` variable,
so a different look is a block of CSS, not a fork of the components.

```tsx
import { ChatTheme } from "agentic-ui-kit";

<ChatTheme theme="chatgpt" className="h-dvh">
  <App />
</ChatTheme>;
```

```css
[data-chat-theme="chatgpt"] {
  color-scheme: dark;
  --chat-bg: #212121;
  --chat-sidebar: #181818;
  --chat-surface: #303030;
  --chat-raised: #303030;
  --chat-hover: #2a2a2a;
  --chat-selected: #2f2f2f;
  --chat-bubble: #2e3f8f; /* the blue user bubble */
  --chat-popover: #353535;
  --chat-popover-border: #414141;
  --chat-popover-hover: #424242;
  --chat-border: #343434;
  --chat-border-strong: #4a4a4a;
  --chat-divider: #2c2c2c;
  --chat-code-bg: #181818;
  --chat-code-border: #2c2c2c;
  --chat-inline-code: #3a3a3a;
  --chat-fg: #ffffff;
  --chat-muted: #afafaf;
  --chat-subtle: #8f8f8f;
  --chat-accent: #4c66e6; /* send button, highlights */
  --chat-accent-fg: #ffffff;
  --chat-check: #4ec27a;
  --chat-focus: #7a8ff0;
  /* One sans for everything: interface, messages, the brand. */
  --chat-font-sans: ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
  --chat-font-serif: var(--chat-font-sans);
  --chat-font-message: var(--chat-font-sans);
  --chat-message-font-size: 1rem;
  --chat-message-line-height: 1.75;
  --chat-bubble-font-size: 1rem;
  /* Rounder: the bubble and composer are near-pills. */
  --chat-radius-md: 14px;
  --chat-radius-lg: 26px;
  --chat-radius-popover: 16px;
}
```

Wording is a theme too: pass `labels` to `ChatTheme` (e.g. the composer placeholder "Ask anything") and
`icons` to swap the icon set. See [Theming](/get-started/theming/) for every variable.

What the kit keeps fixed is layout and behavior: where things sit, how streaming, tool rows and approvals
work. That is on purpose, so an app looks finished without restyling components.
