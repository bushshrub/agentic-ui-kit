---
title: What you can change, and what is fixed
description: Which parts of the kit you can set, and which stay as they are on purpose.
sidebar:
  order: 2
---

The kit has opinions about how a chat behaves and is laid out, and stays out of the way of how it looks as
your brand and of the space it sits in.

**Yours to change**

- Colors, fonts, radii, shadows: `--chat-*` variables.
- Text sizes: variables for message text (`--chat-message-font-size`), code (`--chat-code-font-size`),
  interface text (`--chat-ui-font-size`), small interface text (`--chat-ui-font-size-sm`), the user bubble
  (`--chat-bubble-font-size`) and activity rows (`--chat-activity-font-size`). A theme can set them per
  `[data-chat-density]`.
- Width and density: `contentWidth`, and `density="full" | "panel" | "inline"` for a page, a side panel or a
  box in a form.
- Code themes and motion on or off: `ChatTheme` props.
- Wording and locale: `ChatTheme labels`, see Theming. Icons: `ChatTheme icons`, Lucide by default.
- Content: the `header`, `footer`, `notice`, `emptyState` and `disclaimer` slots, custom parts through
  `renderPart`, and tool views through `useChatTool`.
- Inline visuals (`agentic-ui-kit/visuals`): which domains widgets may load and which of their abilities are
  on (`VisualsProvider host`), and the components the model may compose (`VisualsProvider components`).

**Fixed on purpose**

- Streaming: the paced reveal, the word fade, following the reply while you are at the bottom and leaving you
  alone when you scroll up. Small changes here make streaming feel janky.
- Animations and their timings. Only on or off, for reduced motion.
- The layout: user messages in bubbles on the right, replies as full-width text, thinking and tool calls
  folded into one activity row with a summary.
- Message actions: which ones you turn on is yours; where they sit (under the message, on hover) is not.
- Spacing inside the chrome. `density` covers the cases that need it to be tighter.
- Accessibility and keyboard behavior: focus rings, roles, Enter to send, menus and dialogs from react-aria.
- Markdown: only safe HTML in replies, streaming-safe parsing.
- When long messages fold and how tool calls group.
- The widget sandbox: `allow-scripts` only, the CSP, messages only from the widget's own frame, the height cap,
  scripts running once the markup is complete. The action set of your components' trees.

A new setting has to change the look or fit a different container. A setting that changes how the chat
behaves needs a strong case. If you need different behavior, build your own layout from the components.

Bundle size: Markdown, KaTeX and Shiki are most of it, about 345 KB gzipped for a chat page. Shiki's language
grammars load on demand.

