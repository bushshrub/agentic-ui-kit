# llm-chat-uikit spec

Reusable building blocks for LLM chat in React, styled like claude.ai by default, plus a multi-user web chat
built from them. The kit must drop into other apps (e.g. a job board, a team-chat bot) and take on their theme and their own
message types, so no app keeps a second hand-rolled chat view.

## Goals

- One chat implementation, used by every app: full page, docked panel, or small inline area.
- Each layer usable on its own: core types and stream logic, React hooks, components, full views.
- The host app sets the theme. No component hardcodes a color, font or spacing.
- Hosts add their own message part types, menu items, header content and actions without forking.
- The web chat feels like claude.ai or chatgpt.com: polished, few settings, works for many users.

Not goals: an admin-heavy app like Open WebUI or LibreChat; support for non-React frameworks (the core layer
stays framework-free, so a later port only rewrites the components).

## Repo layout

```
packages/
  core/       plain TS, no React: message/part types, stream event schema, stream -> message reducer,
              model/effort config types
  react/      React Aria primitives, hooks, chat components, views, default claude.ai theme
apps/
  server/     Hono API: auth, Postgres, LLM runs, uploads, tools, MCP
  web/        the web chat, built only from packages/react + packages/core
  playground/ Storybook: every component in every state, driven by recorded fixture streams
docs/
```

Dependency rule: `packages/*` never import from `apps/*`. `react` depends on `core`; `server` depends on
`core` only. Package names are placeholders (`@llm-chat/core`, `@llm-chat/react`).

## Stack

| Layer | Choice |
|---|---|
| Workspace | pnpm workspaces, TypeScript, Vite, Vitest |
| Primitives | React Aria Components |
| Styling | Tailwind 4, CSS variables for every token |
| Icons | lucide-react |
| Markdown | Streamdown (handles half-streamed markdown), KaTeX, Shiki |
| Scrolling | use-stick-to-bottom |
| Client data | TanStack Query for REST, our own client for the event stream |
| Server | Hono on Node |
| Auth | Better Auth (accounts, OAuth, sessions in Postgres) |
| Database | Postgres + Drizzle |
| LLM calls | Vercel AI SDK, server side only; the UI never sees its formats |
| Runs | Postgres-backed queue so replies run apart from the client connection |
| Files | S3-compatible storage (MinIO locally) |
| Tools | `@modelcontextprotocol/sdk` client, MCP Apps for tool UIs |

## Layers

`@llm-chat/react` has four layers, in `src/primitives`, `src/hooks`, `src/components`, `src/views`. Each
imports only from the ones before it; `src/layers.test.ts` fails otherwise. Storybook groups stories the
same way, then shows the kit in each host under Hosts.

| Layer | Knows about | Examples |
| --- | --- | --- |
| Primitives | nothing chat-specific; a host app can build any screen with them | Button, IconButton, Badge, Tooltip, Menu, Popover, ContextMenu, Disclosure, Modal, Drawer, Panel, CodeBlock, ChatTheme |
| Hooks | state, no markup | useChat, useSmoothText, useSidebar, useMediaQuery |
| Components | one chat job each, built from primitives | Composer, ModelPicker, AttachmentCard, Markdown, ActivityGroup + ToolViews, TokenCounter, ContextPanel, messages, MessageList, ChatHeader, ChatList |
| Views | layout of a page or pane; mostly slots, little behaviour of their own | ChatView, EmptyState, AppShell, Sidebar |

How to place a new piece: no chat types and no chat behaviour means a primitive (Panel is one: a frame
that fills its container). Takes a `Message`, `Part`, model or attachment, or does one chat job, means a
component. Arranges several components into a region and passes host content through slots means a view.

Views size themselves to their container, not the window: ChatView is a CSS container and measures its
own height, so several fit side by side or stacked (an agent dashboard). Only AppShell reads the viewport. Overlays
render into the nearest `ChatTheme`, so a themed region keeps its theme in menus and dialogs.

### core

- `Message`: id, parentId (for edits and retries as branches), role, status (`streaming | done | error |
  stopped`), model, effort, createdAt, parts, usage.
- `Part` is a tagged union:
  - `text` — markdown.
  - `thinking` — summary text, a short title ("Deriving the rejection region..."), duration in ms.
  - `tool_call` — name, input, status, result, a display title ("Recalled memory preferences.md").
  - `attachment` — file id, name, mime, size, preview url.
  - `widget` — html, or an MCP Apps resource reference; see Visualize.
  - `custom` — `{ kind: string, data: unknown }`, rendered by a host-registered renderer.
