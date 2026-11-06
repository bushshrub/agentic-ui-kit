---
title: What's in the kit
description: Every export of the React package and the core package, by layer, with a link to its API page.
sidebar:
  order: 1
---

The React package (`agentic-ui-kit`) has four layers, each built only from the ones before it. The framework-free
core (`agentic-ui-kit/core`) holds the event model and helpers the React layers sit on. Every name links to a page
generated from the TypeScript sources, with its signature, props and JSDoc.

Use `ChatView` for the whole thing, or build your own layout from the components.

Inline visuals (sandboxed HTML and model-drawn components) are not listed here: they are opt-in and live in
`agentic-ui-kit/visuals` and `agentic-ui-kit/visuals/core`. See [Inline visuals](/inline-visuals/overview/) and
[Upgrading to 0.9](/get-started/upgrading-to-0-9/) for every name.

## Primitives

Generic UI with no chat knowledge.

| Name | What it is |
| --- | --- |
| [`Button`](/reference/api/agentic-ui-kit/functions/button/) | Text button with variants. |
| [`IconButton`](/reference/api/agentic-ui-kit/functions/iconbutton/) | Square button that holds an icon; needs an accessible label. |
| [`Badge`](/reference/api/agentic-ui-kit/functions/badge/) | Small pill for a count or status. |
| [`Tooltip`](/reference/api/agentic-ui-kit/functions/tooltip/) | Hover and focus hint attached to its child. |
| [`Caret`](/reference/api/agentic-ui-kit/functions/caret/) | The small filled triangle claude.ai uses after expandable labels. Points right; rotate to point down. |
| [`Disclosure`](/reference/api/agentic-ui-kit/functions/disclosure/) | A row that expands to show more, like "Recalled memory ▸". |
| [`Popover`](/reference/api/agentic-ui-kit/functions/popover/) | Floating panel for menus and pickers: surface color, rounded, soft shadow, fades in. |
| `PopoverTrigger` (also `DialogTrigger`) | Wraps a trigger button and a `Popover` or `Modal` so a press toggles it; no react-aria import needed. |
| [`Menu`](/reference/api/agentic-ui-kit/functions/menu/) | List of items inside a Popover, with keyboard navigation. |
| [`MenuItem`](/reference/api/agentic-ui-kit/functions/menuitem/) | One row in a Menu. |
| [`MenuSearch`](/reference/api/agentic-ui-kit/functions/menusearch/) | A search box above a menu that filters its items, like "Search or create a project". |
| [`MenuSection`](/reference/api/agentic-ui-kit/functions/menusection/) | A titled group of menu items. |
| [`MenuSeparator`](/reference/api/agentic-ui-kit/functions/menuseparator/) | A divider line between menu groups. |
| [`MenuNote`](/reference/api/agentic-ui-kit/functions/menunote/) | Explanatory text inside a menu, above or below the items. Not focusable. |
| [`MenuTrigger`](/reference/api/agentic-ui-kit/functions/menutrigger/) | A menu item that opens a nested Menu. |
| [`SubmenuTrigger`](/reference/api/agentic-ui-kit/variables/submenutrigger/) | A submenu trigger is used to wrap a submenu's trigger item and the submenu itself. |
| [`ContextMenu`](/reference/api/agentic-ui-kit/functions/contextmenu/) | Opens `menu` at the pointer on right-click, or at the focused element with the Menu key or Shift+F10. |
| [`Modal`](/reference/api/agentic-ui-kit/functions/modal/) | A centered dialog over a dimmed page. Escape and clicking outside close it; focus stays inside. |
| [`Drawer`](/reference/api/agentic-ui-kit/functions/drawer/) | A panel sliding in from the side over a dimmed page, e.g. the sidebar on phones. |
| [`Panel`](/reference/api/agentic-ui-kit/functions/panel/) | A titled region that fills its container and lets the body scroll: a dock panel, an agent pane in a |
| [`CodeBlock`](/reference/api/agentic-ui-kit/functions/codeblock/) | Monospace code with Shiki highlighting, scrolling past a fixed height. |
| [`ChatTheme`](/reference/api/agentic-ui-kit/functions/chattheme/) | Applies a chat theme to part of a page. Menus, tooltips and dialogs opened inside render into this |
| [`defaultLabels`](/reference/api/agentic-ui-kit/variables/defaultlabels/) | The English strings. |
| [`useLabels`](/reference/api/agentic-ui-kit/functions/uselabels/) | The active UI strings: the enclosing `ChatTheme`'s `labels` over the English defaults. |
| [`defaultIcons`](/reference/api/agentic-ui-kit/variables/defaulticons/) | Lucide icons, plus the claude.ai caret. Unsized: the places that show them size them with CSS. |
| [`useIcons`](/reference/api/agentic-ui-kit/functions/useicons/) | The active icons: the enclosing `ChatTheme`'s `icons` over the defaults. |

