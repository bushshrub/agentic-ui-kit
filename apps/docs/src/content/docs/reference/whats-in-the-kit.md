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
| [`WidgetFrame`](/reference/api/agentic-ui-kit/functions/widgetframe/) | Sandboxed iframe that runs model-written HTML. |
| [`WidgetHostProvider`](/reference/api/agentic-ui-kit/functions/widgethostprovider/) | Sets what widgets below may do. ChatView and ChatTranscript set it from their `widgets` prop. |
| [`useWidgetHost`](/reference/api/agentic-ui-kit/functions/usewidgethost/) | The WidgetHost from the nearest WidgetHostProvider. |
| [`WidgetPartView`](/reference/api/agentic-ui-kit/functions/widgetpartview/) | The default look of a `widget` part: inline html, or an app UI the host reads from `resourceUri`. |
| [`widgetToolView`](/reference/api/agentic-ui-kit/functions/widgettoolview/) | A tool view that draws a call's (streaming) input in a WidgetFrame, for whatever tool your harness uses |
| [`readVisualizeInput`](/reference/api/agentic-ui-kit/functions/readvisualizeinput/) | Reads the fields of the suggested `visualizeTool` (widget_code, title, loading_messages). |
| [`widgetCsp`](/reference/api/agentic-ui-kit/functions/widgetcsp/) | The Content-Security-Policy of a widget's document. |
| [`intersectAllow`](/reference/api/agentic-ui-kit/functions/intersectallow/) | The part of a widget's request that the host allows. |
| [`openInNewTab`](/reference/api/agentic-ui-kit/functions/openinnewtab/) | The default `onOpenLink` of ChatView and ChatTranscript: a new tab with no opener. |
| [`WIDGET_MAX_HEIGHT`](/reference/api/agentic-ui-kit/variables/widget_max_height/) | The tallest a widget may grow, in px. |
| [`UiComponentsProvider`](/reference/api/agentic-ui-kit/functions/uicomponentsprovider/) | The components the model may use: in ```ui blocks of its replies (see `uiMarkupGuide` in |
| [`UiTree`](/reference/api/agentic-ui-kit/functions/uitree/) | Draws a `render_ui` tree with the registered components. Unknown components and bad props render nothing. |
| [`UiMarkupBlock`](/reference/api/agentic-ui-kit/functions/uimarkupblock/) | A ```ui block from a reply, drawn with the registered components. Safe on a block that is still streaming. |
| [`useUiMarkupLanguage`](/reference/api/agentic-ui-kit/functions/useuimarkuplanguage/) | The fence language drawn as UI here, or undefined outside a `UiComponentsProvider`. |
| [`useUiAction`](/reference/api/agentic-ui-kit/functions/useuiaction/) | Inside a registered component: runs an action from its props, e.g. `run(props.onPress)`. Bad actions do nothing. |
| [`useUiState`](/reference/api/agentic-ui-kit/functions/useuistate/) | Inside a registered component: the widget's state and a setter, for inputs that write to it. |
| [`htmlComponent`](/reference/api/agentic-ui-kit/variables/htmlcomponent/) | The escape hatch: raw HTML or SVG in a sandboxed WidgetFrame, as a node of the tree. Register it only if |
| [`uiTreeToolView`](/reference/api/agentic-ui-kit/functions/uitreetoolview/) | A tool view that draws a call's (streaming) input as a tree of your registered components, for whatever |
| [`uiMarkupToolView`](/reference/api/agentic-ui-kit/functions/uimarkuptoolview/) | A tool view that draws a call's (streaming) JSX markup with your registered components, for whatever tool |
| [`readTreeInput`](/reference/api/agentic-ui-kit/functions/readtreeinput/) | Reads `{ root, state }`. Models sometimes send `root` or `state` as a JSON string; those are parsed too. |
| [`ApprovalCard`](/reference/api/agentic-ui-kit/functions/approvalcard/) | Asks the user before a tool runs, above the composer. Shows the tool's label and what it will do: its |
| [`TokenCounter`](/reference/api/agentic-ui-kit/functions/tokencounter/) | A token count that counts up as `tokens` grows and holds still when it stops growing. |
| [`useCountUp`](/reference/api/agentic-ui-kit/functions/usecountup/) | Follows `target` with a number that counts up smoothly instead of jumping. Each frame closes part of the |
| [`formatTokens`](/reference/api/agentic-ui-kit/functions/formattokens/) | Compact token count: 526, 1.4k, 33k, 76.8k, 1M. |
| [`ContextPanel`](/reference/api/agentic-ui-kit/functions/contextpanel/) | What fills the context window: a usage line, a segmented bar, one row per category with its share, and |
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