- The stream event schema (below) and a pure `reduce(message, event) -> message`. Fully unit-tested against
  recorded fixtures. Any backend in any language that emits these events works with the UI.

### react: hooks

- `useChat({ transport, conversationId })`: messages, send, stop, retry, edit, branch switching, resume.
- `useComposer()`: text, attachments, model, effort, toggles (web search, research).
- `Transport` interface: `send(request) -> AsyncIterable<Event>`, `resume(runId, afterSeq)`, `stop(runId)`.
  The kit ships an SSE transport for our event schema. Each host writes a small adapter if its backend
  differs (e.g. a Python backend).

### react: components

- Primitives on React Aria: Button, IconButton, Menu with submenus, check marks, shortcut hints and section
  separators, Popover, Tooltip, Dialog, Disclosure, Badge, Textarea that grows.
- `MessageList`: sticks to the bottom while streaming, keeps the scroll position when the user scrolls up.
- Smooth reveal: streamed text must appear like claude.ai, not as raw left-to-right chunks. Two parts:
  1. Pacing: a `useSmoothText` buffer releases received text at an even rate that adapts to how far
     behind it is, so network bursts don't show as jumps and the reveal catches up when the run ends.
  2. Fade-in: newly revealed words fade in (short opacity transition per chunk) instead of appearing hard.
  Markdown structure (lists, math, code blocks) must not flicker as it completes. Respect
  `prefers-reduced-motion`. Check what Streamdown's own animation offers before building our own.
- Citations: text parts carry source references; the answer shows small inline chips (source short name,
  e.g. "ssps") that link to or preview the source. Needs a `citations` field on text parts in core.
- `UserMessage`: bubble, time, retry / edit / copy actions, branch arrows.
- `AssistantMessage`: markdown body, actions row (copy, read aloud, thumbs, retry, time).
- `ActivityGroup`: consecutive thinking and tool_call parts fold into one "heading ▾" dropdown with a
  bordered box of rows. The heading lists what the tools did ("Ran a command, searched the web"); a live
  group follows its latest step. Each row expands to its own detail. Tool rows render through a
  `ToolView` registered per tool name (label, subtitle, heading phrase, detail): built in are command
  (bash line + output), web search (query + result list with icon, title, domain) and memory. Hosts
  register their own. A group of one step has no rows: its heading is the step's label and the box
  holds the step's detail directly.
- `Composer`: `+` attach menu, textarea, model/effort picker, mic, send/stop. A centered variant for the
  empty state, a docked variant for a chat in progress, and a compact variant for inline use.
- `ModelPicker`: current model with description and check, Effort submenu (Low..Max, "Recommended" badge,
  usage warning badge), "More models" submenu, footnote slot.
- `AttachmentChip`, `DropZone`. Attachments sit in a row of square cards above the text, and the composer
  grows to hold them. Long pasted text becomes a card (preview of the first lines, a "PASTED" badge, an edit
  button); images show a thumbnail. A remove "x" appears on hover or focus. A card shimmers while its file
  uploads. (Built: `useAttachments`, `AttachmentRow`, `AttachmentCard`, `PastedTextDialog`.)
- `FilePicker` (later, also used outside the composer in the web app): a modal with "Search or paste a
  link", source tabs (All, plus host sources like Artifacts, Google Drive, Upload), an Actions section
  ("Upload from computer"), Recents with checkboxes for picking several (name, time, type, icon), and a
  footer of keyboard hints (Navigate ↑↓, Select ↵, Change source ←→).
- Models come from the host: slug (`id`), display name, description, context window, and effort levels
  only if the model has them. Models without levels get no Effort menu and no effort is sent
  (`resolveEffort`). The send button and accents use the host's `--chat-accent`.
- `WidgetFrame`: sandboxed iframe, see Visualize.
- `TokenCounter`: "↓ 1.2k tokens", counting up smoothly while a reply streams. Uses `run.usage` events
  when the backend sends them, else an estimate from the streamed text (`outputTokens` in core).
- `ContextPanel`: what fills the context window: "8% used  76.8k / 1M", a segmented bar, one row per
  category with tokens and share, deferred categories with a dash, expandable lists (each MCP tool, each
  memory file). Data is `ContextUsage` from core, filled in by the backend.
