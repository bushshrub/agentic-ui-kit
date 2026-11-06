---
title: Upgrading to 0.9
description: Inline visuals moved to agentic-ui-kit/visuals and are now opt-in.
sidebar:
  order: 7
---

Inline visuals (sandboxed HTML, your own components drawn by the model) are optional, so they left the main
import. `agentic-ui-kit` is now the chat basics; visuals live in `agentic-ui-kit/visuals` (React) and
`agentic-ui-kit/visuals/core` (no React, for servers). The old names are not re-exported from the main imports:
a re-export would pull the visuals code back into every app's bundle.

## The changed default

In 0.8 visuals worked with no setup. In 0.9 they are off until you opt in, with one wrapper:

```tsx
import { VisualsProvider } from "agentic-ui-kit/visuals";

<VisualsProvider>
  <ChatView {...chat} />
</VisualsProvider>;
```

Without it, `widget` parts and the visual tools draw nothing special, and ` ```ui ` blocks stay code. The
provider takes what used to be spread over three places:

| Before (0.8)                                      | Now (0.9)                                              |
| ------------------------------------------------- | ------------------------------------------------------ |
| `<ChatView widgets={{ allow, onCallTool, ... }} />` | `<VisualsProvider host={{ allow, onCallTool, ... }}>`  |
| `<ChatTranscript widgets={...} />`                | `<VisualsProvider host={...}>` around it               |
| `<UiComponentsProvider components persist markup>` | `<VisualsProvider components persist markup>`          |
| `ToolViewsProvider tools={{ ...defaultToolViews, show_widget: widgetToolView(), show_ui: uiMarkupToolView() }}` | not needed for the suggested tools (`show_widget`, `show_ui`, `render_ui`); for your own tool names keep a `ToolViewsProvider` with `{ ...defaultToolViews, ...visualToolViews, my_tool: widgetToolView() }` |

A widget's `sendPrompt` still sends through the `ChatView`'s `onSend`, links still open in a new tab, and a
`ChatTranscript` still cannot send or call tools.

## Moved names

Change the import path; the names are unchanged.

| Name | From | To |
| ---- | ---- | -- |
| `WidgetFrame`, `WidgetHostProvider`, `useWidgetHost`, `WidgetPartView`, `widgetToolView`, `readVisualizeInput`, `widgetCsp`, `intersectAllow`, `openInNewTab`, `WIDGET_MAX_HEIGHT`, types `WidgetFrameProps`, `WidgetToolInput`, `WidgetHost`, `WidgetAllow`, `WidgetResource` | `agentic-ui-kit` | `agentic-ui-kit/visuals` |
| `UiComponentsProvider`, `UiTree`, `UiMarkupBlock`, `useUiMarkupLanguage`, `useUiAction`, `useUiState`, `htmlComponent`, `uiTreeToolView`, `uiMarkupToolView`, `readTreeInput`, types `UiComponent`, `UiStateStore`, `UiTreeProps`, `UiToolViewOptions` | `agentic-ui-kit` | `agentic-ui-kit/visuals` |
| `uiComponents`, `uiComponentSet`, `uiRenders`, type `UiComponentSetOptions` | `agentic-ui-kit` | `agentic-ui-kit/visuals` |
| `widgetFrameLoader`, `widgetLoaderMessages` | `agentic-ui-kit/core` | `agentic-ui-kit/visuals/core` |
| `replacesProperty`, `replacesGuide`, `replacedId`, `resolveReplaces`, `withCallId` | `agentic-ui-kit/core` | `agentic-ui-kit/visuals/core` |
| `visualizeTool`, `visualizeGuide`, `checkWidgetCode`, types `VisualizeInput`, `WidgetCodeCheck` | `agentic-ui-kit/core` | `agentic-ui-kit/visuals/core` |
| `matchesSchema`, `schemaErrors`, `checkUiTree`, `isStateRef`, `renderUiTool`, `renderUiToolName`, `uiActionSchema`, types `UiNode`, `UiAction`, `RenderUiInput`, `UiComponentSpec`, `UiTreeCheck`, `UiTreeCheckOptions` | `agentic-ui-kit/core` | `agentic-ui-kit/visuals/core` |
| `parseUiMarkup`, `readUiValue`, `findUiBlocks`, `checkUiMarkup`, `checkUiMarkupCode`, `showUiTool`, `showUiToolName`, `uiMarkupGuide`, `uiMarkupLanguage`, types `UiMarkup`, `UiMarkupBlock`, `UiMarkupCheck`, `ShowUiInput` | `agentic-ui-kit/core` | `agentic-ui-kit/visuals/core` |
| `uiSpecs`, `uiSpecGroups`, `uiSpecSet`, `uiComponentSpecs`, types `UiSpecName`, `UiSpecPick`, `UiSpecSelection` | `agentic-ui-kit/core` | `agentic-ui-kit/visuals/core` |

## New in the main import

The main import gains the small, generic hooks that `VisualsProvider` plugs into, which any host can use:
`ChatExtensionsProvider` (draw fenced code blocks of a language with your component, draw extra part types,
bring tool views, group a reply's tool calls) and `ChatInteractionProvider` (what the transcript's parts may
do, such as sending a message).