Types: [`UserMessageProps`](/reference/api/agentic-ui-kit/interfaces/usermessageprops/), [`AssistantMessageProps`](/reference/api/agentic-ui-kit/interfaces/assistantmessageprops/), [`Feedback`](/reference/api/agentic-ui-kit/type-aliases/feedback/), [`MarkdownProps`](/reference/api/agentic-ui-kit/interfaces/markdownprops/), [`RenderLink`](/reference/api/agentic-ui-kit/type-aliases/renderlink/), [`ActivityGroupProps`](/reference/api/agentic-ui-kit/interfaces/activitygroupprops/), [`ToolView`](/reference/api/agentic-ui-kit/interfaces/toolview/), [`ToolViews`](/reference/api/agentic-ui-kit/type-aliases/toolviews/), [`SearchResult`](/reference/api/agentic-ui-kit/interfaces/searchresult/), [`ChatTool`](/reference/api/agentic-ui-kit/interfaces/chattool/), [`WidgetFrameProps`](/reference/api/agentic-ui-kit/interfaces/widgetframeprops/), [`WidgetToolInput`](/reference/api/agentic-ui-kit/interfaces/widgettoolinput/), [`WidgetHost`](/reference/api/agentic-ui-kit/interfaces/widgethost/), [`WidgetAllow`](/reference/api/agentic-ui-kit/interfaces/widgetallow/), [`WidgetResource`](/reference/api/agentic-ui-kit/interfaces/widgetresource/), [`UiComponent`](/reference/api/agentic-ui-kit/interfaces/uicomponent/), [`UiStateStore`](/reference/api/agentic-ui-kit/interfaces/uistatestore/), [`UiTreeProps`](/reference/api/agentic-ui-kit/interfaces/uitreeprops/), [`ApprovalCardProps`](/reference/api/agentic-ui-kit/interfaces/approvalcardprops/), [`TokenCounterProps`](/reference/api/agentic-ui-kit/interfaces/tokencounterprops/), [`ContextPanelProps`](/reference/api/agentic-ui-kit/interfaces/contextpanelprops/), [`ComposerProps`](/reference/api/agentic-ui-kit/interfaces/composerprops/), [`AttachButtonProps`](/reference/api/agentic-ui-kit/interfaces/attachbuttonprops/), [`ModelPickerProps`](/reference/api/agentic-ui-kit/interfaces/modelpickerprops/), [`DraftAttachment`](/reference/api/agentic-ui-kit/interfaces/draftattachment/), [`UploadResult`](/reference/api/agentic-ui-kit/interfaces/uploadresult/), [`UseAttachments`](/reference/api/agentic-ui-kit/functions/useattachments/), [`UseAttachmentsOptions`](/reference/api/agentic-ui-kit/interfaces/useattachmentsoptions/), [`AttachmentCardData`](/reference/api/agentic-ui-kit/interfaces/attachmentcarddata/), [`AttachmentCardProps`](/reference/api/agentic-ui-kit/interfaces/attachmentcardprops/), [`AttachmentRowProps`](/reference/api/agentic-ui-kit/interfaces/attachmentrowprops/), [`PastedTextDialogProps`](/reference/api/agentic-ui-kit/interfaces/pastedtextdialogprops/), [`MessageListProps`](/reference/api/agentic-ui-kit/interfaces/messagelistprops/), [`ChatHeaderProps`](/reference/api/agentic-ui-kit/interfaces/chatheaderprops/), [`ChatTitleMenuProps`](/reference/api/agentic-ui-kit/interfaces/chattitlemenuprops/), [`ChatNoticeProps`](/reference/api/agentic-ui-kit/interfaces/chatnoticeprops/), [`ChatListProps`](/reference/api/agentic-ui-kit/interfaces/chatlistprops/), [`ChatListSection`](/reference/api/agentic-ui-kit/interfaces/chatlistsection/), [`ChatListItem`](/reference/api/agentic-ui-kit/type-aliases/chatlistitem/), [`ChatSummary`](/reference/api/agentic-ui-kit/interfaces/chatsummary/), [`ProjectSummary`](/reference/api/agentic-ui-kit/interfaces/projectsummary/).

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
| [`SidebarUser`](/reference/api/agentic-ui-kit/functions/sidebaruser/) | The account row at the bottom: avatar, name, plan, and a menu. |