- Thinking: reasoning stays inside the closed dropdown by default; users expand it to watch. Full
  reasoning (`visibility: "full"`) and summaries both stream into the row with the same fade-in as the
  answer. Hidden reasoning shows "Thinking…" then "Thought for 9s". Live labels get a sweeping highlight
  (shimmer), and each activity heading shows its own token count, "Ran a command (1.3k tokens) ▸", which counts up while that group runs and disappears when it ends; the reply text is not counted. Token totals for the context panel come from `message.usage` (`run.usage` / `run.end`), not these estimates.

### react: views

- `AppShell`: collapsible sidebar + main area.
- `ChatList`: the chat picker on its own, usable without the sidebar (in a host's own sidebar).
  Collapsible sections ("Pinned", "Chats and tasks") with a filter button, project rows with nested chats,
  "View all", active row, running / unread dot, "10 new" badge, row menu (rename, pin, delete).
- `Sidebar`: the claude.ai frame: header with collapse and mode toggles, nav items (New, Search, Projects,
  ...), sections holding `ChatList`s, user footer with plan and a menu.
- `EmptyState`: greeting + centered composer.
- `ChatView`: breadcrumb header with title menu and Share, message list, docked composer, disclaimer line.

Each view is assembled from the components above, so a host can use the view or rebuild it from parts.

## Accessibility and devices

- Keyboard and screen reader: every control is a React Aria component (focus rings, roles, labels, menu
  and disclosure keyboard support). Icon buttons always have a label. Storybook runs axe checks on every
  story (Accessibility panel).
- Interactive things look interactive: pointer cursor, hover state, visible focus ring.
- Reduced motion: no fade-in, pacing, count-up or popover animation when the OS asks for less motion.
- Font scaling: sizes in rem, so the browser / OS text size scales the whole UI; nothing clips at 200%.
- Contrast: theme colors meet WCAG AA for text against their backgrounds.
- Breakpoints: phone portrait (~390px) and landscape (~844x390), tablet portrait (~820px) and landscape
  (~1180px), laptop and up. Components work from 320px wide. Views: below tablet the sidebar becomes an
  overlay drawer, the composer stays docked above the keyboard, touch targets are at least 40px, hover-only
  actions are always visible on touch. Storybook has a viewport preset for each.
- As built: below 768px `AppShell` shows the sidebar as a drawer (`SidebarToggle drawerOnly` in the chat
  header opens it; picking a chat closes it). From 768px it is pinned, starting as an icon rail below 1024px.
  Touch screens get 40px buttons and rows, the composer and sidebar footer pad for the home bar
  (`safe-area-inset-bottom`), and short landscape screens drop the disclaimer line. Hosts should set
  `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover,
  interactive-widget=resizes-content">` so the docked composer rides above the on-screen keyboard.

## Extension points

- **Theme**: all tokens are CSS variables (`--chat-bg`, `--chat-fg`, `--chat-accent`, fonts, radii,
  `--chat-content-width`, `--chat-content-padding`, ...). The default theme is dark. A host
  maps the variables to its own theme. Content width and padding are a user setting in the web chat.
- **Part renderers**: `<ChatProvider renderers={{ job_row: JobRow, chat_message: ChannelEmbed }}>`. The
  kit renders built-in parts and hands `custom` parts to the matching renderer; unknown kinds render a
  plain fallback.
- **Slots**: header, empty state, sidebar items, `+` menu items, message actions, composer toolbar, model
  picker footnote. Passed as props or children, never by copying a component.
- **Density**: `full | panel | inline` changes spacing and which controls show. The same thread code runs
  in a page, a dock, and an inline box.

## Stream event schema

Server-sent events over HTTP. Every event carries `runId` and an increasing `seq`, so a client can resume
with `Last-Event-ID` after a refresh, a dropped connection or a switch to another device.

```
run.start      { runId, messageId, parentId, model, effort }
part.start     { partId, index, type, ...initial fields }   // e.g. tool name, thinking start time
part.delta     { partId, text? , inputJson? }                // text, thinking text, tool input
part.end       { partId, ...final fields }                    // tool result, thinking title + duration
run.end        { status: done | stopped | error, usage?, error? }
title          { conversationId, title }                      // auto title after the first reply
```

`custom` parts use the same events with `type: "custom"` and a `kind`.

## Server

- Hono REST API plus SSE. Routes: auth (Better Auth), conversations (list, get, rename, pin, delete,
  move to project), messages (send, retry, edit -> new branch), runs (stream, resume, stop), uploads,
  models (list, with effort levels per model), projects.
- A send creates a message and a run. A worker executes the run with the AI SDK, writes every event to
  `run_events` and every finished part to `parts`, and fans events out to any connected clients. Closing
  the tab does not stop the run; Stop does.
- Providers come from server config (API keys stay on the server). The model list and effort levels the UI
  shows come from `/models`, so the UI has no per-provider code.
- Per-user usage tracking and limits, kept simple.

### Data model (Postgres)

- Better Auth tables (users, sessions, accounts).
- `projects` (id, user_id, name, instructions, created_at)
- `conversations` (id, user_id, project_id?, title, pinned, created_at, updated_at)
- `messages` (id, conversation_id, parent_id?, role, status, model, effort, usage jsonb, created_at)
- `parts` (message_id, index, type, data jsonb)
- `attachments` (id, user_id, storage_key, name, mime, size, created_at)
- `runs` (id, message_id, status, started_at, ended_at)
- `run_events` (run_id, seq, event jsonb); pruned some time after the run ends.

## Visualize

The model can return interactive visuals inline in a reply, like claude.ai's (sliders, a plotted
distribution, live numbers).