Types: [`ButtonProps`](/reference/api/agentic-ui-kit/interfaces/buttonprops/), [`IconButtonProps`](/reference/api/agentic-ui-kit/interfaces/iconbuttonprops/), [`BadgeProps`](/reference/api/agentic-ui-kit/interfaces/badgeprops/), [`ContextMenuProps`](/reference/api/agentic-ui-kit/interfaces/contextmenuprops/), [`ModalProps`](/reference/api/agentic-ui-kit/interfaces/modalprops/), [`DrawerProps`](/reference/api/agentic-ui-kit/interfaces/drawerprops/), [`PanelProps`](/reference/api/agentic-ui-kit/interfaces/panelprops/), [`ChatThemeProps`](/reference/api/agentic-ui-kit/interfaces/chatthemeprops/), [`ChatLabels`](/reference/api/agentic-ui-kit/interfaces/chatlabels/), [`ChatIcons`](/reference/api/agentic-ui-kit/interfaces/chaticons/), [`CodeThemes`](/reference/api/agentic-ui-kit/interfaces/codethemes/), [`ChatMotion`](/reference/api/agentic-ui-kit/type-aliases/chatmotion/).

### Primitive behavior worth knowing

- **Class merging.** Every primitive merges `className` with tailwind-merge, so a caller's `h-7`, `size-10`,
  `rounded-none` or `max-w-sm` replaces the kit's class for the same property; no `!` needed. It knows the
  kit's own `rounded-chat-*`, `shadow-chat-popover` and `animate-chat-*` utilities.
- **Disabled with a reason.** `<Button isDisabled disabledReason="Fill in the title">` (also `IconButton`)
  stays focusable with `aria-disabled`, never fires `onPress` or submits a form, shows the reason as a tooltip
  on hover and focus, and exposes it as the accessible description. Without `disabledReason`, `isDisabled`
  is a native disabled button as before.
- **Modal size and placement.** `size` is `sm`, `md`, `lg` (default), `xl` or `full`; `placement` is `center`
  (default) or `top`.
- **Popover on phones.** Below 768px a `Popover` (and so every `Menu` in one) opens as a bottom sheet over the
  `--chat-backdrop` dimmer, with the same keyboard and focus behavior. `sheet={480}` changes the breakpoint,
  `sheet={false}` keeps the floating popover. `width="trigger"` sizes it to its trigger, and
  `fullWidthOnPhones` stretches a floating popover to the viewport.
- **Menu rows.** In a `selectionMode` menu the selected item shows a check mark; `indicator="switch"` shows an
  on/off switch instead.
- **SegmentedControl.** `clearable` lets the selected option be pressed again (`value` and `onChange` then use
  `null`), `isDisabled` disables the group (options take it too), and `size="md"` is the taller variant.

## Hooks

Headless state: the chat, tools, the smooth text reveal, the sidebar.

