import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Every string the kit shows (visible text, aria-labels, placeholders, tooltips), so a host can reword or
 * translate the UI. Set through `ChatTheme labels={{ copy: "Copier" }}`; keys left out keep the English
 * default. Keys that take values are functions.
 */
export interface ChatLabels {
  /** BCP 47 tag for dates and relative times ("fr", "de-CH"). Default: the browser's locale. */
  locale?: string | undefined;

  // Activity: thinking and tool calls
  /** Row label while the model is thinking. */
  thinking: string;
  /** Row label for finished thinking without a duration. */
  thought: string;
  /** Row label for finished thinking; `duration` is already formatted by `duration`. */
  thoughtFor: (duration: string) => string;
  /** Appended to the heading of a group that waits for the user, including its separator. */
  waitingForYou: string;
  /** Heading phrase for a tool without a view of its own, lowercase. */
  usedTool: (name: string) => string;
  /** Joins the heading phrases of a finished group. Default joins with ", " and capitalizes the first letter. */
  joinSummaries: (phrases: string[]) => string;
  /** "9s", "1m 5s": a duration in whole seconds. */
  duration: (seconds: number) => string;
  /** Row label of the command tool. */
  ranCommandLabel: string;
  /** Heading phrase for command calls, lowercase: "ran a command", "ran 3 commands". */
  ranCommands: (count: number) => string;
  /** Approval question for the command tool, present tense. */
  runCommandAsk: string;
  /** Approval question for the web search tool. */
  searchWebAsk: string;
  /** Approval question for the page fetch tool. */
  readPageAsk: string;
  /** Row label of the web search tool. */
  searchedWebLabel: string;
  readPageLabel: string;
  readPages: (count: number) => string;
  /** Heading phrase for web searches, lowercase. */
  searchedWeb: (count: number) => string;
  /** Row label of the memory tool. */
  recalledMemoryLabel: string;
  /** Heading phrase for memory lookups, lowercase. */
  recalledMemory: (count: number) => string;
  /** Title of a command's output block. */
  output: string;
  /** Command output block when the command printed nothing. */
  noOutput: string;
  /** Web search detail without results. */
  noResults: string;
  /** Thinking detail when the model's reasoning is hidden. */
  reasoningHidden: string;

  // Approvals
  /** Accessible name of the approval dialog. */
  allowTool: (name: string) => string;
  /** The approval question for a tool without its own `ask`; `label` is the tool's row label. */
  allowAction: (label: ReactNode) => ReactNode;
  /** Approve button. */
  allow: string;
  /** Decline button. */
  deny: string;

  // Sidebar and shell
  /** Accessible name of the sidebar drawer. */
  sidebar: string;
  /** Sidebar toggle, drawer open. */
  closeSidebar: string;
  /** Sidebar toggle, drawer closed. */
  openSidebar: string;
  /** Sidebar toggle, rail. */
  expandSidebar: string;
  /** Sidebar toggle, full width. */
  collapseSidebar: string;
  /** Accessible name of the sidebar's resize handle. */
  resizeSidebar: string;
  /** A label with its keyboard shortcut, e.g. "Collapse sidebar (⌘ B)". */
  withShortcut: (label: string, keys: string) => string;
  /** The Ctrl key's name in shortcut hints (non-Mac). */
  ctrlKey: string;

  // Context panel and tokens
  /** Default title of the context panel. */
  context: string;
  /** Accessible name of the usage meter. */
  contextUsed: string;
  /** "42% used". */
  percentUsed: (percent: number) => string;
  /** Context meter summary, also its accessible name: "Context: 13.8k / 200k (7%)". */
  contextSummary: (used: string, limit: string, percent: number) => string;
  /** Context meter while the numbers are still loading. */
  contextLoading: string;
  /** Row for the unused part of the window. */
  freeSpace: string;
  /** "1.2k tokens"; `count` is already formatted. */
  tokenCount: (count: string) => string;

