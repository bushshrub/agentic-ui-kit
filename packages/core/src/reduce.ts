import type { PartFields, StreamEvent } from "./events";
import { parsePartialJson } from "./partial-json";
import type { Message, ModelInfo, Part, ToolCallPart } from "./types";

/**
 * Applies one stream event to the message it builds. Pure and immutable: returns the same object when the
 * event changes nothing, so React can skip renders.
 *
 * Events with a seq at or below `message.lastSeq` are dropped, so replaying from an earlier seq after a
 * reconnect is safe. Events other than run.start need the message to exist; without it they are dropped.
 */
export function applyEvent(message: Message | undefined, event: StreamEvent): Message | undefined {
  if (event.type === "run.start") {
    if (message?.runId === event.runId && (message.lastSeq ?? -1) >= event.seq) return message;
    // A continuation (after client tools or approvals) carries on the same message: keep its parts.
    if (message?.id === event.messageId) {
      return { ...message, status: "streaming", runId: event.runId, lastSeq: event.seq };
    }
    return {
      id: event.messageId,
      parentId: event.parentId,
      role: "assistant",
      status: "streaming",
      parts: [],
      createdAt: event.createdAt,
      runId: event.runId,
      lastSeq: event.seq,
      ...(event.model !== undefined && { model: event.model }),
      ...(event.effort !== undefined && { effort: event.effort }),
    };
  }

  if (!message || message.runId !== event.runId) return message;
  if ((message.lastSeq ?? -1) >= event.seq) return message;
  const seen = { ...message, lastSeq: event.seq };

  switch (event.type) {
    case "part.start":
      if (message.parts.some((p) => p.id === event.part.id)) return seen;
      return { ...seen, parts: [...message.parts, event.part] };

    case "part.delta":
      return updatePart(seen, event.partId, (part) => appendDelta(part, event.text, event.inputJson));

    case "part.update":
      return updatePart(seen, event.partId, (part) => applyFields(part, event));

    case "part.end":
      return updatePart(seen, event.partId, (part) => closePart(applyFields(part, event)));

    case "run.usage":
      return { ...seen, usage: event.usage };

    case "run.end":
      return {
        ...seen,
        status: event.status,
        parts: message.parts.map((p) => closeOpenPart(p, event.status)),
        ...(event.usage !== undefined && { usage: event.usage }),
        ...(event.error !== undefined && { error: event.error }),
      };

    case "title":
      return seen;
  }
}

/** Builds a message from a full event list, e.g. a stored run or a test fixture. */
export function reduceEvents(events: Iterable<StreamEvent>, initial?: Message): Message | undefined {
  let message = initial;
  for (const event of events) message = applyEvent(message, event);
  return message;
}

function updatePart(message: Message, partId: string, update: (part: Part) => Part): Message {
  const index = message.parts.findIndex((p) => p.id === partId);
  if (index === -1) return message;
  const parts = message.parts.slice();
  parts[index] = update(parts[index]!);
  return { ...message, parts };
}

function appendDelta(part: Part, text = "", inputJson = ""): Part {
  switch (part.type) {
    case "text":
    case "thinking":
      return text ? { ...part, text: part.text + text } : part;
    case "custom":
      return text ? { ...part, text: (part.text ?? "") + text } : part;
    case "widget":
      return text ? { ...part, html: (part.html ?? "") + text } : part;
    case "tool_call":
      if (!inputJson) return part;
      return { ...part, inputJson: part.inputJson + inputJson, partialInput: parsePartialJson(part.inputJson + inputJson) };
    case "attachment":
      return part;
  }
}

/** Copies the fields from `fields` that are valid for the part's type. */
function applyFields(part: Part, fields: PartFields): Part {
  const pick = <K extends keyof PartFields>(...keys: K[]) => {
    const out: Partial<Pick<PartFields, K>> = {};
    for (const key of keys) if (fields[key] !== undefined) out[key] = fields[key];
    return out;
  };
  const status = pick("status");
  switch (part.type) {
    case "text":
      return { ...part, ...status };
    case "thinking":
      return { ...part, ...status, ...pick("title", "durationMs") };
    case "tool_call": {
      const next = { ...part, ...status, ...pick("title", "subtitle", "durationMs", "input", "result", "data", "error") };
      // Past "input" the input is complete: parse it (or fail the call) and drop the partial view.
      return next.status === "input" || next.status === "streaming" ? next : withParsedInput(next);
    }
    case "attachment":
      return { ...part, ...status, ...pick("url") };
    case "widget":
      return { ...part, ...status, ...pick("title", "resourceUri") };
    case "custom":
      return { ...part, ...status, ...pick("data") };
  }
}

