import type { MessageStatus, Part, PartStatus, Usage } from "./types";

/**
 * The stream a backend sends for one run (one assistant reply). Sent as server-sent events: the SSE `id`
 * is `seq`, the `data` is the JSON event. Any backend in any language that emits these works with the UI.
 */
export type StreamEvent = RunStart | PartStart | PartDelta | PartUpdate | PartEnd | RunUsage | RunEnd | TitleEvent;

interface Base {
  runId: string;
  /** Increases by one per event within a run. Clients resume with the last seq they applied. */
  seq: number;
}

export interface RunStart extends Base {
  type: "run.start";
  messageId: string;
  parentId: string | null;
  createdAt: string;
  model?: string;
  effort?: string;
}

/** A new part. `part` is its initial state; text fields usually start empty and grow through deltas. */
export interface PartStart extends Base {
  type: "part.start";
  part: Part;
}

/**
 * Appends to a part. `text` goes to the text of text, thinking and custom parts and to the html of widget
 * parts; `inputJson` goes to the raw input of tool calls.
 */
export interface PartDelta extends Base {
  type: "part.delta";
  partId: string;
  text?: string;
  inputJson?: string;
}

/** Fields a backend can set on a part after it starts. Only the fields valid for the part's type apply. */
export interface PartFields {
  status?: PartStatus;
  title?: string;
  subtitle?: string;
  durationMs?: number;
  input?: unknown;
  result?: unknown;
  error?: string;
  data?: unknown;
  url?: string;
  resourceUri?: string;
}

/** Sets fields while the part is still open, e.g. a tool call moving from input to running. */
export interface PartUpdate extends Base, PartFields {
  type: "part.update";
  partId: string;
}

/** Closes a part. Status becomes "done" unless the event sets "error". */
export interface PartEnd extends Base, PartFields {
  type: "part.end";
  partId: string;
}

/** Token counts so far, for backends whose provider reports usage while streaming. Replaces the last one. */
export interface RunUsage extends Base {
  type: "run.usage";
  usage: Usage;
}

export interface RunEnd extends Base {
  type: "run.end";
  status: Exclude<MessageStatus, "streaming">;
  usage?: Usage;
  error?: string;
}

/** The conversation got a title, usually after the first reply. Not applied to the message. */
export interface TitleEvent extends Base {
  type: "title";
  conversationId: string;
  title: string;
}
