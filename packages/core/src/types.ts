export type Role = "user" | "assistant";

export type MessageStatus = "streaming" | "done" | "stopped" | "error";

/**
 * Status of a single part. Tool calls go input -> running -> done | error; other parts go streaming -> done.
 * A tool call is "awaiting" when the run ended waiting on the client: to run a client tool, or for the
 * user to approve a tool (see ToolCallPart).
 */
export type PartStatus = "streaming" | "input" | "awaiting" | "running" | "done" | "error";

export interface TextPart {
  type: "text";
  id: string;
  text: string;
  status: PartStatus;
}

/**
 * Model reasoning. `title` is the short line shown collapsed ("Deriving the rejection region...").
 * `visibility` says what `text` holds: the model's full reasoning, a summary of it, or nothing because the
 * provider hides it (only the duration is known).
 */
export interface ThinkingPart {
  type: "thinking";
  id: string;
  text: string;
  status: PartStatus;
  visibility?: "full" | "summary" | "hidden";
  title?: string;
  durationMs?: number;
}

/**
 * A tool call. `inputJson` is the raw input as streamed; `input` is the parsed value once complete.
 * `title` is the display line ("Recalled memory"), `subtitle` the highlighted detail ("preferences.md").
 */
export interface ToolCallPart {
  type: "tool_call";
  id: string;
  name: string;
  status: PartStatus;
  inputJson: string;
  input?: unknown;
  /**
   * While the input streams: a best-effort parse of `inputJson`, so pages and views can show fields as the
   * model writes them. Strings may be cut short and keys missing. Gone once `input` is set.
   */
  partialInput?: unknown;
  result?: unknown;
  /**
   * Display data for the page, not for the model: what a tool view's Card or Block draws (job rows, a diff)
   * when the model-visible `result` is short. Set by the backend with `data` on part.update / part.end.
   */
  data?: unknown;
  error?: string;
  title?: string;
  subtitle?: string;
  durationMs?: number;
  /**
   * Where the tool runs. "server" (the default): the backend runs it and streams the result; the page can
   * still react to it through the tool's `onResult`. "client": the backend ends the run with this call
   * "awaiting", the browser runs it and sends the result back in a continuation request.
   */
  runsOn?: "server" | "client";
  /** The backend asks the user before the tool runs. The client may also require it per tool. */
  needsApproval?: boolean;
  /** The user's answer, sent back in the continuation request. */
  approval?: "granted" | "denied";
}

export interface AttachmentPart {
  type: "attachment";
  id: string;
  status: PartStatus;
  fileId: string;
  name: string;
  mime: string;
  size: number;
  url?: string;
  /** Pasted text kept inline instead of uploaded. */
  text?: string;
}

/**
 * An interactive visual rendered in a sandboxed frame. Either inline `html` (streamed as text deltas)
 * or an MCP Apps UI resource.
 */
export interface WidgetPart {
  type: "widget";
  id: string;
  status: PartStatus;
  title?: string;
  html?: string;
  resourceUri?: string;
}

/** A host-defined part, rendered by a renderer the host registers for `kind`. */
export interface CustomPart {
  type: "custom";
  id: string;
  status: PartStatus;
  kind: string;
  data: unknown;
  /** Plain text fallback for hosts without a renderer for `kind`, and for copy. */
  text?: string;
}

export type Part = TextPart | ThinkingPart | ToolCallPart | AttachmentPart | WidgetPart | CustomPart;

export type PartType = Part["type"];

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
}

export interface Message {
  id: string;
  /** Previous message in the conversation tree. Edits and retries create siblings with the same parent. */
  parentId: string | null;
  role: Role;
  status: MessageStatus;
  parts: Part[];
  createdAt: string;
  model?: string;
  effort?: string;
  usage?: Usage;
  error?: string;
  /** Run that produced this message, and the last event applied from it. Used to resume and to drop repeats. */
  runId?: string;
  lastSeq?: number;
}

export interface EffortLevel {
  id: string;
  label: string;
  recommended?: boolean;
  /** Short warning shown next to the level, e.g. "5.5x or more usage". */
  warning?: string;
  /** One line on what the level is for, e.g. "For hard problems". Shown under the effort slider. */
  description?: string;
}

export interface ModelInfo {
  /** The slug sent to the backend, e.g. "gpt-6-astra". */
  id: string;
  /** Display name, e.g. "GPT 6 Astra". */
  label: string;
  description?: string;
  /** Context window in tokens; the context panel's limit. */
  contextWindow?: number;
  /** Reasoning effort levels. Leave unset for models without them: no Effort menu, no effort sent. */
  efforts?: EffortLevel[];
  defaultEffort?: string;
  /** Shown under "More models" instead of the main list. */
  secondary?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

/** One slice of the context window, e.g. "System prompt" or "MCP tools". */
export interface ContextCategory {
  id: string;
  label: string;
  tokens: number;
  /** CSS color for the bar segment and swatch. Defaults to a grey. */
  color?: string;
  /** Loaded on demand, not counted in `used`; shown with a dash instead of a percentage. */
  deferred?: boolean;
  /** Held back (e.g. an autocompact buffer): shown in the bar and taken from free space, but not "used". */
  reserved?: boolean;
  /** Tooltip explaining the category. Categories with a hint are underlined. */
  hint?: string;
}

/** An expandable list under the categories, e.g. each MCP tool or memory file and its size. */
export interface ContextGroup {
  id: string;
  label: string;
  items: { id: string; label: string; tokens: number }[];
}

/** What fills a conversation's context window, as reported by the backend. */
export interface ContextUsage {
  limit: number;
  categories: ContextCategory[];
  groups?: ContextGroup[];
}
