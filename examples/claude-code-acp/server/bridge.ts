/**
 * Claude Code over ACP (Agent Client Protocol), as a kit backend. One agent process; one ACP session per
 * conversation. Each request from `sseTransport` becomes a run of kit `StreamEvent`s:
 *
 * - The user's text is sent as `session/prompt`; Claude Code keeps the history itself.
 * - `session/update` notifications become parts: message chunks → text, thought chunks → thinking,
 *   tool calls → tool_call parts (Bash shows as the kit's command view).
 * - A `session/request_permission` ends the run with the call "awaiting" approval. The ACP request stays
 *   open; the kit's continuation (with the user's answer) resolves it and carries on the same message.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { Readable, Writable } from "node:stream";
import {
  client,
  ndJsonStream,
  PROTOCOL_VERSION,
  type ClientContext,
  type PromptResponse,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionUpdate,
  type Stream,
  type ToolCallContent,
} from "@agentclientprotocol/sdk";
import type { Message, StreamEvent } from "agentic-ui-kit/core";

/** What `sseTransport` POSTs (the kit's `SseRequestBody`, the fields used here). */
export interface ChatRequest {
  conversationId?: string;
  message: Message;
  continuation?: boolean;
}

export interface BridgeOptions {
  /** The folder Claude Code works in. */
  cwd: string;
  /** A model id or alias from the agent's `model` config option, e.g. "haiku". */
  model?: string;
  /** "default" asks before edits and commands; see the agent's `mode` config option. */
  mode?: string;
  /** Connects to the agent. Defaults to spawning Claude Code's ACP adapter. */
  connect?: () => Stream;
}

type Item =
  | { kind: "update"; update: SessionUpdate }
  | { kind: "permission"; request: RequestPermissionRequest; answer: (r: RequestPermissionResponse) => void }
  | { kind: "stop"; response: PromptResponse }
  | { kind: "error"; message: string };

/** An async queue: the ACP side pushes, the current HTTP run pulls. */
class Queue<T> {
  private items: T[] = [];
  private waiting: ((item: T) => void)[] = [];
  push(item: T) {
    const next = this.waiting.shift();
    if (next) next(item);
    else this.items.push(item);
  }
  next(): Promise<T> {
    const item = this.items.shift();
    return item !== undefined ? Promise.resolve(item) : new Promise((resolve) => this.waiting.push(resolve));
  }
}

/** One assistant message: survives across the runs of a turn (approvals continue it). */
interface Turn {
  messageId: string;
  parentId: string;
  open?: { id: string; type: "text" | "thinking" };
  tools: Map<string, Record<string, unknown>>;
  count: number;
}

interface Conversation {
  sessionId: string;
  items: Queue<Item>;
  turn?: Turn;
  /** Permission requests waiting on the user, by tool call id. */
  pending: Map<string, Extract<Item, { kind: "permission" }>>;
  runId?: string;
}

/** Claude Code's tool names → the kit's tool views (`defaultToolViews`); others keep their name. */
const toolNames: Record<string, string> = { Bash: "bash", WebSearch: "web_search", WebFetch: "web_fetch" };

function spawnClaudeCode(model: string | undefined): { stream: Stream; child: ChildProcess } {
  const bin = createRequire(import.meta.url).resolve("@agentclientprotocol/claude-agent-acp/dist/index.js");
  const child = spawn(process.execPath, [bin], {
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, ...(model && { ANTHROPIC_MODEL: model }) },
  });
  return { stream: ndJsonStream(Writable.toWeb(child.stdin!), Readable.toWeb(child.stdout!) as ReadableStream<Uint8Array>), child };
}

export class Bridge {
  private agent: Promise<ClientContext>;
  private conversations = new Map<string, Conversation>();
  private bySession = new Map<string, Conversation>();
  private child?: ChildProcess;

  constructor(private options: BridgeOptions) {
    this.agent = this.start();
  }