  // Composer
  /** Composer placeholder. */
  replyPlaceholder: string;
  /** Composer placeholder while a tool waits for approval. */
  replyDirectly: string;
  // Ask-user prompt (the model's questions) and its answers card
  /** Accessible name of the question prompt over the composer. */
  askUserPrompt: string;
  /** Pager in the prompt: "1 of 3". */
  askUserPager: (current: number, total: number) => string;
  /** Pager button to the previous question. */
  askUserPrevious: string;
  /** Pager button to the next question. */
  askUserNext: string;
  /** Button that moves on to the next unanswered question. */
  askUserContinue: string;
  /** Button on the last question, which sends the answers. */
  askUserSubmit: string;
  /** Close button of the prompt; declines the questions like replying in the composer does. */
  askUserClose: string;
  /** The free-text row (and its input's name) under each choice question. */
  askUserSomethingElse: string;
  /** Skips the current question. */
  askUserSkip: string;
  /** Count under a multiple-choice question: "2 selected". */
  askUserSelected: (count: number) => string;
  /** Hint under a rank question. */
  askUserRankHint: string;
  /** Accessible name of a rank row's drag handle. */
  askUserReorder: (option: string) => string;
  /** Spoken description of the keyboard way to reorder a rank row. */
  askUserReorderKeys: string;
  /** Answers card: the options a user picked in a multiple-choice question. */
  askUserPicked: (options: string[]) => string;
  /** Answers card: a rank answer, e.g. "Ranked: 1. Fast 2. Cheap". */
  askUserRanked: (options: string[]) => string;
  /** Answers card: a question the user skipped. */
  askUserSkipped: string;
  /** Answers card: the user closed the prompt or replied instead. */
  askUserDeclined: string;
  /** Accessible name of the answers card. */
  askUserAnswers: string;
  /** Accessible name of the composer text box. */
  message: string;
  /** Stop button. */
  stop: string;
  /** Send button. */
  send: string;
  /** Composer placeholder while dictating. */
  listening: string;
  /** Composer placeholder while the last words are transcribed. */
  transcribing: string;
  /** The mic button. */
  dictate: string;
  /** Dictation's cancel button. */
  dictationCancel: string;
  /** Dictation's accept button. */
  dictationAccept: string;
  /** The `+` button of the composer. */
  addFiles: string;

  // Attachments
  /** Accessible name of an attachment list. */
  attachments: string;
  /** Button on a pasted-text card. */
  editPastedText: string;
  /** Overlay button on a read-only pasted-text card. */
  viewPastedText: string;
  /** Remove button of an attachment card. */
  removeAttachment: (name: string) => string;
  /** Dialog title, and the name given to pasted text. */
  pastedText: string;
  /** Badge on a pasted-text card. */
  pasted: string;
  /** Badge on a failed card. */
  failed: string;
  /** Badge on a card whose file has no extension. */
  file: string;
  /** Tooltip of a failed card without an error message. */
  uploadFailed: string;
  /** Dialog button. */
  cancel: string;
  /** Dialog button. */
  close: string;
  /** Dialog button. */
  save: string;

  // Chat list
  /** Accessible name of the chat list. */
  chats: string;
  /** Marker on a running chat. */
  running: string;
  /** Marker on an unread chat. */
  unread: string;
  /** Row menu button of a chat. */
  moreOptionsFor: (title: string) => string;
  /** Badge on a collapsed project with new activity. */
  new: string;
  /** Button under a chat list section. */
  viewAll: string;

  // Chat header menu
  /** Accessible name of the title menu. */
  chatActions: string;
  /** Menu item. */
  pin: string;
  /** Menu item. */
  unpin: string;
  /** Menu item. */
  rename: string;
  /** Menu item. */
  addToProject: string;
  /** Search box of the project submenu. */
  searchProjects: string;
  /** Accessible name of the project list. */
  projects: string;
  /** Menu item. */
  newProject: string;
  /** Menu item. */
  shareChat: string;
  /** Menu item. */
  delete: string;

