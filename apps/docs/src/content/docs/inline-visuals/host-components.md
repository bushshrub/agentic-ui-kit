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

- **As JSX in a tool call** (recommended): give the model `showUiTool(specs)` and register
  `uiMarkupToolView()` under its name. The model passes JSX as a string; the chat draws it element by
  element as the argument streams:

  ```text
  <State tab="stills" />
  <Card title="Pixel 9 Pro" tag="New"><Metric label="Zoom" value="5x" /></Card>
  ```

  Strings go in quotes, everything else in braces (`items={[{"label": "Tent"}]}`), and state reads as
  `value={$state.tab}`. JavaScript is not run.
- **As a ` ```ui ` block in the reply**: put `uiMarkupGuide(specs)` in the system prompt; inside
  `UiComponentsProvider` the chat draws those blocks the same way.
- **As a JSON tree in a tool call**: give the model `renderUiTool(specs)`, which describes them. Its `render_ui` calls are trees of your components;
a node with an unknown component or props that don't fit renders nothing.

```tsx
const components: UiComponent[] = [
  { name: "Metric", description: "A key number with a label.", props: metricSchema, render: Metric },
  { name: "Stack", description: "Children in a column.", children: true, render: Stack },
  htmlComponent, // optional: raw HTML in a WidgetFrame, for what your components can't show
];
// tools: [renderUiTool(components.map(({ render, ...spec }) => spec)), ...]
<UiComponentsProvider components={components} persist={store}>
  <ChatView {...chat} />
</UiComponentsProvider>;
```

Inside a component, `useUiAction()` runs an action from its props (`uiActionSchema`: set a state key, send
a message, open a URL, copy), and `useUiState()` reads and writes the widget's state; props read state with
`{ "$state": key }`. `persist` keeps each widget's state across reloads.
