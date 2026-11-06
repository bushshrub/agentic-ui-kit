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

## Give the chat a height

`ChatTheme`'s wrapper is `height: 100%` of its parent, and `ChatView` fills the wrapper. So the parent needs a
height of its own (`h-screen`, a grid cell, `height: 100dvh`); a parent with `height: auto` still collapses
the chat to nothing. This works without Tailwind too. To size the wrapper yourself, pass a `className`
(`<ChatTheme className="h-[40rem]">`) or a style rule: anything you set replaces the default, which sits in the
lowest CSS layer.

## Content Security Policy

The kit needs no `unsafe-eval`, no `wasm-unsafe-eval` and no `unsafe-inline`. A strict policy that works for
the chat, Markdown, code blocks and math:

```
default-src 'self';
script-src 'self';
style-src 'self';
font-src 'self';
img-src 'self' data: blob: https:;
connect-src 'self';
frame-src 'self' blob:;
```

| Directive | Why |
| --- | --- |
| `script-src 'self'` | Code highlighting (Shiki) runs on its JavaScript regex engine, so WebAssembly is not needed. It loads its grammars as lazy chunks from your own origin. |
| `style-src 'self'` | React sets the styles it computes (code token colors, math layout) through the DOM, which CSP does not block, so no `'unsafe-inline'` is needed. Only HTML you render as a string on the server (SSR) carries `style="…"` attributes that need `style-src-attr 'unsafe-inline'`. |
| `font-src 'self'` | KaTeX's fonts. Vite turns small files into `data:` URLs; set `build.assetsInlineLimit: 0` so the fonts stay files, or add `data:` to `font-src`. |
| `img-src data: blob:` | Attachment previews (`blob:`) and inline images. Add `https:` or your image host if messages link remote images. |
| `connect-src 'self'` | Your chat endpoints. Add the origin of a separate API server. |
| `frame-src` | Widgets are sandboxed iframes. Their `srcdoc` inherits your policy, so with `script-src 'self'` their scripts do not run: serve the kit's frame page from a path with its own looser policy and set `frameUrl`. See [If your app's CSP blocks inline scripts](/inline-visuals/sandboxed-html/#if-your-apps-csp-blocks-inline-scripts). Allow that origin in `frame-src`. |

```ts
// vite.config.ts
export default defineConfig({ build: { assetsInlineLimit: 0 } });
```

If highlighting is blocked anyway (a chunk fails to load, a policy is stricter than above), code blocks show
plain code and the kit logs one `console.warn` ("code highlighting failed").

## Install from source

```sh
git clone https://github.com/bushshrub/agentic-ui-kit
cd agentic-ui-kit && pnpm install
pnpm --filter agentic-ui-kit pack        # builds and writes agentic-ui-kit-0.1.0.tgz here
cd ../your-app && npm install ../agentic-ui-kit/agentic-ui-kit-0.1.0.tgz
```

### Upgrading

Vite pre-bundles dependencies. After you upgrade the kit, a running dev server can keep serving the old
build, and you get errors like "does not provide an export named …". Restart it with `vite --force` (or
delete `node_modules/.vite`).
