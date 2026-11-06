---
title: Install
description: Install agentic-ui-kit from npm or from source, and what each import gives you.
sidebar:
  order: 1
---

```sh
npm install agentic-ui-kit
```

Requires React 19. React is an optional peer dependency, so a server can use `agentic-ui-kit/core` on its own.

| Import                       | What it is                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `agentic-ui-kit`             | React components and hooks                                                     |
| `agentic-ui-kit/core`        | Types, stream events, the message reducer, SSE helpers. No React, no DOM.      |
| `agentic-ui-kit/styles.css`  | Precompiled styles, for apps without Tailwind                                   |
| `agentic-ui-kit/tailwind.css`| The same styles as Tailwind v4 source, for apps that use Tailwind              |

## Install from source

```sh
git clone https://github.com/bushshrub/agentic-ui-kit
cd agentic-ui-kit && pnpm install
pnpm --filter agentic-ui-kit pack        # builds and writes agentic-ui-kit-0.1.0.tgz here
cd ../your-app && npm install ../agentic-ui-kit/agentic-ui-kit-0.1.0.tgz
```

