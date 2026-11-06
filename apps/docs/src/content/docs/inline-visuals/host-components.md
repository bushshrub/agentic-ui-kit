---
title: Your own components
description: Register components the model may compose with render_ui.
sidebar:
  order: 3
---

![A packing checklist drawn from the host app's components via show_ui](/images/show-ui.jpg)

[Try it live in Storybook](/storybook/?path=/story/inline-visuals-replies--markup-tool)

Register components with a JSON Schema for their props (with zod: `z.toJSONSchema`). The model can use them
two ways:

- **As JSX in a tool call** (recommended): give the model `showUiTool(specs)` and `VisualsProvider`
  draws its `show_ui` calls (`uiMarkupToolView()`, for a tool of another name). The model passes JSX as a string; the chat draws it element by
  element as the argument streams:

  ```text
  <State tab="stills" />
  <Card title="Pixel 9 Pro" tag="New"><Metric label="Zoom" value="5x" /></Card>
  ```

  Strings go in quotes, everything else in braces (`items={[{"label": "Tent"}]}`), and state reads as
  `value={$state.tab}`. JavaScript is not run.
- **As a ` ```ui ` block in the reply**: put `uiMarkupGuide(specs)` in the system prompt; inside
  `VisualsProvider` the chat draws those blocks the same way.
- **As a JSON tree in a tool call**: give the model `renderUiTool(specs)`, which describes them. Its `render_ui` calls are trees of your components;
a node with an unknown component or props that don't fit renders nothing.

## The ready-made set

The kit ships components so you don't write them: `uiComponents` from `agentic-ui-kit/visuals`, with their specs
(`uiComponentSpecs`) in `agentic-ui-kit/visuals/core` for a server that has no React.

- **Display**: Stack, Grid, Card, Heading, Text, Metric, List, Table, Badge, Progress.
- **Interactive**: Checklist, Tabs, Show, Button.

```tsx
import { VisualsProvider, uiComponentSet } from "agentic-ui-kit/visuals";

const components = uiComponentSet({ exclude: ["Button"] }); // no Button: the model is never told of it
<VisualsProvider components={components} persist={store}>
  <ChatView {...chat} />
</VisualsProvider>;
```

On the server, build the tool from the same picks, so the model only hears of (and `checkUiTree` only
accepts) what you registered:

```ts
import { renderUiTool, uiSpecSet } from "agentic-ui-kit/visuals/core";

const specs = uiSpecSet({ exclude: ["Button"] }); // same options as uiComponentSet
// tools: [renderUiTool(specs), ...]; checkUiTree(input, specs)
```

`include` and `exclude` take component names or the groups `"display"` and `"interactive"`, so
`uiComponentSet({ include: ["display"] })` is display only. Use your own drawing for a component and keep its
spec (and so the model-facing text and prompt cache) unchanged with `renders`:

```tsx
uiComponentSet({ renders: { Button: ({ label, onPress }) => {
  const run = useUiAction();
  return <MyButton onClick={() => run(onPress)}>{label}</MyButton>;
} } });
```

`uiSpecs` (core) and `uiRenders` (React) hold each spec and drawing by name, for mixing: reuse the Card's
drawing in a component of yours with `{ ...uiSpecs.Card, name: "Panel", render: uiRenders.Card }`. Add your own
next to the set with `[...uiComponentSet(), myChart]` (plus its spec in the tool).

## Your own components

```tsx
const components: UiComponent[] = [
  ...uiComponentSet({ include: ["display"] }),
  { name: "Gauge", description: "A dial for one number, 0-100.", props: gaugeSchema, render: Gauge },
  htmlComponent, // optional: raw HTML in a WidgetFrame, for what your components can't show
];
// tools: [renderUiTool(components.map(({ render, ...spec }) => spec)), ...]
<VisualsProvider components={components} persist={store}>
  <ChatView {...chat} />
</VisualsProvider>;
```

Inside a component, `useUiAction()` runs an action from its props (`uiActionSchema`: set a state key, send
a message, open a URL, copy), and `useUiState()` reads and writes the widget's state; props read state with
`{ "$state": key }`. `persist` keeps each widget's state across reloads.

`persist` is keyed by the call's id. When the id differs while streaming and after it is saved, pass a stable
one: `<UiTree stateKey={activityId} ... />`, or `uiTreeToolView(read, { stateKey: (part) => activityId(part) })`
(the same option exists on `uiMarkupToolView`).
