---
title: Inline visuals
description: How the model draws something interactive in a reply.
sidebar:
  order: 1
---

![One reply mixing host components (metrics, tabs, a checklist) with a sandboxed map](/images/visuals-combined.jpg)

[Try it live in Storybook](/storybook/?path=/story/inline-visuals-replies--combined)

The model can draw something interactive in its reply, and it fills in while the model writes:

- **Your own components** in a ` ```ui ` block of JSX in the reply, or as a tree in a tool call. See
  [Your own components](/inline-visuals/host-components/).
- **Sandboxed HTML** for what your components can't show: maps, charts, anything free-form. See
  [Sandboxed HTML](/inline-visuals/sandboxed-html/).

Inline visuals are opt-in: import them from `agentic-ui-kit/visuals` and wrap the chat in `<VisualsProvider>`.
Coming from 0.8? See [Upgrading to 0.9](/get-started/upgrading-to-0-9/).

To wire them into your agent, see [Connecting your agent](/custom-harness/connecting-your-agent/) and
[Feeding errors back](/custom-harness/feeding-errors-back/).
