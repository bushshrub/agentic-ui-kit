---
title: Development
description: Run the playground, typecheck and test the kit from source.
sidebar:
  order: 3
---

```sh
pnpm install
pnpm storybook          # playground on http://localhost:6006: components, host themes, agent tool examples
pnpm -r typecheck
pnpm test               # vitest in packages/core and packages/react
```

| Path              | Contents                                                       |
| ----------------- | -------------------------------------------------------------- |
| `packages/core`   | Types, events, reducer, SSE. Bundled into `agentic-ui-kit/core`. |
| `packages/react`  | The published `agentic-ui-kit` package                          |
| `apps/playground` | Storybook                                                       |

