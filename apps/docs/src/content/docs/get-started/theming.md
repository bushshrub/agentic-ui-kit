---
title: Theming
description: Change colors, fonts, code themes, wording and icons.
sidebar:
  order: 5
---

![A shared chat in a host's own theme, set only with --chat-* variables](/images/theming.jpg)

[Try it live in Storybook](/storybook/?path=/story/views-chat-view--shared-in-host-theme)

The defaults look like claude.ai. Every colour, font, radius and width is a `--chat-*` CSS variable. Set them on `:root` to theme the whole app,
or on any element to theme part of it:

```css
:root {
  --chat-bg: #fbfaf7;
  --chat-fg: #1f1d1a;
  --chat-accent: #c4552d;
  --chat-font-sans: "IBM Plex Sans", sans-serif;
  --chat-radius-md: 10px;
  color-scheme: light;
}
```

To theme only part of a page, wrap it in `<ChatTheme theme="mine">` and match `[data-chat-theme="mine"]` in
your CSS. Menus and dialogs opened inside then render into that element, so they get the same theme.

`ChatTheme` also takes two appearance props. `codeThemes` picks the Shiki themes for code blocks and Markdown
fences (any bundled theme id; an unknown id falls back to the default with one console warning):
`<ChatTheme codeThemes={{ light: "catppuccin-latte", dark: "dracula" }}>`. Blocks keep `--chat-code-bg` unless you
add `background: "theme"`, which uses the Shiki theme's own background and text color. `motion` is `"system"`
(default: follow the OS reduced-motion setting), `"reduce"` (always use the reduced rules) or `"full"` (keep
animations even when the OS asks for less). It sets `data-chat-motion` on the element; an app that does not use
`ChatTheme` can put `data-chat-motion="reduce"` on `<html>` instead.

Every string the kit shows (text, aria-labels, placeholders) can be reworded or translated with `labels` on
`ChatTheme`. Keys you leave out keep the English default; labels with values in them are functions, and `locale`
sets the language of relative times and dates (default: the browser's). The keys are listed in `ChatLabels`.

```tsx
<ChatTheme labels={{ copy: "Copier", moreOptionsFor: (title) => `Plus d'options pour ${title}`, locale: "fr" }}>
```

Every icon is swappable the same way with `icons` (Lucide by default). Pass SVG elements; the kit sizes and
colors them with CSS. The keys are listed in `ChatIcons`.

```tsx
<ChatTheme icons={{ copy: <MyCopy />, send: <MySend /> }}>
```

The full list of variables is at the top of
[`packages/react/src/styles.css`](https://github.com/bushshrub/agentic-ui-kit/blob/main/packages/react/src/styles.css).

