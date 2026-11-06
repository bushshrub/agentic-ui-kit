---
title: Your own components
description: Register components the model may compose with render_ui.
sidebar:
  order: 3
---

Register components with a JSON Schema for their props (with zod: `z.toJSONSchema`) and
give the model `renderUiTool(specs)`, which describes them. Its `render_ui` calls are trees of your components;
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
