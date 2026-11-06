/*
 * Four layers; each imports only from the layers above it in this file.
 *   Primitives  generic UI, no chat knowledge (a host app can build any screen with them)
 *   Hooks       headless state: the chat, the smooth text reveal, the sidebar
 *   Components  chat pieces with one job each, built from primitives
 *   Views       assemblies that fill a page or pane, mostly slots
 */

// Primitives
export { Button, IconButton } from "./primitives/button";
export type { ButtonProps, IconButtonProps } from "./primitives/button";
export { Badge } from "./primitives/badge";
export type { BadgeProps } from "./primitives/badge";
export { Tooltip } from "./primitives/tooltip";
export type { TooltipProps } from "./primitives/tooltip";
export { CopyButton } from "./primitives/copy-button";
export { SegmentedControl } from "./primitives/segmented-control";
export type { SegmentedControlProps, SegmentedOption } from "./primitives/segmented-control";
export { Caret } from "./primitives/caret";
export { Disclosure } from "./primitives/disclosure";
export type { DisclosureProps } from "./primitives/disclosure";
export { Popover, Menu, MenuItem, MenuSearch, MenuSection, MenuSeparator, MenuNote, MenuTrigger, SubmenuTrigger, DialogTrigger, PopoverTrigger } from "./primitives/menu";
export type { MenuSearchProps, PopoverProps, MenuProps, MenuItemProps, MenuSectionProps } from "./primitives/menu";
export { ContextMenu } from "./primitives/context-menu";
export type { ContextMenuProps } from "./primitives/context-menu";
export { Modal, Drawer } from "./primitives/overlay";
export type { ModalProps, DrawerProps } from "./primitives/overlay";
export { Panel } from "./primitives/panel";
export type { PanelProps } from "./primitives/panel";
export { CodeBlock } from "./primitives/code-block";
export type { CodeBlockProps } from "./primitives/code-block";
export { ChatTheme } from "./primitives/chat-theme";
export type { ChatThemeProps } from "./primitives/chat-theme";
export { defaultLabels, useLabels } from "./primitives/labels";
export type { ChatLabels } from "./primitives/labels";
export { defaultIcons, useIcons } from "./primitives/icons";
export type { ChatIcons } from "./primitives/icons";
export type { CodeThemes, ChatMotion } from "./primitives/appearance";

// Hooks
export { useChat, userMessage } from "./hooks/use-chat";
export type { Transport, SendRequest, SendOptions, UseChat, UseChatOptions, PendingApproval, PendingPrompt } from "./hooks/use-chat";
export { sseTransport, type SseTransportOptions, type SseRequestBody } from "./hooks/sse-transport";
export { agUiTransport, type AgUiTransportOptions } from "./hooks/ag-ui-transport";
export { AgentProvider, AgentRegistry, useAgentRegistry, useAgentSnapshot, useAgentTool, useAgentContext } from "./hooks/agent";
export type { AgentTool, ToolContext, ToolSpec, JsonSchema } from "./hooks/agent";
export { useSmoothText } from "./hooks/smooth-text";
export { useSidebar, useMediaQuery, DRAWER_QUERY } from "./hooks/sidebar-state";
export type { SidebarState } from "./hooks/sidebar-state";

// Components: a message
export { UserMessage, AssistantMessage, formatRelativeTime, messageText } from "./components/messages";
export type { UserMessageProps, AssistantMessageProps, Feedback, MessageActions } from "./components/messages";
export { Markdown, MarkdownLinksProvider } from "./components/markdown";
export type { LinkList, MarkdownProps, RenderImage, RenderLink, RenderLinkList } from "./components/markdown";
export { ActivityGroup } from "./components/activity-group";
export type { ActivityGroupProps } from "./components/activity-group";
export {
  ToolViewsProvider,
  useToolView,
  useToolViews,
  activityLabel,
  activityHeading,
  commandTool,
  webSearchTool,
  webFetchTool,
  memoryTool,
  defaultToolViews,
  formatDuration,
  useChatTool,
} from "./components/tools";
export type { ToolView, ToolViews, ToolPromptProps, SearchResult, ChatTool } from "./components/tools";
export { ChatExtensionsProvider, useChatExtensions, ChatInteractionProvider, useChatInteraction } from "./components/extensions";
export type { ChatExtensions, CodeBlockRendererProps, ToolCallGroups, ChatInteraction } from "./components/extensions";
export { AskUserPrompt, AskUserAnswers, askUserToolView } from "./components/ask-user";
export { ToolPromptCard } from "./components/tool-prompt";
export type { ToolPromptCardProps } from "./components/tool-prompt";
export { ApprovalCard } from "./components/approval-card";
export type { ApprovalCardProps } from "./components/approval-card";
export { TokenCounter, useCountUp, formatTokens } from "./components/token-counter";
export type { TokenCounterProps } from "./components/token-counter";
export { ContextPanel } from "./components/context-panel";
export type { ContextPanelProps } from "./components/context-panel";
export { ContextMeter } from "./components/context-meter";
export type { ContextMeterProps } from "./components/context-meter";
export { CopyField } from "./components/copy-field";
export type { CopyFieldProps } from "./components/copy-field";

// Components: input
export { Composer, AttachButton } from "./components/composer";
export { DictationButton, DictationControls, VoiceMeter, encodeWav, useDictation } from "./components/dictation";
export type { Dictation, DictationButtonProps, DictationState, UseDictationOptions, VoiceMeterProps } from "./components/dictation";
export { EffortSlider, EffortButton } from "./components/effort-slider";
export type { EffortSliderProps, EffortButtonProps } from "./components/effort-slider";
export type { ComposerProps, AttachButtonProps } from "./components/composer";
export { ModelPicker } from "./components/model-picker";
export type { ModelOption, ModelPickerProps } from "./components/model-picker";
export { useAttachments, AttachmentCard, AttachmentRow, PastedTextDialog } from "./components/attachments";
export type {
  DraftAttachment,
  UploadResult,
  UseAttachments,
  UseAttachmentsOptions,
  AttachmentCardData,
  AttachmentCardProps,
  AttachmentRowProps,
  PastedTextDialogProps,
} from "./components/attachments";

// Components: around the conversation
export { MessageList } from "./components/message-list";
export type { MessageListProps } from "./components/message-list";
export { ChatHeader, ChatTitleMenu } from "./components/chat-header";
export type { ChatHeaderProps, ChatTitleMenuProps } from "./components/chat-header";
export { ChatNotice } from "./components/chat-notice";
export type { ChatNoticeProps } from "./components/chat-notice";
export { ChatList, ChatListRailButton } from "./components/chat-list";
export type { ChatListRailButtonProps, ChatListProps, ChatListSection, ChatListItem, ChatSummary, ProjectSummary } from "./components/chat-list";

// Views
export { ChatView, EmptyState } from "./views/chat-view";
export type { ChatViewProps, EmptyStateProps, Density } from "./views/chat-view";
export { ChatTranscript } from "./views/chat-transcript";
export type { ChatTranscriptProps } from "./views/chat-transcript";
export { AppShell, SidebarToggle } from "./views/app-shell";
export type { AppShellProps, SidebarToggleProps } from "./views/app-shell";
export { Sidebar, SidebarItem, SidebarList, SidebarUser } from "./views/sidebar";
export type { SidebarProps, SidebarItemProps, SidebarListProps, SidebarUserProps } from "./views/sidebar";