| Name | What it is |
| --- | --- |
| [`useChat`](/reference/api/agentic-ui-kit/functions/usechat/) | A linear conversation driven by a Transport: sends, streams the reply through `applyEvent`, stops and |
| [`userMessage`](/reference/api/agentic-ui-kit/functions/usermessage/) | Builds a user Message from text, for sending or seeding a chat. |
| [`sseTransport`](/reference/api/agentic-ui-kit/functions/ssetransport/) | A `Transport` for backends that stream `StreamEvent`s over server-sent events (see `formatEvent`). |
| [`AgentProvider`](/reference/api/agentic-ui-kit/functions/agentprovider/) | Holds the tools and context for the chats and the page inside it. |
| [`AgentRegistry`](/reference/api/agentic-ui-kit/classes/agentregistry/) | The tools and context the page currently offers. Components register what they own while mounted, so |
| [`useAgentRegistry`](/reference/api/agentic-ui-kit/functions/useagentregistry/) | The AgentRegistry from the nearest AgentProvider. |
| [`useAgentSnapshot`](/reference/api/agentic-ui-kit/functions/useagentsnapshot/) | Re-renders when tools or context change, e.g. for an inspector. |
| [`useAgentTool`](/reference/api/agentic-ui-kit/functions/useagenttool/) | Offers a tool while the calling component is mounted. The latest `tool` is always used, so `execute` can |
| [`useAgentContext`](/reference/api/agentic-ui-kit/functions/useagentcontext/) | Shares page state with the model, e.g. the form's current values. Sent with each request. |
| [`useSmoothText`](/reference/api/agentic-ui-kit/functions/usesmoothtext/) | Paces streamed text so it appears at an even rate instead of in network-sized bursts. The reveal speed |
| [`useSidebar`](/reference/api/agentic-ui-kit/functions/usesidebar/) | Open/closed state for the sidebar, persisted, with a drawer mode on narrow screens. |
| [`useMediaQuery`](/reference/api/agentic-ui-kit/functions/usemediaquery/) | Tracks whether a CSS media query matches. |
| [`DRAWER_QUERY`](/reference/api/agentic-ui-kit/variables/drawer_query/) | Below this width the sidebar is a drawer over the content (phones). |

Types: [`Transport`](/reference/api/agentic-ui-kit/interfaces/transport/), [`SendRequest`](/reference/api/agentic-ui-kit/interfaces/sendrequest/), [`SendOptions`](/reference/api/agentic-ui-kit/interfaces/sendoptions/), [`UseChat`](/reference/api/agentic-ui-kit/functions/usechat/), [`UseChatOptions`](/reference/api/agentic-ui-kit/interfaces/usechatoptions/), [`PendingApproval`](/reference/api/agentic-ui-kit/interfaces/pendingapproval/), [`SseTransportOptions`](/reference/api/agentic-ui-kit/interfaces/ssetransportoptions/), [`SseRequestBody`](/reference/api/agentic-ui-kit/type-aliases/sserequestbody/), [`AgentTool`](/reference/api/agentic-ui-kit/interfaces/agenttool/), [`ToolContext`](/reference/api/agentic-ui-kit/interfaces/toolcontext/), [`ToolSpec`](/reference/api/agentic-ui-kit/interfaces/toolspec/), [`JsonSchema`](/reference/api/agentic-ui-kit/type-aliases/jsonschema/).

## Components

Chat pieces with one job each, built from primitives.

