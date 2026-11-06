---
title: Connecting your agent
description: "Give your own agent the kit's inline visuals: what goes in the prompt, which tools, what the web side registers."
sidebar:
  order: 1
---

The kit is only the UI. To put your agent behind it at all, see [Plugging in a harness](/custom-harness/plugging-in-a-harness/);
this page is about giving it the kit's visuals. Your harness picks the model, the prompt and the tool names; the kit draws what the
model writes. Everything it suggests (prompt sections, tool definitions) is a starting point you can rewrite.

Don't hold the model back: leave its reasoning and effort alone, and stream its thinking as `thinking`
parts. The chat shows it collapsed above the reply.

## Three ways for the model to draw

| | The model writes | Best for | You set up |
|---|---|---|---|
| **Your components** (recommended) | JSX as a string in a `show_ui`-style tool call | Cards, metrics, checklists, tabs from *your* components | `showUiTool(specs)`, `uiMarkupToolView()` on the web |
| **Sandboxed HTML** | An HTML fragment in a `show_widget`-style tool call | Maps, charts, free-form visuals | `visualizeTool` + `visualizeGuide`, `widgetToolView()` on the web |
| UI blocks in the reply | JSX in a ` ```ui ` block of the reply text | Harnesses without tools | `uiMarkupGuide(specs)` in the prompt |
| Component trees | A JSON tree in a `render_ui`-style tool call | Hosts that need a JSON schema per node | `renderUiTool(specs)`, `uiTreeToolView()` |

Why JSX in a tool call: every model has seen a lot of JSX, a string of code is easy for models to write in
a tool argument (the same way they send HTML), it draws element by element while the argument streams, and
the tool result is where your [feedback](/custom-harness/feeding-errors-back/) goes. In our tests a small
model sent nested JSON trees as broken strings even after being told how to fix them; it wrote the same UI
as JSX without trouble.

## 1. Share your component specs

The server needs the specs (name, description, props schema) for the prompt and the checks; the web needs
the same specs plus a `render`. Keep the specs in a module both import, with no React in it:

```ts
// shared/ui-specs.ts
import type { UiComponentSpec } from "agentic-ui-kit/core";

export const uiSpecs: UiComponentSpec[] = [
  { name: "Stack", description: "Children in a column.", children: true },
  {
    name: "Metric",
    description: "A key number with a label, e.g. 'Total' '€184'.",
    props: { type: "object", properties: { label: { type: "string" }, value: { type: ["string", "number"] } }, required: ["label", "value"] },
  },
];
```

## 2. The prompt

Tools and guide depend only on the specs, so they are the same bytes every turn and keep the provider's
prompt cache warm:

```ts
import { showUiTool, visualizeGuide, visualizeTool } from "agentic-ui-kit/core";
import { uiSpecs } from "../shared/ui-specs";

const instructions = [yourInstructions, visualizeGuide].join("\n\n"); // the guide only if you offer show_widget
const tools = [showUiTool(uiSpecs), visualizeTool, ...yourTools];
```

`showUiTool`'s description lists your components and how to write them. Rename it, reword it, or write your
own tool: the kit only needs to know where the markup is in the input.

Build `instructions` and `tools` once, not per request: anything that changes between turns (a date, an id)
moves the cache boundary to the start.

Both tools are no-ops on the server: the UI is drawn by the chat. Return the check's feedback as the result
("Shown to the user." when it is fine; see [Feeding errors back](/custom-harness/feeding-errors-back/)).

## 3. The web side

```tsx
import { ChatView, ToolViewsProvider, UiComponentsProvider, defaultToolViews, uiMarkupToolView, widgetToolView, type UiComponent } from "agentic-ui-kit";
import { uiSpecs } from "../shared/ui-specs";

const renders = { Stack: StackView, Metric: MetricView };
const components: UiComponent[] = uiSpecs.map((spec) => ({ ...spec, render: renders[spec.name] }));
const tools = { ...defaultToolViews, show_ui: uiMarkupToolView(), show_widget: widgetToolView() }; // keys = your tool names

<UiComponentsProvider components={components} persist={stateStore}>
  <ToolViewsProvider tools={tools}>
    <ChatView {...chat} widgets={{ allow: { resourceDomains: ["https://tile.openstreetmap.org"] } }} />
  </ToolViewsProvider>
</UiComponentsProvider>;
```

- Name your tools whatever you like: register the views under your names. If your tool's input has another
  shape, pass a reader: `uiMarkupToolView((input) => input.jsx)`, `widgetToolView((input) => ({ html: input.code }))`.
- ` ```ui ` blocks in reply text are drawn with `components` too; other code blocks stay code. Set
  `markup={false}` on the provider to show them as code instead.
- `persist` keeps each widget's state (ticked items, the open tab) across reloads, keyed by message part.

## 4. Stream it

Send the model's output to the kit as `StreamEvent`s (see [The backend](/get-started/backend/)): text and
thinking as `part.delta`s, tool calls with their `inputJson` deltas. The kit draws the UI and widgets while
they stream; you don't parse anything yourself.

The reference app, llm-chat-ui, wires all of this up end to end on a real model.
