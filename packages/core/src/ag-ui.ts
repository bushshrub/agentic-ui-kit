import type { StreamEvent } from "./events";
import type { Message, Part, ToolCallPart } from "./types";

/*
 * AG-UI (https://docs.ag-ui.com) support: converts the kit's history to an AG-UI `RunAgentInput` and an AG-UI
 * event stream to `StreamEvent`s, so agents built with LangGraph, Mastra, CrewAI, Pydantic AI, ADK and others
 * work with the kit unchanged. The types below are the subset of AG-UI 1.0 the kit reads, written out so the
 * kit does not depend on @ag-ui/core.
 *
 * One AG-UI run becomes one assistant message. Its text, reasoning and tool call messages become parts.
 */

export interface AgUiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type AgUiInputContent = { type: "text"; text: string } | { type: "binary"; mimeType: string; url?: string; data?: string; filename?: string };

export type AgUiMessage =
  | { id: string; role: "user"; content: string | AgUiInputContent[] }
  | { id: string; role: "assistant"; content?: string; toolCalls?: AgUiToolCall[] }
  | { id: string; role: "tool"; content: string; toolCallId: string; error?: string };

export interface AgUiTool {
  name: string;
  description: string;
  parameters: unknown;
}

export interface AgUiContext {
  description: string;
  value: string;
}

export interface AgUiResumeEntry {
  interruptId: string;
  status: "resolved" | "cancelled";
  payload?: unknown;
}

export interface RunAgentInput {
  threadId: string;
  runId: string;
  messages: AgUiMessage[];
  tools: AgUiTool[];
  context: AgUiContext[];
  state?: unknown;
  forwardedProps?: unknown;
  resume?: AgUiResumeEntry[];
}

export interface AgUiInterrupt {
  id: string;
  reason: string;
  message?: string;
  toolCallId?: string;
  metadata?: Record<string, unknown>;
}

/** An AG-UI event. Only `type` is typed; the translator reads the fields it needs per type. */
export interface AgUiEvent {
  type: string;
  [field: string]: unknown;
}

/**
 * Converts the conversation to AG-UI messages. Thinking, widget and custom parts are not sent. Tool calls in
 * `resumed` are answered through `resume` entries instead, so they get no tool message.
 */
export function toAgUiMessages(history: Message[], resumed: ReadonlySet<string> = new Set()): AgUiMessage[] {
  const out: AgUiMessage[] = [];
  for (const message of history) {
    if (message.role === "user") out.push(userMessage(message));
    else out.push(...assistantMessages(message, resumed));
  }
  return out;
}

function userMessage(message: Message): AgUiMessage {
  const text = message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n\n");
  const attachments = message.parts.filter((p) => p.type === "attachment");
  if (attachments.length === 0) return { id: message.id, role: "user", content: text };
  const content: AgUiInputContent[] = text ? [{ type: "text", text }] : [];
  for (const a of attachments) {
    if (a.text !== undefined) content.push({ type: "text", text: `${a.name}:\n${a.text}` });
    else if (a.url) content.push({ type: "binary", mimeType: a.mime, url: a.url, filename: a.name });
  }
  return { id: message.id, role: "user", content };
}

/**
 * AG-UI keeps text and tool calls in one assistant message with the results as tool messages after it, so
 * text after a tool call starts the next assistant message. A tool call without a result yet (an approved
 * server tool the agent runs on resume) gets no tool message.
 */
function assistantMessages(message: Message, resumed: ReadonlySet<string>): AgUiMessage[] {
  const out: AgUiMessage[] = [];
  let text = "";
  let calls: ToolCallPart[] = [];
  const flush = () => {
    if (!text && calls.length === 0) return;
    const id = out.length === 0 ? message.id : `${message.id}:${out.length}`;
    out.push({
      id,
      role: "assistant",
      ...(text && { content: text }),
      ...(calls.length > 0 && { toolCalls: calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.inputJson || JSON.stringify(c.input ?? {}) } })) }),
    });
    for (const c of calls) {
      if (resumed.has(c.id)) continue;
      if (c.status === "done") out.push({ id: `${c.id}:result`, role: "tool", toolCallId: c.id, content: toContent(c.result) });
      else if (c.status === "error") out.push({ id: `${c.id}:result`, role: "tool", toolCallId: c.id, content: c.error ?? "Failed", error: c.error ?? "Failed" });
    }
    text = "";
    calls = [];
  };
  for (const part of message.parts) {
    if (part.type === "text") {
      if (calls.length > 0) flush();
      text += part.text;
    } else if (part.type === "tool_call") calls.push(part);
  }
  flush();
  return out;
}

function toContent(result: unknown): string {
  if (typeof result === "string") return result;
  return result === undefined ? "" : JSON.stringify(result);
}