| Name | What it is |
| --- | --- |
| [`UserMessage`](/reference/api/agentic-ui-kit/functions/usermessage/) | A user turn: the text, attachments and hover actions. |
| [`AssistantMessage`](/reference/api/agentic-ui-kit/functions/assistantmessage/) | The assistant's turn: activity groups (each with its own token count), markdown, and other parts in |
| [`formatRelativeTime`](/reference/api/agentic-ui-kit/functions/formatrelativetime/) | "just now", "5 minutes ago", "21 hours ago", "yesterday", then a date. |
| [`messageText`](/reference/api/agentic-ui-kit/functions/messagetext/) | Plain text of a message, for copy and read aloud. |
| [`Markdown`](/reference/api/agentic-ui-kit/functions/markdown/) | Message markdown: GFM, KaTeX math ($…$ and $$…$$), Shiki code blocks, smooth fade-in while streaming. |
| [`MarkdownLinksProvider`](/reference/api/agentic-ui-kit/functions/markdownlinksprovider/) | Sets how Markdown links render (for example to open them in a new tab). |
| [`ActivityGroup`](/reference/api/agentic-ui-kit/functions/activitygroup/) | The "Ran a command, searched the web ▾" dropdown: a one-line heading that opens a bordered box with one |
| [`ToolViewsProvider`](/reference/api/agentic-ui-kit/functions/toolviewsprovider/) | Supplies the ToolViews used to render tool calls. |
| [`useToolView`](/reference/api/agentic-ui-kit/functions/usetoolview/) | The ToolView registered for a tool name. |
| [`useToolViews`](/reference/api/agentic-ui-kit/functions/usetoolviews/) | The provider's views, plus views brought by tools the page registered (`ChatTool.view`). |
| [`activityLabel`](/reference/api/agentic-ui-kit/functions/activitylabel/) | Row label for any activity part. |
| [`activityHeading`](/reference/api/agentic-ui-kit/functions/activityheading/) | Heading of an activity group. While live it follows the latest step. Once done it lists what the tools |
| [`commandTool`](/reference/api/agentic-ui-kit/variables/commandtool/) | A shell command. Input `{ command, description? }`; result a string or `{ stdout, stderr, exitCode }`. |
| [`webSearchTool`](/reference/api/agentic-ui-kit/variables/websearchtool/) | A web search. Input `{ query }`; results (`{ results: SearchResult[] }` or `SearchResult[]`) from the |
| [`webFetchTool`](/reference/api/agentic-ui-kit/variables/webfetchtool/) | Reads a web page. Input `{ url }`; the row shows the page's host, the detail links to it. |
| [`memoryTool`](/reference/api/agentic-ui-kit/variables/memorytool/) | Memory lookups, e.g. Anthropic's memory tool. Input `{ path }`. |
| [`defaultToolViews`](/reference/api/agentic-ui-kit/variables/defaulttoolviews/) | The ToolViews for the built-in tools. |
| [`formatDuration`](/reference/api/agentic-ui-kit/functions/formatduration/) | "9s", "1m 5s". |
| [`useChatTool`](/reference/api/agentic-ui-kit/variables/usechattool/) | `useAgentTool` for tools that bring a view. |
| [`ApprovalCard`](/reference/api/agentic-ui-kit/functions/approvalcard/) | Asks the user before a tool runs, above the composer. Shows the tool's label and what it will do: its |
| [`TokenCounter`](/reference/api/agentic-ui-kit/functions/tokencounter/) | A token count that counts up as `tokens` grows and holds still when it stops growing. |
| [`useCountUp`](/reference/api/agentic-ui-kit/functions/usecountup/) | Follows `target` with a number that counts up smoothly instead of jumping. Each frame closes part of the |
| [`formatTokens`](/reference/api/agentic-ui-kit/functions/formattokens/) | Compact token count: 526, 1.4k, 33k, 76.8k, 1M. |
| [`ContextPanel`](/reference/api/agentic-ui-kit/functions/contextpanel/) | What fills the context window: a usage line, a segmented bar, one row per category with its share, and |
| [`ContextMeter`](/reference/api/agentic-ui-kit/functions/contextmeter/) | A small progress ring for the composer toolbar, filled to the share of the context window in use (accent, |
| [`CopyField`](/reference/api/agentic-ui-kit/functions/copyfield/) | A read-only, selectable field with a Copy button, for share links. The button says "Copied" for about two |
| [`Composer`](/reference/api/agentic-ui-kit/functions/composer/) | The chat box: growing textarea, toolbar slots, send / stop. Enter sends, Shift+Enter adds a line. |
| [`AttachButton`](/reference/api/agentic-ui-kit/functions/attachbutton/) | The `+` button that opens the attach menu above the composer. |
| [`ModelPicker`](/reference/api/agentic-ui-kit/functions/modelpicker/) | "Opus 5.5 High ⌄": the models, an Effort submenu for models that have levels, and More models. |
| [`useAttachments`](/reference/api/agentic-ui-kit/functions/useattachments/) | Composer attachments: pasted text, images with thumbnails, files, each uploading on its own. |
| [`AttachmentCard`](/reference/api/agentic-ui-kit/functions/attachmentcard/) | A square card: pasted text preview with a PASTED badge, an image thumbnail, or a file with its type. |
| [`AttachmentRow`](/reference/api/agentic-ui-kit/functions/attachmentrow/) | The composer's row of cards above the text. Renders nothing when empty. |
| [`PastedTextDialog`](/reference/api/agentic-ui-kit/functions/pastedtextdialog/) | Shows pasted text in a modal, editable when `onSave` is set. |
| [`MessageList`](/reference/api/agentic-ui-kit/functions/messagelist/) | The scrolling conversation. It follows a streaming reply while the reader is at the bottom and leaves |
| [`ChatHeader`](/reference/api/agentic-ui-kit/functions/chatheader/) | The bar above a chat: breadcrumb and title with its menu, actions on the right. |
| [`ChatTitleMenu`](/reference/api/agentic-ui-kit/functions/chattitlemenu/) | Pin, Rename, Add to project (searchable), Share, Delete. Each shows only when its handler is set. |
| [`ChatNotice`](/reference/api/agentic-ui-kit/functions/chatnotice/) | A bordered note in the conversation column: "Shared by Alex. This is a copy of a chat…" with actions under it. |
| [`ChatList`](/reference/api/agentic-ui-kit/functions/chatlist/) | The chat picker: sections of chats and projects, collapsible, with an active row, running and unread |

Types: [`UserMessageProps`](/reference/api/agentic-ui-kit/interfaces/usermessageprops/), [`AssistantMessageProps`](/reference/api/agentic-ui-kit/interfaces/assistantmessageprops/), [`Feedback`](/reference/api/agentic-ui-kit/type-aliases/feedback/), [`MarkdownProps`](/reference/api/agentic-ui-kit/interfaces/markdownprops/), [`RenderLink`](/reference/api/agentic-ui-kit/type-aliases/renderlink/), [`ActivityGroupProps`](/reference/api/agentic-ui-kit/interfaces/activitygroupprops/), [`ToolView`](/reference/api/agentic-ui-kit/interfaces/toolview/), [`ToolViews`](/reference/api/agentic-ui-kit/type-aliases/toolviews/), [`SearchResult`](/reference/api/agentic-ui-kit/interfaces/searchresult/), [`ChatTool`](/reference/api/agentic-ui-kit/interfaces/chattool/), [`ApprovalCardProps`](/reference/api/agentic-ui-kit/interfaces/approvalcardprops/), [`TokenCounterProps`](/reference/api/agentic-ui-kit/interfaces/tokencounterprops/), [`ContextPanelProps`](/reference/api/agentic-ui-kit/interfaces/contextpanelprops/), [`ContextMeterProps`](/reference/api/agentic-ui-kit/interfaces/contextmeterprops/), [`CopyFieldProps`](/reference/api/agentic-ui-kit/interfaces/copyfieldprops/), [`ComposerProps`](/reference/api/agentic-ui-kit/interfaces/composerprops/), [`AttachButtonProps`](/reference/api/agentic-ui-kit/interfaces/attachbuttonprops/), [`ModelPickerProps`](/reference/api/agentic-ui-kit/interfaces/modelpickerprops/), [`DraftAttachment`](/reference/api/agentic-ui-kit/interfaces/draftattachment/), [`UploadResult`](/reference/api/agentic-ui-kit/interfaces/uploadresult/), [`UseAttachments`](/reference/api/agentic-ui-kit/functions/useattachments/), [`UseAttachmentsOptions`](/reference/api/agentic-ui-kit/interfaces/useattachmentsoptions/), [`AttachmentCardData`](/reference/api/agentic-ui-kit/interfaces/attachmentcarddata/), [`AttachmentCardProps`](/reference/api/agentic-ui-kit/interfaces/attachmentcardprops/), [`AttachmentRowProps`](/reference/api/agentic-ui-kit/interfaces/attachmentrowprops/), [`PastedTextDialogProps`](/reference/api/agentic-ui-kit/interfaces/pastedtextdialogprops/), [`MessageListProps`](/reference/api/agentic-ui-kit/interfaces/messagelistprops/), [`ChatHeaderProps`](/reference/api/agentic-ui-kit/interfaces/chatheaderprops/), [`ChatTitleMenuProps`](/reference/api/agentic-ui-kit/interfaces/chattitlemenuprops/), [`ChatNoticeProps`](/reference/api/agentic-ui-kit/interfaces/chatnoticeprops/), [`ChatListProps`](/reference/api/agentic-ui-kit/interfaces/chatlistprops/), [`ChatListSection`](/reference/api/agentic-ui-kit/interfaces/chatlistsection/), [`ChatListItem`](/reference/api/agentic-ui-kit/type-aliases/chatlistitem/), [`ChatSummary`](/reference/api/agentic-ui-kit/interfaces/chatsummary/), [`ProjectSummary`](/reference/api/agentic-ui-kit/interfaces/projectsummary/).

## Views

Assemblies that fill a page or pane, mostly slots.

| Name | What it is |
| --- | --- |
| [`ChatView`](/reference/api/agentic-ui-kit/functions/chatview/) | A whole chat: header, the conversation, the docked composer. An empty chat shows `emptyState`. |
| [`EmptyState`](/reference/api/agentic-ui-kit/functions/emptystate/) | A new chat: greeting over a centered composer. |
| [`ChatTranscript`](/reference/api/agentic-ui-kit/functions/chattranscript/) | A conversation to read, not to continue: a shared chat, an export, a log. Same messages as ChatView, |
| [`AppShell`](/reference/api/agentic-ui-kit/functions/appshell/) | A page with a sidebar: pinned and collapsible to an icon rail from tablet width up, a drawer over the |
| [`SidebarToggle`](/reference/api/agentic-ui-kit/functions/sidebartoggle/) | Opens the drawer on phones, collapses / expands the pinned sidebar elsewhere. |
| [`Sidebar`](/reference/api/agentic-ui-kit/functions/sidebar/) | The claude.ai sidebar frame. Collapses to an icon rail inside `AppShell`; a drawer on phones. |
| [`SidebarItem`](/reference/api/agentic-ui-kit/functions/sidebaritem/) | A nav row: icon and label; just the icon with a tooltip when collapsed. Closes the drawer when picked. |
| [`SidebarList`](/reference/api/agentic-ui-kit/functions/sidebarlist/) | The `<ul>` for `SidebarItem`s outside `Sidebar`'s `nav` slot: no bullets, no padding. |
| [`SidebarUser`](/reference/api/agentic-ui-kit/functions/sidebaruser/) | The account row at the bottom: avatar, name, plan, and a menu. |

Types: [`ChatViewProps`](/reference/api/agentic-ui-kit/interfaces/chatviewprops/), [`EmptyStateProps`](/reference/api/agentic-ui-kit/interfaces/emptystateprops/), [`Density`](/reference/api/agentic-ui-kit/type-aliases/density/), [`ChatTranscriptProps`](/reference/api/agentic-ui-kit/interfaces/chattranscriptprops/), [`AppShellProps`](/reference/api/agentic-ui-kit/interfaces/appshellprops/), [`SidebarToggleProps`](/reference/api/agentic-ui-kit/interfaces/sidebartoggleprops/), [`SidebarProps`](/reference/api/agentic-ui-kit/interfaces/sidebarprops/), [`SidebarItemProps`](/reference/api/agentic-ui-kit/interfaces/sidebaritemprops/), [`SidebarListProps`](/reference/api/agentic-ui-kit/interfaces/sidebarlistprops/), [`SidebarUserProps`](/reference/api/agentic-ui-kit/interfaces/sidebaruserprops/).

### App shell and sidebar

`AppShell` is exactly as tall as the window and `main` scrolls inside it. Pass `scroll="window"` and the shell grows
with the page instead: the window scrolls, `position: sticky` in the page keeps working, and the sidebar sticks to the
top at window height.

```tsx
<AppShell
  scroll="window"
  sidebar={<Sidebar brand="Acme" nav={<SidebarItem icon={<Home />} label="Home" href="/" badge={3} />} />}
  resizable={{ min: 220, max: 420 }}
  persistKey="acme.sidebar-width"
  collapsed={collapsed}
  onCollapsedChange={setCollapsed}
>
  <Page />
</AppShell>
```

- **Collapsed**: `defaultCollapsed` seeds it; `collapsed` + `onCollapsedChange` let your app own it (to persist it, say).
  The rail shows the nav items, the toggle and `Sidebar`'s `railActions`; `headerActions` and the children are hidden.
- **Resizable**: `resizable={{ min, max }}` adds a drag handle on the right edge, a focusable `separator` that also takes
  Arrow keys (Shift for bigger steps), Home and End. The width is in px: seed it with `defaultWidth`, control it with
  `width`, watch it with `onWidthChange` (called when a drag ends, not on each move), or keep it in localStorage with
  `persistKey`. Without `resizable` the width is the `--chat-sidebar-width` CSS variable (default 18rem).
- **Shortcut**: Cmd+B (Ctrl+B off Apple platforms) toggles the sidebar and `SidebarToggle`'s label ends in "(⌘ B)" or
  "(Ctrl B)". `shortcut={false}` turns both off; the texts are the `withShortcut` and `ctrlKey` labels.
- **`SidebarItem`**: `badge` always shows (an unread count; a dot on the rail), `shortcut` shows on hover, `description`
  is a second line, `trailing` holds row actions that appear on hover or focus, `title` sets a tooltip (by default the
  label gets one only when `…` cuts it off), and `data-*` attributes land on the row's `<li>`. Icons are 1rem; set
  `--chat-sidebar-icon-size` (for example `18px`) to change that. Outside the `nav` slot, wrap items in `SidebarList`.
- **`ChatList`** rows take `detail` (quiet text on the right, such as "2h") and `muted` (dimmed, no unread marker).

#### Links and client-side navigation

`SidebarItem` with `href` renders a react-aria `Link`. A plain `href` reloads the page. To navigate inside a
single-page app, wrap it in react-aria's `RouterProvider` once, near the root. This example uses React Router; the same
goes for any router, as `navigate` is the only function it needs. The `ChatList` rows with an `href` use it too.

```tsx
import { RouterProvider } from "react-aria-components";
import { useNavigate } from "react-router";

function Root() {
  const navigate = useNavigate();
  return (
    <RouterProvider navigate={(to) => void navigate(to)}>
      <App />
    </RouterProvider>
  );
}
```

## Core

Import from `agentic-ui-kit/core`. No React; usable on a server.

| Name | What it is |
| --- | --- |
| [`applyEvent`](/reference/api/agentic-ui-kit/core/functions/applyevent/) | Applies one stream event to the message it builds. Pure and immutable: returns the same object when the |
| [`reduceEvents`](/reference/api/agentic-ui-kit/core/functions/reduceevents/) | Builds a message from a full event list, e.g. a stored run or a test fixture. |
| [`estimateTokens`](/reference/api/agentic-ui-kit/core/functions/estimatetokens/) | Rough token count of text, about four characters per token. For live counters, not billing. |
| [`outputTokens`](/reference/api/agentic-ui-kit/core/functions/outputtokens/) | Output tokens of a message so far: the backend's count when it has sent one, else an estimate from |
| [`activityTokens`](/reference/api/agentic-ui-kit/core/functions/activitytokens/) | Tokens the model spent inside an activity group: its reasoning and the tool inputs it wrote. Tool |
| [`resolveEffort`](/reference/api/agentic-ui-kit/core/functions/resolveeffort/) | The effort to send with a model: the chosen one if the model offers it, else the model's default, else |
| [`awaitingToolCalls`](/reference/api/agentic-ui-kit/core/functions/awaitingtoolcalls/) | Tool calls the client has to act on: run them (client tools) or ask the user (approvals). |
| [`settleToolCall`](/reference/api/agentic-ui-kit/core/functions/settletoolcall/) | Sets fields on one tool call locally, e.g. a client tool's result or the user's approval. |
| [`toBlocks`](/reference/api/agentic-ui-kit/core/functions/toblocks/) | Groups a message's parts into display blocks: text, and runs of activity. |
| [`isActivityPart`](/reference/api/agentic-ui-kit/core/functions/isactivitypart/) | True for parts that belong in an activity group (thinking, tool calls). |
| [`readEventStream`](/reference/api/agentic-ui-kit/core/functions/readeventstream/) | Reads a server-sent event stream of `StreamEvent`s. Each SSE message carries one JSON event in `data`; |
| [`formatEvent`](/reference/api/agentic-ui-kit/core/functions/formatevent/) | Formats one event as an SSE message, for servers written in TS. |
| [`parsePartialJson`](/reference/api/agentic-ui-kit/core/functions/parsepartialjson/) | Best-effort value of JSON that is still streaming, so a tool call's fields can show while the model |
| [`salvageJson`](/reference/api/agentic-ui-kit/core/functions/salvagejson/) | JSON as far as it is valid: a stray bracket midway keeps what came before it, instead of losing it all. |

Types: [`Block`](/reference/api/agentic-ui-kit/core/type-aliases/block/), [`ActivityPart`](/reference/api/agentic-ui-kit/core/type-aliases/activitypart/), [`PartType`](/reference/api/agentic-ui-kit/core/type-aliases/parttype/), [`Part`](/reference/api/agentic-ui-kit/core/type-aliases/part/), [`MessageStatus`](/reference/api/agentic-ui-kit/core/type-aliases/messagestatus/), [`StreamEvent`](/reference/api/agentic-ui-kit/core/type-aliases/streamevent/), [`Role`](/reference/api/agentic-ui-kit/core/type-aliases/role/), [`PartStatus`](/reference/api/agentic-ui-kit/core/type-aliases/partstatus/), [`PartEnd`](/reference/api/agentic-ui-kit/core/interfaces/partend/), [`ToolCallPart`](/reference/api/agentic-ui-kit/core/interfaces/toolcallpart/), [`PartUpdate`](/reference/api/agentic-ui-kit/core/interfaces/partupdate/), [`PartFields`](/reference/api/agentic-ui-kit/core/interfaces/partfields/), [`ContextGroup`](/reference/api/agentic-ui-kit/core/interfaces/contextgroup/), [`PartStart`](/reference/api/agentic-ui-kit/core/interfaces/partstart/), [`Usage`](/reference/api/agentic-ui-kit/core/interfaces/usage/), [`RunEnd`](/reference/api/agentic-ui-kit/core/interfaces/runend/), [`CustomPart`](/reference/api/agentic-ui-kit/core/interfaces/custompart/), [`ContextUsage`](/reference/api/agentic-ui-kit/core/interfaces/contextusage/), [`RunUsage`](/reference/api/agentic-ui-kit/core/interfaces/runusage/), [`ContextCategory`](/reference/api/agentic-ui-kit/core/interfaces/contextcategory/), [`TextPart`](/reference/api/agentic-ui-kit/core/interfaces/textpart/), [`EffortLevel`](/reference/api/agentic-ui-kit/core/interfaces/effortlevel/), [`ModelInfo`](/reference/api/agentic-ui-kit/core/interfaces/modelinfo/), [`AttachmentPart`](/reference/api/agentic-ui-kit/core/interfaces/attachmentpart/), [`Message`](/reference/api/agentic-ui-kit/core/interfaces/message/), [`WidgetPart`](/reference/api/agentic-ui-kit/core/interfaces/widgetpart/), [`RunStart`](/reference/api/agentic-ui-kit/core/interfaces/runstart/), [`TitleEvent`](/reference/api/agentic-ui-kit/core/interfaces/titleevent/), [`PartDelta`](/reference/api/agentic-ui-kit/core/interfaces/partdelta/), [`ThinkingPart`](/reference/api/agentic-ui-kit/core/interfaces/thinkingpart/).