function closePart(part: Part): Part {
  return withParsedInput(part.status === "error" ? part : { ...part, status: "done" });
}

/** Parses a tool call's streamed input if it is complete JSON and not parsed yet. */
function withParsedInput(part: Part): Part {
  if (part.type !== "tool_call") return part;
  const { partialInput: _, ...rest } = part;
  if (part.input !== undefined || !part.inputJson) return "partialInput" in part ? rest : part;
  const input = parseJson(part.inputJson);
  if (input !== undefined) return { ...rest, input };
  // The model's input ended but is not valid JSON: the call cannot run.
  return part.status === "error" ? rest : { ...rest, status: "error", error: part.error ?? "The tool input was cut off or is not valid JSON" };
}

/** At the end of a run, parts still open are closed. A tool call cut off by a stop or an error is an error. */
function closeOpenPart(part: Part, runStatus: Message["status"]): Part {
  if (part.status === "done" || part.status === "error") return part;
  // Waiting on the client survives a finished run; a stopped or failed run cancels it.
  if (part.type === "tool_call" && part.status === "awaiting" && runStatus === "done") return withParsedInput(part);
  if (part.type === "tool_call" && runStatus !== "done") {
    const error = part.error ?? (runStatus === "stopped" ? "Stopped" : "Failed");
    return withParsedInput({ ...part, status: "error", error });
  }
  return closePart(part);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Rough token count of text, about four characters per token. For live counters, not billing. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Tokens the model spent inside an activity group: its reasoning and the tool inputs it wrote. Tool
 * results are not model output, so they do not count. An estimate; per-step counts are not reported.
 */
export function activityTokens(parts: readonly Part[]): number {
  let chars = 0;
  for (const part of parts) {
    if (part.type === "thinking") chars += part.text.length;
    else if (part.type === "tool_call") chars += part.inputJson.length;
  }
  return Math.ceil(chars / 4);
}

/**
 * Output tokens of a message so far: the backend's count when it has sent one, else an estimate from
 * everything the model has written (text, thinking, tool input, widget html).
 */
export function outputTokens(message: Message): number {
  if (message.usage?.outputTokens !== undefined) return message.usage.outputTokens;
  let chars = 0;
  for (const part of message.parts) {
    if (part.type === "text" || part.type === "thinking") chars += part.text.length;
    else if (part.type === "tool_call") chars += part.inputJson.length;
    else if (part.type === "widget") chars += part.html?.length ?? 0;
    else if (part.type === "custom") chars += part.text?.length ?? 0;
  }
  return Math.ceil(chars / 4);
}

/**
 * The effort to send with a model: the chosen one if the model offers it, else the model's default, else
 * none. Models without effort levels never get one.
 */
export function resolveEffort(model: ModelInfo | undefined, effort?: string): string | undefined {
  const levels = model?.efforts;
  if (!levels?.length) return undefined;
  if (effort && levels.some((e) => e.id === effort)) return effort;
  return model?.defaultEffort ?? levels[0]!.id;
}

/** Tool calls the client has to act on: run them (client tools) or ask the user (approvals). */
export function awaitingToolCalls(message: Message): ToolCallPart[] {
  return message.parts.filter((p): p is ToolCallPart => p.type === "tool_call" && p.status === "awaiting");
}

/** Sets fields on one tool call locally, e.g. a client tool's result or the user's approval. */
export function settleToolCall(message: Message, partId: string, fields: Partial<Pick<ToolCallPart, "status" | "result" | "error" | "approval" | "durationMs">>): Message {
  return { ...message, parts: message.parts.map((p) => (p.id === partId && p.type === "tool_call" ? { ...p, ...fields } : p)) };
}
