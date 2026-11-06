---
title: What's in the kit
description: The four layers of the React package.
sidebar:
  order: 1
---

The React package has four layers, each built only from the ones before it:

| Layer      | Examples                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------- |
| Primitives | `Button`, `IconButton`, `Menu`, `ContextMenu`, `Modal`, `Drawer`, `Panel`, `Tooltip`, `CodeBlock`, `ChatTheme` |
| Hooks      | `useChat`, `sseTransport`, `AgentProvider`, `useAgentTool`, `useAgentContext`, `useSmoothText` |
| Components | `Composer`, `ModelPicker`, `MessageList`, `ActivityGroup`, `ApprovalCard`, `Markdown`, `ChatHeader`, `ChatList`, `ContextPanel`, `WidgetFrame`, `UiTree` |
| Views      | `ChatView`, `AppShell`, `Sidebar`                                                             |

Use `ChatView` for the whole thing, or build your own layout from the components.