  // Messages
  /** Relative time under a minute. */
  justNow: string;
  /** Copy button. */
  copy: string;
  /** Copy button right after copying. */
  copied: string;
  /** Accessible name of a copy field's read-only input. */
  copyFieldLabel: string;
  /** Retry button. */
  retry: string;
  /** Edit button. */
  edit: string;
  /** Read aloud button. */
  readAloud: string;
  /** Feedback button. */
  goodResponse: string;
  /** Feedback button. */
  badResponse: string;
  /** Shown under a failed message without an error text. */
  somethingWentWrong: string;
  /** Accessible name of the message log. */
  conversation: string;
  /** Button that jumps to the newest message. */
  scrollToBottom: string;
  /** Unfolds a long user message. */
  showMore: string;
  /** Folds it again. */
  showLess: string;

  // Model picker
  /** Accessible name of the model menu. */
  model: string;
  /** Accessible name of the model button; `label` is the current model. */
  modelButton: (label: string) => string;
  /** Effort submenu item and list name. */
  effort: string;
  /** Note above the effort list. */
  effortNote: string;
  /** Badge on the recommended effort. */
  recommended: string;
  /** Ends of the effort slider. */
  effortFaster: string;
  effortSmarter: string;
  /** Submenu item and list name. */
  moreModels: string;

  // Inline visuals
  /** Accessible name of a widget without a title. */
  widget: string;
  /** Link left where a visual was, once a later reply updated it. */
  visualUpdated: string;
  /** Under a visual while its update streams. */
  visualUpdating: string;
  /** Loading line while a widget streams and the model gave none. */
  drawingWidget: string;
}

const plural = (count: number, one: string, many: (n: number) => string) => (count === 1 ? one : many(count));