  private async start(): Promise<ClientContext> {
    let stream: Stream;
    if (this.options.connect) stream = this.options.connect();
    else ({ stream, child: this.child } = spawnClaudeCode(this.options.model));
    const app = client()
      .onNotification("session/update", ({ params }) => this.bySession.get(params.sessionId)?.items.push({ kind: "update", update: params.update }))
      .onRequest(
        "session/request_permission",
        ({ params }) =>
          new Promise<RequestPermissionResponse>((answer) => {
            const conversation = this.bySession.get(params.sessionId);
            if (!conversation) return answer({ outcome: { outcome: "cancelled" } });
            conversation.items.push({ kind: "permission", request: params, answer });
          }),
      );
    const { agent } = app.connect(stream);
    await agent.request("initialize", { protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} });
    return agent;
  }

  private async conversation(id: string): Promise<Conversation> {
    const known = this.conversations.get(id);
    if (known) return known;
    const agent = await this.agent;
    const { sessionId } = await agent.request("session/new", { cwd: this.options.cwd, mcpServers: [] });
    const { model, mode = "default" } = this.options;
    if (model) await agent.request("session/set_config_option", { sessionId, configId: "model", value: model });
    await agent.request("session/set_config_option", { sessionId, configId: "mode", value: mode });
    const conversation: Conversation = { sessionId, items: new Queue(), pending: new Map() };
    this.conversations.set(id, conversation);
    this.bySession.set(sessionId, conversation);
    return conversation;
  }

  /** One request from the page: a new turn, or a continuation that answers permission requests. */
  async *run(request: ChatRequest): AsyncGenerator<StreamEvent> {
    const conversationId = request.conversationId ?? "default";
    const agent = await this.agent;
    const conversation = await this.conversation(conversationId);
    const runId = randomUUID();
    conversation.runId = runId;
    let seq = 0;
    const event = (e: Record<string, unknown>) => ({ ...e, runId, seq: seq++ }) as StreamEvent;

    if (!request.continuation || !conversation.turn) {
      // A new message while the last turn still waits on the user declines it: cancel that turn first.
      if (conversation.turn) {
        for (const waiting of conversation.pending.values()) waiting.answer({ outcome: { outcome: "cancelled" } });
        conversation.pending.clear();
        await agent.notify("session/cancel", { sessionId: conversation.sessionId });
        for (let item = await conversation.items.next(); item.kind === "update" || item.kind === "permission"; item = await conversation.items.next()) {
          if (item.kind === "permission") item.answer({ outcome: { outcome: "cancelled" } });
        }
      }
      conversation.turn ={ messageId: randomUUID(), parentId: request.message.id, tools: new Map(), count: 0 };
      const text = request.message.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n");
      agent.request("session/prompt", { sessionId: conversation.sessionId, prompt: [{ type: "text", text }] }).then(
        (response) => conversation.items.push({ kind: "stop", response }),
        (error: unknown) => conversation.items.push({ kind: "error", message: error instanceof Error ? error.message : String(error) }),
      );
    } else {
      // The user's answers: "granted" allows once, anything else (denied, declined by a new message) rejects.
      for (const part of request.message.parts) {
        const waiting = part.type === "tool_call" ? conversation.pending.get(part.id) : undefined;
        if (!waiting || part.type !== "tool_call") continue;
        conversation.pending.delete(part.id);
        const want = part.approval === "granted" ? ["allow_once", "allow_always"] : ["reject_once", "reject_always"];
        const option = want.map((kind) => waiting.request.options.find((o) => o.kind === kind)).find(Boolean);
        waiting.answer(option ? { outcome: { outcome: "selected", optionId: option.optionId } } : { outcome: { outcome: "cancelled" } });
      }
    }

    const turn = conversation.turn;
    yield event({ type: "run.start", messageId: turn.messageId, parentId: turn.parentId, createdAt: new Date().toISOString(), ...(this.options.model && { model: this.options.model }) });

    const close = function* () {
      if (turn.open) yield event({ type: "part.end", partId: turn.open.id });
      turn.open = undefined;
    };
    const chunk = function* (type: "text" | "thinking", text: string) {
      if (turn.open?.type !== type) {
        yield* close();
        turn.open = { id: `${turn.messageId}-${type}-${turn.count++}`, type };
        yield event({ type: "part.start", part: { type, id: turn.open.id, text: "", status: "streaming" } });
      }
      yield event({ type: "part.delta", partId: turn.open.id, text });
    };

    for (;;) {
      const item = await conversation.items.next();
      if (item.kind === "update") {
        const u = item.update;
        switch (u.sessionUpdate) {
          case "agent_message_chunk":
          case "agent_thought_chunk":
            if (u.content.type === "text") yield* chunk(u.sessionUpdate === "agent_message_chunk" ? "text" : "thinking", u.content.text);
            break;
          case "tool_call":
          case "tool_call_update": {
            yield* close();
            const input = { ...turn.tools.get(u.toolCallId), ...(u.rawInput && typeof u.rawInput === "object" ? (u.rawInput as Record<string, unknown>) : {}) };
            const title = u.title ?? undefined;
            if (!turn.tools.has(u.toolCallId)) {
              turn.tools.set(u.toolCallId, input);
              const raw = u.name ?? title ?? "tool";
              yield event({ type: "part.start", part: { type: "tool_call", id: u.toolCallId, name: toolNames[raw] ?? raw, status: "running", inputJson: JSON.stringify(input), ...(title && { title }) } });
            } else {
              turn.tools.set(u.toolCallId, input);
              if (u.rawInput || title) yield event({ type: "part.update", partId: u.toolCallId, input, ...(title && { title }) });
            }
            if (u.status === "completed") yield event({ type: "part.end", partId: u.toolCallId, result: u.rawOutput ?? textOf(u.content) });
            if (u.status === "failed") yield event({ type: "part.end", partId: u.toolCallId, status: "error", error: textOf(u.content) || "Failed" });
            break;
          }
          case "session_info_update":
            if (u.title) yield event({ type: "title", conversationId, title: u.title });
            break;
        }
      } else if (item.kind === "permission") {
        // Ask the user: end this run with the call awaiting; the continuation answers it.
        const call = item.request.toolCall;
        yield* close();
        if (!turn.tools.has(call.toolCallId)) {
          const input = call.rawInput && typeof call.rawInput === "object" ? (call.rawInput as Record<string, unknown>) : {};
          turn.tools.set(call.toolCallId, input);
          const raw = call.name ?? call.title ?? "tool";
          yield event({ type: "part.start", part: { type: "tool_call", id: call.toolCallId, name: toolNames[raw] ?? raw, status: "running", inputJson: JSON.stringify(input), ...(call.title && { title: call.title }) } });
        }
        conversation.pending.set(call.toolCallId, item);
        yield event({ type: "part.update", partId: call.toolCallId, status: "awaiting", needsApproval: true });
        yield event({ type: "run.end", status: "done" });
        return;
      } else {
        yield* close();
        conversation.turn = undefined;
        if (item.kind === "error") {
          yield event({ type: "run.end", status: "error", error: item.message });
        } else {
          // Token usage is still an unstable ACP field; Claude Code sends it.
          const usage = (item.response as { usage?: { inputTokens: number; outputTokens: number; cachedReadTokens?: number | null } }).usage;
          yield event({
            type: "run.end",
            status: item.response.stopReason === "cancelled" ? "stopped" : "done",
            ...(usage && { usage: { inputTokens: usage.inputTokens + (usage.cachedReadTokens ?? 0), outputTokens: usage.outputTokens, ...(usage.cachedReadTokens && { cachedInputTokens: usage.cachedReadTokens }) } }),
          });
        }
        return;
      }
    }
  }

  /** The user pressed stop: cancel the prompt turn and any permission it waits on. */
  async stop(runId: string) {
    const conversation = [...this.conversations.values()].find((c) => c.runId === runId);
    if (!conversation) return;
    for (const waiting of conversation.pending.values()) waiting.answer({ outcome: { outcome: "cancelled" } });
    conversation.pending.clear();
    await (await this.agent).notify("session/cancel", { sessionId: conversation.sessionId });
  }

  close() {
    this.child?.kill();
  }
}

function textOf(content: ToolCallContent[] | null | undefined): string {
  return (content ?? []).map((c) => (c.type === "content" && c.content.type === "text" ? c.content.text : "")).join("\n");
}
