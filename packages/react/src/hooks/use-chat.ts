import {
  applyEvent,
  awaitingToolCalls,
  settleToolCall,
  type AttachmentPart,
  type Message,
  type StreamEvent,
  type ToolCallPart,
} from "@agentic-ui-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAgentRegistry, type AgentRegistry, type AgentTool, type ToolSpec } from "./agent";

export interface SendRequest {
  conversationId?: string;
  /**
   * The user message just added (the reply's parent), or for a continuation the assistant message whose
   * awaiting tool calls now have results or approvals. The backend carries on that same message.
   */
  message: Message;
  /** The conversation up to and including `message`. */
  history: Message[];
  /** Set after client tools ran or the user answered an approval. */
  continuation?: boolean;
  /** Client tools the page offers right now (`useAgentTool`), for the backend to give the model. */
  tools?: ToolSpec[];
  /** Page state shared with `useAgentContext`. */
  context?: Record<string, unknown>;
  model?: string;
  effort?: string;
  signal: AbortSignal;
}

/** How the kit talks to a backend. The kit ships an SSE one; hosts with other backends write an adapter. */
export interface Transport {
  send(request: SendRequest): AsyncIterable<StreamEvent>;
  /** Tells the server to stop the run. The stream is aborted locally either way. */
  stop?(runId: string): Promise<void>;
  /**
   * Joins a run that is already going for the conversation (a page opened mid-reply, or a chat just created
   * whose reply has started) and yields its events from the start of the run: `run.start` first, then the parts
   * so far and the rest as they come. Used by `useChat({ resume: true })`; the stream ends with the run.
   */
  resume?(conversationId: string, signal: AbortSignal): AsyncIterable<StreamEvent>;
}

export interface UseChatOptions {
  transport: Transport;
  conversationId?: string;
  initialMessages?: Message[];
  onTitle?: (title: string) => void;
  /** Tools and page context. Defaults to the nearest `AgentProvider`. */
  agent?: AgentRegistry | null;
  /** Continuations allowed per user message, so a looping model stops. Default 12. */
  maxSteps?: number;
  /**
   * Join the run already going for `conversationId` when the hook mounts, through `transport.resume`. The reply
   * is rebuilt from the replayed events; a trailing assistant message that is still streaming (e.g. an empty
   * placeholder, or the part seen so far) is replaced. Does nothing without `transport.resume` or a
   * `conversationId`. Safe in React StrictMode: the run is joined once and survives the double mount.
   */
  resume?: boolean;
  /**
   * Names of tools the user answers through a prompt (a tool view's `Prompt`, e.g. `ask_user`): a call to one
   * that ends the run "awaiting" is listed in `prompts` instead of running. Tools registered with
   * `useChatTool` whose view has a `Prompt` count too. Default `["ask_user"]`.
   */
  promptTools?: readonly string[];
}

export interface SendOptions {
  model?: string;
  /** Only sent if set; pass `resolveEffort(model, effort)` so models without effort get none. */
  effort?: string;
  /** Shown above the text in the user's message. */
  attachments?: AttachmentPart[];
}

/** A tool call waiting for the user to allow or deny it. */
export interface PendingApproval {
  messageId: string;
  part: ToolCallPart;
}

/** A tool call waiting for the user to fill in its `Prompt` (a tool view's prompt over the composer). */
export interface PendingPrompt {
  messageId: string;
  part: ToolCallPart;
}

export interface UseChat {
  messages: Message[];
  /** True while a reply streams or client tools run. False while waiting on an approval. */
  busy: boolean;
  /** Tool calls waiting on the user. Sending a new message declines them. */
  approvals: PendingApproval[];
  respond(partId: string, granted: boolean): void;
  /**
   * Tool calls waiting for the user's input through their tool view's `Prompt` (e.g. `ask_user`); the first
   * shows above the composer. Sending a new message declines them.
   */
  prompts: PendingPrompt[];
  /** Settles a prompted call with the user's answer as its result and continues the run once nothing else waits. */
  answer(partId: string, result: unknown): void;
  /** Settles a prompted call as declined (an error "Declined by the user" the model sees) and continues the run. */
  decline(partId: string): void;
  send(text: string, options?: SendOptions): void;
  stop(): void;
  /** Drops the assistant reply and asks again from its user message. */
  retry(assistantId: string, options?: SendOptions): void;
}