/** The English strings. */
export const defaultLabels: ChatLabels = {
  thinking: "Thinking…",
  thought: "Thought",
  thoughtFor: (duration) => `Thought for ${duration}`,
  waitingForYou: " · waiting for you",
  usedTool: (name) => `used ${name}`,
  joinSummaries: (phrases) => {
    const text = phrases.join(", ");
    return text.charAt(0).toUpperCase() + text.slice(1);
  },
  duration: (seconds) => (seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`),
  ranCommandLabel: "Ran a command",
  ranCommands: (count) => plural(count, "ran a command", (n) => `ran ${n} commands`),
  runCommandAsk: "Run this command?",
  searchWebAsk: "Search the web?",
  readPageAsk: "Read this page?",
  searchedWebLabel: "Searched the web",
  readPageLabel: "Read page",
  readPages: (count) => plural(count, "read a page", (n) => `read ${n} pages`),
  searchedWeb: (count) => plural(count, "searched the web", (n) => `searched the web ${n} times`),
  recalledMemoryLabel: "Recalled memory",
  recalledMemory: () => "recalled memory",
  output: "Output",
  noOutput: "(no output)",
  noResults: "No results",
  reasoningHidden: "The model's reasoning is not shown.",

  allowTool: (name) => `Allow ${name}?`,
  allowAction: (label) => <>Allow {label}?</>,
  allow: "Allow",
  deny: "Deny",

  sidebar: "Sidebar",
  closeSidebar: "Close sidebar",
  openSidebar: "Open sidebar",
  expandSidebar: "Expand sidebar",
  collapseSidebar: "Collapse sidebar",
  resizeSidebar: "Resize sidebar",
  withShortcut: (label, keys) => `${label} (${keys})`,
  ctrlKey: "Ctrl",

  context: "Context",
  contextUsed: "Context used",
  percentUsed: (percent) => `${percent}% used`,
  contextSummary: (used, limit, percent) => `Context: ${used} / ${limit} (${percent}%)`,
  contextLoading: "Context: loading",
  freeSpace: "Free space",
  tokenCount: (count) => `${count} tokens`,

  replyPlaceholder: "Reply…",
  replyDirectly: "Or reply directly…",
  askUserPrompt: "Question for you",
  askUserPager: (current, total) => `${current} of ${total}`,
  askUserPrevious: "Previous question",
  askUserNext: "Next question",
  askUserContinue: "Continue",
  askUserSubmit: "Send answers",
  askUserClose: "Close and decline",
  askUserSomethingElse: "Something else",
  askUserSkip: "Skip",
  askUserSelected: (count) => `${count} selected`,
  askUserRankHint: "Drag to re-order",
  askUserReorder: (option) => `Move ${option}`,
  askUserReorderKeys: "Press Alt with the up or down arrow to move",
  askUserPicked: (options) => options.join(", "),
  askUserRanked: (options) => `Ranked: ${options.map((o, i) => `${i + 1}. ${o}`).join(" ")}`,
  askUserSkipped: "Skipped",
  askUserDeclined: "You declined to answer",
  askUserAnswers: "Your answers",
  message: "Message",
  stop: "Stop",
  send: "Send",
  listening: "Listening…",
  transcribing: "Transcribing…",
  dictate: "Dictate",
  dictationCancel: "Cancel dictation",
  dictationAccept: "Use dictation",
  addFiles: "Add files and more",

  attachments: "Attachments",
  editPastedText: "Edit pasted text",
  viewPastedText: "View pasted text",
  removeAttachment: (name) => `Remove ${name}`,
  pastedText: "Pasted text",
  pasted: "Pasted",
  failed: "Failed",
  file: "File",
  uploadFailed: "Upload failed",
  cancel: "Cancel",
  close: "Close",
  save: "Save",

  chats: "Chats",
  running: "Running",
  unread: "Unread",
  moreOptionsFor: (title) => `More options for ${title}`,
  new: "New",
  viewAll: "View all",

  chatActions: "Chat actions",
  pin: "Pin",
  unpin: "Unpin",
  rename: "Rename",
  addToProject: "Add to project",
  searchProjects: "Search or create a project",
  projects: "Projects",
  newProject: "New project",
  shareChat: "Share chat",
  delete: "Delete",

  justNow: "just now",
  copy: "Copy",
  copied: "Copied",
  copyFieldLabel: "Link",
  retry: "Retry",
  edit: "Edit",
  readAloud: "Read aloud",
  goodResponse: "Good response",
  badResponse: "Bad response",
  somethingWentWrong: "Something went wrong.",
  conversation: "Conversation",
  scrollToBottom: "Scroll to bottom",
  showMore: "Show more",
  showLess: "Show less",

  model: "Model",
  modelButton: (label) => `Model: ${label}`,
  effort: "Effort",
  effortNote: "Higher effort means more thorough responses, but takes longer and uses your limits faster.",
  recommended: "Recommended",
  effortFaster: "Faster",
  effortSmarter: "Smarter",
  moreModels: "More models",

  widget: "Widget",
  visualUpdated: "Updated below ↓",
  visualUpdating: "Updating…",
  drawingWidget: "Drawing",
};

const LabelsContext = createContext<ChatLabels>(defaultLabels);

/** Merges `labels` over the labels of the enclosing provider (or the defaults). */
export function LabelsProvider({ labels, children }: { labels: Partial<ChatLabels> | undefined; children: ReactNode }) {
  const parent = useLabels();
  const merged = useMemo(() => (labels ? { ...parent, ...labels } : parent), [parent, labels]);
  return <LabelsContext.Provider value={merged}>{children}</LabelsContext.Provider>;
}

/** The active UI strings: the enclosing `ChatTheme`'s `labels` over the English defaults. */
export function useLabels(): ChatLabels {
  return useContext(LabelsContext);
}