function fromContent(content: unknown): unknown {
  if (typeof content !== "string") return content;
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

export interface AgUiTranslateOptions {
  /** The kit message the run builds: a new id, or the continued message's id. */
  messageId: string;
  parentId: string | null;
  /** Names of the tools the page runs (`SendRequest.tools`). Their calls end "awaiting" for the client to run. */
  clientTools?: string[];
  /** CUSTOM event names to show as custom parts (`kind` is the name, `data` the value). Others are skipped. */
  customKinds?: string[];
  /**
   * Part ids the message already has (a continuation). An agent that replays those tool calls on resume
   * does not stream their input twice.
   */
  existing?: string[];
  /** Each interrupt the run ends with. One with a `toolCallId` makes that call wait for the user's approval. */
  onInterrupt?: (interrupt: AgUiInterrupt) => void;
  /** Every AG-UI event as it arrives, e.g. to keep STATE_SNAPSHOT / STATE_DELTA in the page. */
  onEvent?: (event: AgUiEvent) => void;
  signal?: AbortSignal;
  now?: () => number;
}

/**
 * Turns an AG-UI run's events into `StreamEvent`s for one assistant message. Ends with `run.end`, also when
 * the stream stops without RUN_FINISHED or RUN_ERROR (unless `signal` aborted it: the caller stops the run).
 */
export async function* fromAgUiEvents(events: AsyncIterable<AgUiEvent>, options: AgUiTranslateOptions): AsyncGenerator<StreamEvent> {
  const { messageId, parentId, clientTools = [], customKinds = [], existing = [], onInterrupt, onEvent, signal, now = Date.now } = options;
  let runId = "";
  let seq = 0;
  let started = false;
  const open = new Map<string, { part: Part; began: number }>();
  /** The part open through *_CHUNK events, closed by the next event that is not its chunk. */
  let chunk: { type: string; id: string } | undefined;
  let reasoning: { began: number; shown: boolean } | undefined;
  const results = new Set<string>();

  const event = (e: Record<string, unknown>) => ({ ...e, runId, seq: seq++ }) as StreamEvent;
  function* begin(id: string = crypto.randomUUID()) {
    if (started) return;
    started = true;
    runId = id;
    yield event({ type: "run.start", messageId, parentId, createdAt: new Date(now()).toISOString() });
  }
  function* startPart(part: Part) {
    if (open.has(part.id)) return;
    open.set(part.id, { part, began: now() });
    yield event({ type: "part.start", part });
  }
  function* endPart(id: string, fields: Record<string, unknown> = {}) {
    const entry = open.get(id);
    if (!entry) return;
    open.delete(id);
    const durationMs = entry.part.type === "thinking" ? { durationMs: now() - entry.began } : {};
    yield event({ type: "part.end", partId: id, ...durationMs, ...fields });
  }
  /** A finished tool call input: client tools wait for the page, server tools run until their result comes. */
  function* inputDone(id: string) {
    const entry = open.get(id);
    if (!entry || entry.part.type !== "tool_call" || results.has(id)) return;
    yield event({ type: "part.update", partId: id, status: entry.part.runsOn === "client" ? "awaiting" : "running" });
  }
  const textId = (id: unknown) => `text:${String(id)}`;
  const thinkingId = (id: unknown) => `thinking:${String(id)}`;
  const toolPart = (id: string, name: string): ToolCallPart => ({ type: "tool_call", id, name, status: "input", inputJson: "", runsOn: clientTools.includes(name) ? "client" : "server" });

  for await (const e of events) {
    onEvent?.(e);
    if (e.type === "RUN_STARTED") {
      yield* begin(typeof e.runId === "string" ? e.runId : undefined);
      continue;
    }
    yield* begin();
    // Chunk events open a part implicitly; the next event that does not continue it closes it.
    if (chunk && !(e.type === chunk.type && (e.messageId === undefined || e.messageId === chunk.id) && (e.toolCallId === undefined || e.toolCallId === chunk.id))) {
      const closing = chunk;
      chunk = undefined;
      if (closing.type === "TOOL_CALL_CHUNK") yield* inputDone(closing.id);
      else yield* endPart(closing.type === "TEXT_MESSAGE_CHUNK" ? textId(closing.id) : thinkingId(closing.id));
    }

    switch (e.type) {
      case "TEXT_MESSAGE_START":
        yield* startPart({ type: "text", id: textId(e.messageId), text: "", status: "streaming" });
        break;
      case "TEXT_MESSAGE_CONTENT":
        yield event({ type: "part.delta", partId: textId(e.messageId), text: String(e.delta ?? "") });
        break;
      case "TEXT_MESSAGE_END":
        yield* endPart(textId(e.messageId));
        break;
      case "TEXT_MESSAGE_CHUNK": {
        const id = String(e.messageId ?? chunk?.id ?? crypto.randomUUID());
        chunk = { type: e.type, id };
        yield* startPart({ type: "text", id: textId(id), text: "", status: "streaming" });
        if (e.delta) yield event({ type: "part.delta", partId: textId(id), text: String(e.delta) });
        break;
      }

      case "REASONING_START":
      case "THINKING_START":
        reasoning = { began: now(), shown: false };
        break;
      case "REASONING_MESSAGE_START":
      case "THINKING_TEXT_MESSAGE_START": {
        const id = thinkingId(e.messageId ?? "thinking");
        if (reasoning) reasoning.shown = true;
        yield* startPart({ type: "thinking", id, text: "", status: "streaming" });
        break;
      }
      case "REASONING_MESSAGE_CONTENT":
      case "THINKING_TEXT_MESSAGE_CONTENT":
        yield event({ type: "part.delta", partId: thinkingId(e.messageId ?? "thinking"), text: String(e.delta ?? "") });
        break;
      case "REASONING_MESSAGE_END":
      case "THINKING_TEXT_MESSAGE_END":
        yield* endPart(thinkingId(e.messageId ?? "thinking"));
        break;
      case "REASONING_MESSAGE_CHUNK": {
        const id = String(e.messageId ?? chunk?.id ?? crypto.randomUUID());
        chunk = { type: e.type, id };
        if (reasoning) reasoning.shown = true;
        yield* startPart({ type: "thinking", id: thinkingId(id), text: "", status: "streaming" });
        if (e.delta) yield event({ type: "part.delta", partId: thinkingId(id), text: String(e.delta) });
        break;
      }
      case "REASONING_END":
      case "THINKING_END":
        // Reasoning the agent did not show (e.g. only an encrypted value): a hidden thinking part with its duration.
        if (reasoning && !reasoning.shown) {
          const id = thinkingId(`hidden:${seq}`);
          yield event({ type: "part.start", part: { type: "thinking", id, text: "", status: "streaming", visibility: "hidden" } });
          yield event({ type: "part.end", partId: id, durationMs: now() - reasoning.began });
        }
        reasoning = undefined;
        break;

      case "TOOL_CALL_START":
        if (existing.includes(String(e.toolCallId))) break;
        yield* startPart(toolPart(String(e.toolCallId), String(e.toolCallName)));
        break;
      case "TOOL_CALL_ARGS":
        if (existing.includes(String(e.toolCallId))) break;
        yield event({ type: "part.delta", partId: String(e.toolCallId), inputJson: String(e.delta ?? "") });
        break;
      case "TOOL_CALL_END":
        yield* inputDone(String(e.toolCallId));
        break;
      case "TOOL_CALL_CHUNK": {
        const id = String(e.toolCallId ?? chunk?.id ?? crypto.randomUUID());
        chunk = { type: e.type, id };
        if (existing.includes(id)) break;
        yield* startPart(toolPart(id, String(e.toolCallName ?? "tool")));
        if (e.delta) yield event({ type: "part.delta", partId: id, inputJson: String(e.delta) });
        break;
      }
      case "TOOL_CALL_RESULT": {
        const id = String(e.toolCallId);
        results.add(id);
        // Also for calls from before a resume, which this run did not open.
        open.delete(id);
        yield event({ type: "part.end", partId: id, result: fromContent(e.content) });
        break;
      }

      case "CUSTOM":
        if (typeof e.name === "string" && customKinds.includes(e.name)) {
          const id = `custom:${seq}`;
          yield event({ type: "part.start", part: { type: "custom", id, kind: e.name, data: e.value, status: "streaming" } });
          yield event({ type: "part.end", partId: id });
        }
        break;

      case "RUN_FINISHED": {
        const outcome = e.outcome as { type?: string; interrupts?: AgUiInterrupt[] } | undefined;
        for (const interrupt of outcome?.type === "interrupt" ? (outcome.interrupts ?? []) : []) {
          onInterrupt?.(interrupt);
          if (interrupt.toolCallId && !results.has(interrupt.toolCallId))
            yield event({ type: "part.update", partId: interrupt.toolCallId, status: "awaiting", needsApproval: true });
        }
        yield* closeTextParts();
        yield event({ type: "run.end", status: "done" });
        return;
      }
      case "RUN_ERROR":
        yield event({ type: "run.end", status: "error", error: String(e.message ?? "The agent failed") });
        return;
    }
  }
  if (signal?.aborted) return;
  yield* begin();
  yield event({ type: "run.end", status: "error", error: "The agent's stream ended before the run finished" });

  /** Text and thinking left open at the end close as done; tool calls keep their state for the reducer. */
  function* closeTextParts() {
    for (const [id, { part }] of [...open]) if (part.type !== "tool_call") yield* endPart(id);
  }
}

/** Calls the page ran or the user answered since the agent paused on them: resume entries for the interrupts. */
export function agUiResume(message: Message, interrupts: Map<string, AgUiInterrupt>): AgUiResumeEntry[] {
  const out: AgUiResumeEntry[] = [];
  for (const part of message.parts) {
    if (part.type !== "tool_call" || part.approval === undefined) continue;
    const interrupt = interrupts.get(part.id);
    if (!interrupt) continue;
    out.push({ interruptId: interrupt.id, status: part.approval === "granted" ? "resolved" : "cancelled", ...(part.approval === "granted" && { payload: { approved: true } }) });
  }
  return out;
}