- `WidgetFrame` renders in an iframe with `sandbox="allow-scripts"` and no same-origin access. It passes
  the theme variables in, resizes to the content height, and talks to the page only over `postMessage`.
- Server side, two sources produce a `widget` part:
  1. A built-in `visualize` tool: the model writes self-contained HTML/JS/SVG as the tool input; the UI
     renders it from the input as it streams in.
  2. MCP Apps: an MCP tool that returns a UI resource renders the same way, so third-party MCP servers with
     UIs work without extra code.
- Check the current MCP Apps spec (Context7 / modelcontextprotocol docs) before building this slice.

## Build order

Each slice ends with tests passing and the states visible in the playground.

1. Workspace scaffold: pnpm, TS, Vitest, Tailwind 4, Storybook playground, lint.
2. Theme tokens (claude.ai dark) and primitives on React Aria.
3. `core`: types, event schema, reducer, fixture streams recorded from a real provider.
4. Message components: `MessageList`, `UserMessage`, `AssistantMessage` (Streamdown, KaTeX, Shiki),
   `ActivityGroup`, action rows. Driven by fixtures replayed at real speed.
5. `Composer`, `ModelPicker` with Effort and More models submenus, `+` attach menu, `AttachmentChip`.
6. Views: `AppShell`, `Sidebar`, `EmptyState`, `ChatView`, content width/padding setting.
7. **Fit check**: port an existing app's chat view onto the kit, with its theme and its custom parts.
   Fix the kit's extension points from what breaks.
8. Server: Hono, Postgres/Drizzle, Better Auth, conversations and messages, runs over SSE with resume,
   AI SDK providers, `/models`.
9. Web app: wire the views to the server; auth screens; settings (theme density, content width).
10. Uploads: S3 storage, drag and drop, previews, sending files to the model.
11. Tools: MCP client, tool_call rendering end to end, `WidgetFrame` + `visualize` tool, MCP Apps.
12. Later: search, projects with instructions, share links, light theme, voice.

## Queued

- Ask-user tool (`ask_user`): the model asks the user questions; a prompt over the composer like claude.ai.
  Per question: single choice (numbered rows, number keys, picks and moves on), multiple choice
  (checkboxes, "1 selected", next arrow), rank (drag handles, keyboard reorder, "Drag to re-order").
  Pager "1 of 3", close X, "Something else" free text, Skip. Composer placeholder becomes "Or reply
  directly…"; replying declines the prompt. Once answered, a standalone card in the message lists each
  question and its answer ("Ranked: 1. …"). Builds on client tools: a tool with a `Prompt` component
  whose result is the user's answer; `ToolView.Block` (done) renders the answers card.

## Open questions

- Providers to support first (Anthropic only, or OpenAI / Google / OpenRouter too).
- Deploy target for the web chat (single VPS with compose, or something else).
- Light theme now or later.
- Package names and whether the kit gets published to npm or only used through the workspace / git.