Types: [`ChatViewProps`](/reference/api/agentic-ui-kit/interfaces/chatviewprops/), [`EmptyStateProps`](/reference/api/agentic-ui-kit/interfaces/emptystateprops/), [`Density`](/reference/api/agentic-ui-kit/type-aliases/density/), [`ChatTranscriptProps`](/reference/api/agentic-ui-kit/interfaces/chattranscriptprops/), [`AppShellProps`](/reference/api/agentic-ui-kit/interfaces/appshellprops/), [`SidebarToggleProps`](/reference/api/agentic-ui-kit/interfaces/sidebartoggleprops/), [`SidebarProps`](/reference/api/agentic-ui-kit/interfaces/sidebarprops/), [`SidebarItemProps`](/reference/api/agentic-ui-kit/interfaces/sidebaritemprops/), [`SidebarUserProps`](/reference/api/agentic-ui-kit/interfaces/sidebaruserprops/).

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
| [`visualizeTool`](/reference/api/agentic-ui-kit/core/variables/visualizetool/) | The tool definition to give the model. Same shape as a page tool's `ToolSpec`. |
| [`visualizeGuide`](/reference/api/agentic-ui-kit/core/variables/visualizeguide/) | Design guide for the system prompt when the visualize tool is on. |
| [`checkWidgetCode`](/reference/api/agentic-ui-kit/core/functions/checkwidgetcode/) | Checks widget code before it reaches the user, so a harness can send problems back to the model as the |
| [`matchesSchema`](/reference/api/agentic-ui-kit/core/functions/matchesschema/) | Whether `value` fits `schema`; see `schemaErrors` for why not. |
| [`schemaErrors`](/reference/api/agentic-ui-kit/core/functions/schemaerrors/) | Why `value` doesn't fit `schema`, one line per problem, each starting with its path ("props.items[2].label"). |
| [`checkUiTree`](/reference/api/agentic-ui-kit/core/functions/checkuitree/) | Validates a UiNode tree against component specs; returns the errors. |
| [`isStateRef`](/reference/api/agentic-ui-kit/core/functions/isstateref/) | A prop that reads the widget's state: `{ "$state": "tab" }`. |
| [`renderUiTool`](/reference/api/agentic-ui-kit/core/functions/renderuitool/) | The render tool for these components, with a description generated from them. |
| [`renderUiToolName`](/reference/api/agentic-ui-kit/core/variables/renderuitoolname/) | The tool name of renderUiTool. |
| [`uiActionSchema`](/reference/api/agentic-ui-kit/core/variables/uiactionschema/) | Schema for a prop that holds an action, e.g. `{ onPress: uiActionSchema }`. |
| [`parseUiMarkup`](/reference/api/agentic-ui-kit/core/functions/parseuimarkup/) | Parses UI markup (the inside of a ```ui block). Safe on any prefix of it. |
| [`readUiValue`](/reference/api/agentic-ui-kit/core/functions/readuivalue/) | Reads a value written inside `{…}`: JSON, or a JS literal (unquoted keys, single quotes, trailing commas). |
| [`findUiBlocks`](/reference/api/agentic-ui-kit/core/functions/finduiblocks/) | Finds the ```ui blocks in reply text (the last may still be open while it streams). |
| [`checkUiMarkup`](/reference/api/agentic-ui-kit/core/functions/checkuimarkup/) | Checks the ```ui blocks in a finished reply against the host's components, so the harness can tell the |
| [`checkUiMarkupCode`](/reference/api/agentic-ui-kit/core/functions/checkuimarkupcode/) | Checks the markup of one UI tool call. Its `feedback` is the tool result to return: "Shown to the user." or |
| [`showUiTool`](/reference/api/agentic-ui-kit/core/functions/showuitool/) | A suggested tool for drawing UI from your components: the model passes JSX as a string, which streams |
| [`showUiToolName`](/reference/api/agentic-ui-kit/core/variables/showuitoolname/) | The suggested UI tool's name. |
| [`uiMarkupGuide`](/reference/api/agentic-ui-kit/core/functions/uimarkupguide/) | A suggested system-prompt section that teaches the model to write ```ui blocks in its reply text, if you'd |
| [`uiMarkupLanguage`](/reference/api/agentic-ui-kit/core/variables/uimarkuplanguage/) | The fence language the kit draws as UI. |

Types: [`Block`](/reference/api/agentic-ui-kit/core/type-aliases/block/), [`ActivityPart`](/reference/api/agentic-ui-kit/core/type-aliases/activitypart/), [`VisualizeInput`](/reference/api/agentic-ui-kit/core/interfaces/visualizeinput/), [`WidgetCodeCheck`](/reference/api/agentic-ui-kit/core/interfaces/widgetcodecheck/), [`UiNode`](/reference/api/agentic-ui-kit/core/interfaces/uinode/), [`UiAction`](/reference/api/agentic-ui-kit/core/type-aliases/uiaction/), [`RenderUiInput`](/reference/api/agentic-ui-kit/core/interfaces/renderuiinput/), [`UiComponentSpec`](/reference/api/agentic-ui-kit/core/interfaces/uicomponentspec/), [`UiTreeCheck`](/reference/api/agentic-ui-kit/core/interfaces/uitreecheck/), [`UiMarkup`](/reference/api/agentic-ui-kit/core/interfaces/uimarkup/), [`UiMarkupBlock`](/reference/api/agentic-ui-kit/core/interfaces/uimarkupblock/), [`UiMarkupCheck`](/reference/api/agentic-ui-kit/core/interfaces/uimarkupcheck/), [`ShowUiInput`](/reference/api/agentic-ui-kit/core/interfaces/showuiinput/), [`UiTreeCheckOptions`](/reference/api/agentic-ui-kit/core/interfaces/uitreecheckoptions/), [`PartType`](/reference/api/agentic-ui-kit/core/type-aliases/parttype/), [`Part`](/reference/api/agentic-ui-kit/core/type-aliases/part/), [`MessageStatus`](/reference/api/agentic-ui-kit/core/type-aliases/messagestatus/), [`StreamEvent`](/reference/api/agentic-ui-kit/core/type-aliases/streamevent/), [`Role`](/reference/api/agentic-ui-kit/core/type-aliases/role/), [`PartStatus`](/reference/api/agentic-ui-kit/core/type-aliases/partstatus/), [`PartEnd`](/reference/api/agentic-ui-kit/core/interfaces/partend/), [`ToolCallPart`](/reference/api/agentic-ui-kit/core/interfaces/toolcallpart/), [`PartUpdate`](/reference/api/agentic-ui-kit/core/interfaces/partupdate/), [`PartFields`](/reference/api/agentic-ui-kit/core/interfaces/partfields/), [`ContextGroup`](/reference/api/agentic-ui-kit/core/interfaces/contextgroup/), [`PartStart`](/reference/api/agentic-ui-kit/core/interfaces/partstart/), [`Usage`](/reference/api/agentic-ui-kit/core/interfaces/usage/), [`RunEnd`](/reference/api/agentic-ui-kit/core/interfaces/runend/), [`CustomPart`](/reference/api/agentic-ui-kit/core/interfaces/custompart/), [`ContextUsage`](/reference/api/agentic-ui-kit/core/interfaces/contextusage/), [`RunUsage`](/reference/api/agentic-ui-kit/core/interfaces/runusage/), [`ContextCategory`](/reference/api/agentic-ui-kit/core/interfaces/contextcategory/), [`TextPart`](/reference/api/agentic-ui-kit/core/interfaces/textpart/), [`EffortLevel`](/reference/api/agentic-ui-kit/core/interfaces/effortlevel/), [`ModelInfo`](/reference/api/agentic-ui-kit/core/interfaces/modelinfo/), [`AttachmentPart`](/reference/api/agentic-ui-kit/core/interfaces/attachmentpart/), [`Message`](/reference/api/agentic-ui-kit/core/interfaces/message/), [`WidgetPart`](/reference/api/agentic-ui-kit/core/interfaces/widgetpart/), [`RunStart`](/reference/api/agentic-ui-kit/core/interfaces/runstart/), [`TitleEvent`](/reference/api/agentic-ui-kit/core/interfaces/titleevent/), [`PartDelta`](/reference/api/agentic-ui-kit/core/interfaces/partdelta/), [`ThinkingPart`](/reference/api/agentic-ui-kit/core/interfaces/thinkingpart/).
