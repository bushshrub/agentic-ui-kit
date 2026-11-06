---
title: Inline visuals
description: How the model draws something interactive in a reply.
sidebar:
  order: 1
---

The model can draw something interactive in its reply, and it fills in while the model writes:

- **Your own components** in a ` ```ui ` block of JSX in the reply, or as a tree in a tool call. See
  [Your own components](/inline-visuals/host-components/).
- **Sandboxed HTML** for what your components can't show: maps, charts, anything free-form. See
  [Sandboxed HTML](/inline-visuals/sandboxed-html/).

To wire them into your agent, see [Connecting your agent](/custom-harness/connecting-your-agent/) and
[Feeding errors back](/custom-harness/feeding-errors-back/).