let counter = 0;
const localId = () => `local_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export function userMessage(text: string, parentId: string | null, attachments: AttachmentPart[] = []): Message {
  return {
    id: localId(),
    parentId,
    role: "user",
    status: "done",
    createdAt: new Date().toISOString(),
    parts: [...attachments, ...(text.trim() ? [{ type: "text" as const, id: localId(), text, status: "done" as const }] : [])],
  };
}

const wantsApproval = (part: ToolCallPart, tool: AgentTool | undefined) =>
  part.approval === undefined && (part.needsApproval === true || (typeof tool?.approval === "function" ? tool.approval(part.input) : tool?.approval === true));

const wantsPrompt = (part: ToolCallPart, promptTools: readonly string[], tool: AgentTool | undefined) =>
  part.approval !== "denied" && (promptTools.includes(part.name) || (tool as { view?: { Prompt?: unknown } } | undefined)?.view?.Prompt !== undefined);

const DECLINED = "Declined by the user";

type Run = { controller: AbortController; runId?: string; reply?: Message };

/**
 * A linear conversation driven by a Transport: sends, streams the reply through `applyEvent`, stops and
 * retries. With an `AgentProvider` it also runs the agent loop: client tools run in the page, approvals
 * wait for the user, then the reply continues; every finished tool call reaches its tool's `onResult`.
 */
export function useChat({ transport, conversationId, initialMessages = [], onTitle, agent, maxSteps = 12, resume = false, promptTools = ["ask_user"] }: UseChatOptions): UseChat {
  const contextAgent = useAgentRegistry();
  const registry = agent === undefined ? contextAgent : agent;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [busy, setBusy] = useState(false);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [prompts, setPrompts] = useState<PendingPrompt[]>([]);
  const run = useRef<Run | null>(null);
  const latest = useRef({ messages, transport, conversationId, onTitle, registry, promptTools });
  latest.current = { messages, transport, conversationId, onTitle, registry, promptTools };
  // Where the agent loop is, between a run ending and the user answering.
  const loop = useRef<{ options: SendOptions; step: number }>({ options: {}, step: 0 });
  // Tool calls whose onResult already ran; history counts as reported.
  const reported = useRef<Set<string>>(null!);
  reported.current ??= new Set(initialMessages.flatMap((m) => m.parts.map((p) => p.id)));

  // The last version of each tool call the page was told about, for onCall.
  const seen = useRef(new Map<string, ToolCallPart>());
  const report = useCallback((message: Message) => {
    for (const part of message.parts) {
      if (part.type !== "tool_call" || reported.current.has(part.id)) continue;
      const tool = latest.current.registry?.tool(part.name);
      try {
        if (seen.current.get(part.id) !== part) {
          seen.current.set(part.id, part);
          tool?.onCall?.(part as never);
        }
        if (part.status === "done" || part.status === "error") {
          reported.current.add(part.id);
          seen.current.delete(part.id);
          tool?.onResult?.(part as never);
        }
      } catch (error) {
        console.error(`Tool callback for ${part.name} failed`, error);
      }
    }
  }, []);

  /** Puts a changed message into the list and the ref, so the next step sees it at once. */
  const commit = useCallback(
    (message: Message) => {
      const list = latest.current.messages;
      const index = list.findIndex((m) => m.id === message.id);
      const next = index === -1 ? [...list, message] : list.with(index, message);
      latest.current.messages = next;
      setMessages(next);
      report(message);
    },
    [report],
  );

  const finish = useCallback(
    (reply: Message | undefined, status: "stopped" | "error", error?: string) => {
      if (!reply || reply.status !== "streaming") return;
      const ended = applyEvent(reply, {
        type: "run.end",
        runId: reply.runId ?? "",
        seq: (reply.lastSeq ?? 0) + 1,
        status,
        ...(error !== undefined && { error }),
      });
      if (ended) commit(ended);
    },
    [commit],
  );

  // `start` and `advance` call each other; the ref breaks the cycle.
  const advanceRef = useRef<(reply: Message) => void>(() => {});

  const start = useCallback(
    (history: Message[], options: SendOptions, continuation?: Message, joining?: boolean) => {
      const message = history.at(-1)!;
      const controller = new AbortController();
      const current: Run = { controller, ...(continuation && { reply: continuation }) };
      run.current = current;
      latest.current.messages = history;
      setMessages(history);
      setBusy(true);
      let followUp = false;
      void (async () => {
        try {
          const { transport, conversationId, registry } = latest.current;
          const tools = registry?.specs();
          const events =
            joining && conversationId !== undefined && transport.resume
              ? transport.resume(conversationId, controller.signal)
              : transport.send({
            message,
            history,
            signal: controller.signal,
            ...(continuation && { continuation: true }),
            ...(tools?.length && { tools }),
            ...(registry && { context: registry.context() }),
            ...(conversationId !== undefined && { conversationId }),
            ...(options.model !== undefined && { model: options.model }),
            ...(options.effort !== undefined && { effort: options.effort }),
          });
          for await (const event of events) {
            if (controller.signal.aborted) break;
            if (event.type === "title") {
              latest.current.onTitle?.(event.title);
              continue;
            }
            const next = applyEvent(current.reply, event);
            if (!next || next === current.reply) continue;
            current.reply = next;
            current.runId = next.runId;
            commit(next);
          }
          if (controller.signal.aborted) finish(current.reply, "stopped");
          else if (current.reply?.status === "done" && awaitingToolCalls(current.reply).length > 0) followUp = true;
        } catch (error) {
          if (controller.signal.aborted) finish(current.reply, "stopped");
          else finish(current.reply, "error", error instanceof Error ? error.message : String(error));
        } finally {
          if (run.current === current) {
            run.current = null;
            if (followUp) advanceRef.current(current.reply!);
            else setBusy(false);
          }
        }
      })();
    },
    [commit, finish],
  );

  /** After a run ends with awaiting calls: ask, or run the client tools and continue. */
  const advance = useCallback(
    (reply: Message) => {
      const { registry } = latest.current;
      const awaiting = awaitingToolCalls(reply);
      const ask = awaiting.filter((p) => wantsApproval(p, registry?.tool(p.name)));
      if (ask.length > 0) {
        setApprovals(ask.map((part) => ({ messageId: reply.id, part })));
        setBusy(false);
        return;
      }
      const prompted = awaiting.filter((p) => wantsPrompt(p, latest.current.promptTools, registry?.tool(p.name)));
      if (prompted.length > 0) {
        setPrompts(prompted.map((part) => ({ messageId: reply.id, part })));
        setBusy(false);
        return;
      }
      const controller = new AbortController();
      const current: Run = { controller, reply };
      run.current = current;
      setBusy(true);
      void (async () => {
        let message = reply;
        const set = (part: ToolCallPart, fields: Parameters<typeof settleToolCall>[2]) => {
          message = settleToolCall(message, part.id, fields);
          current.reply = message;
          commit(message);
        };
        for (const part of awaiting) {
          if (controller.signal.aborted) break;
          if (part.approval === "denied") {
            set(part, { status: "error", error: DECLINED });
          } else if (part.runsOn === "client") {
            const tool = latest.current.registry?.tool(part.name);
            if (!tool?.execute) {
              set(part, { status: "error", error: `This page has no handler for ${part.name}` });
              continue;
            }
            set(part, { status: "running" });
            const began = performance.now();
            try {
              const result = await tool.execute(part.input, { callId: part.id, messageId: message.id, signal: controller.signal });
              set(part, { status: "done", result, durationMs: Math.round(performance.now() - began) });
            } catch (error) {
              set(part, { status: "error", error: error instanceof Error ? error.message : String(error) });
            }
          } else {
            // An approved server tool: the backend runs it in the continuation.
            set(part, { status: "running" });
          }
        }
        if (run.current !== current) return;
        run.current = null;
        if (controller.signal.aborted) {
          for (const part of awaitingToolCalls(message).concat(message.parts.filter((p): p is ToolCallPart => p.type === "tool_call" && p.status === "running")))
            set(part, { status: "error", error: "Stopped" });
          setBusy(false);
          return;
        }
        if (loop.current.step >= maxSteps) {
          setBusy(false);
          return;
        }
        loop.current.step++;
        const list = latest.current.messages;
        start(list.slice(0, list.findIndex((m) => m.id === message.id) + 1), loop.current.options, message);
      })();
    },
    [commit, maxSteps, start],
  );
  advanceRef.current = advance;

  const respond = useCallback(
    (partId: string, granted: boolean) => {
      const pending = approvals.find((a) => a.part.id === partId);
      if (!pending) return;
      const message = latest.current.messages.find((m) => m.id === pending.messageId);
      if (!message) return;
      const next = settleToolCall(message, partId, { approval: granted ? "granted" : "denied" });
      commit(next);
      const rest = approvals.filter((a) => a.part.id !== partId);
      setApprovals(rest);
      if (rest.length === 0) advance(next);
    },
    [approvals, advance, commit],
  );

  const settlePrompt = useCallback(
    (partId: string, fields: Parameters<typeof settleToolCall>[2]) => {
      const pending = prompts.find((p) => p.part.id === partId);
      if (!pending) return;
      const message = latest.current.messages.find((m) => m.id === pending.messageId);
      if (!message) return;
      const next = settleToolCall(message, partId, fields);
      commit(next);
      const rest = prompts.filter((p) => p.part.id !== partId);
      setPrompts(rest);
      if (rest.length === 0) advance(next);
    },
    [prompts, advance, commit],
  );
  const answer = useCallback((partId: string, result: unknown) => settlePrompt(partId, { status: "done", result }), [settlePrompt]);
  const decline = useCallback((partId: string) => settlePrompt(partId, { status: "error", error: DECLINED }), [settlePrompt]);

  /** Declines whatever is waiting, e.g. because the user moved on. */
  const declineAll = useCallback(() => {
    for (const { messageId, part } of approvals) {
      const message = latest.current.messages.find((m) => m.id === messageId);
      if (message) commit(settleToolCall(message, part.id, { approval: "denied", status: "error", error: DECLINED }));
    }
    for (const message of latest.current.messages)
      for (const part of awaitingToolCalls(message)) commit(settleToolCall(message, part.id, { status: "error", error: DECLINED }));
    setApprovals([]);
    setPrompts([]);
  }, [approvals, commit]);

  const send = useCallback(
    (text: string, options: SendOptions = {}) => {
      const attachments = options.attachments ?? [];
      if (run.current || (!text.trim() && attachments.length === 0)) return;
      declineAll();
      loop.current = { options, step: 0 };
      const { messages } = latest.current;
      start([...messages, userMessage(text, messages.at(-1)?.id ?? null, attachments)], options);
    },
    [declineAll, start],
  );

  const stop = useCallback(() => {
    const current = run.current;
    if (!current) return declineAll();
    current.controller.abort();
    if (current.runId) void latest.current.transport.stop?.(current.runId);
  }, [declineAll]);

  const retry = useCallback(
    (assistantId: string, options: SendOptions = {}) => {
      if (run.current) return;
      const { messages } = latest.current;
      const index = messages.findIndex((m) => m.id === assistantId);
      if (index < 1 || messages[index - 1]!.role !== "user") return;
      setApprovals([]);
      setPrompts([]);
      loop.current = { options, step: 0 };
      start(messages.slice(0, index), options);
    },
    [start],
  );

  // Join a run already going, once (StrictMode runs the effect twice on the same refs).
  const joined = useRef(false);
  useEffect(() => {
    if (!resume || joined.current || run.current) return;
    const { transport, conversationId, messages } = latest.current;
    if (!transport.resume || conversationId === undefined) return;
    joined.current = true;
    const last = messages.at(-1);
    const history = last?.role === "assistant" && last.status === "streaming" ? messages.slice(0, -1) : messages;
    loop.current = { options: {}, step: 0 };
    // The stream rebuilds the reply; `message` is only the parent it answers.
    start(history, {}, undefined, true);
  }, [resume, start]);

  // Abort on a real unmount only. StrictMode unmounts and remounts synchronously, so a mount that follows
  // within the same tick cancels the abort.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) run.current?.controller.abort();
      });
    };
  }, []);

  return { messages, busy, approvals, respond, prompts, answer, decline, send, stop, retry };
}
