# llm-chat-uikit

## Working style
- Feedback that arrives mid-task is usually not urgent: finish the current task first, then handle it.
  Write it down (docs/spec.md "Queued") so it is not lost. Only switch at once if it is urgent or says so.

## Layout
- pnpm monorepo: packages/core (types, events, reducer), packages/react (UI kit), apps/playground (Storybook :6006).
- packages/react/src has four layers: primitives -> hooks -> components -> views. Each imports only from
  the ones before it; src/layers.test.ts enforces it. See docs/spec.md "Layers".
- Theming is only through --chat-* CSS variables; host themes live in apps/playground/src/themes.css.

## Checks
- `pnpm -r typecheck`, and `npx vitest run` in packages/core and packages/react.
