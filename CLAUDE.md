# agentic-ui-kit

## Working style
- Feedback that arrives mid-task is usually not urgent: finish the current task first, then handle it.
  Write it down (docs/spec.md "Queued") so it is not lost. Only switch at once if it is urgent or says so.

## Layout
- pnpm monorepo: packages/core (types, events, reducer; private), packages/react (the published `agentic-ui-kit`
  package, with core bundled in as `agentic-ui-kit/core`), apps/playground (Storybook :6006).
- `pnpm build` in packages/react (build.mjs) writes dist/: tsdown JS, tsc types, styles.css (precompiled) and
  tailwind.css. Published to npm as agentic-ui-kit. Publish only when asked, and from the `pnpm pack`
  tarball: plain `npm publish` ignores publishConfig.exports and would ship exports pointing at src/.
- packages/react/src has four layers: primitives -> hooks -> components -> views. Each imports only from
  the ones before it; src/layers.test.ts enforces it. See docs/spec.md "Layers".
- Theming is only through --chat-* CSS variables; host themes live in apps/playground/src/themes.css.

## Checks
- `pnpm -r typecheck` and `pnpm test`.
