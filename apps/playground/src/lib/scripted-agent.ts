import type { StreamEvent, ToolCallPart } from "@llm-chat/core";
import type { SendRequest, Transport } from "@llm-chat/react";

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
  });

export interface CallOptions {
  /** The page runs it: the run ends with the call awaiting. */
  runsOn?: "client";
  /** Ask the user first: the run ends with the call awaiting. */
  needsApproval?: boolean;
  /** A server tool's result, after `takes` ms. */
  result?: unknown;
  takes?: number;
  /** Input streaming pace: characters per delta and ms between deltas. */
  chunk?: number;
  delay?: number;
  /** Breaks the connection after this many input characters, to show a call that fails mid-stream. */
  failAfter?: number;
}

export interface Script {
  request: SendRequest;
  /** The last tool call of the message being continued; undefined for a new user message. */
  last: ToolCallPart | undefined;
  text(value: string): AsyncGenerator<StreamEvent>;
  thinking(title: string, value: string): AsyncGenerator<StreamEvent>;
  call(name: string, input: unknown, options?: CallOptions): AsyncGenerator<StreamEvent>;
  /** Finishes a server tool the user approved, e.g. `yield* finish(last, result)`. */
  finish(part: ToolCallPart, result: unknown, takes?: number): AsyncGenerator<StreamEvent>;
}

/**
 * A pretend backend that plays both the model and the server from a script. Server tools it "runs"
 * itself; client tools and approvals end the run awaiting, and the continuation request carries the
 * result. Scripts pick the next step from `last`, like a real backend reading the conversation.
 */
export function scriptedAgent(script: (s: Script) => AsyncGenerator<StreamEvent>, { speed = 1 } = {}): Transport {
  return {
    async *send(request) {
      const { signal } = request;
      const runId = `run_${Date.now().toString(36)}`;
      let seq = 0;
      let ids = 0;
      const id = (p: string) => `${p}_${runId}_${ids++}`;
      const ev = (e: Record<string, unknown>) => ({ runId, seq: seq++, ...e }) as StreamEvent;
      const pause = (ms: number) => wait(ms / speed, signal);
      const words = (value: string) => value.match(/\S+\s*/g) ?? [];

      const s: Script = {
        request,
        last: request.continuation ? request.message.parts.filter((p): p is ToolCallPart => p.type === "tool_call").at(-1) : undefined,
        async *text(value) {
          const partId = id("text");
          yield ev({ type: "part.start", part: { type: "text", id: partId, text: "", status: "streaming" } });
          for (const word of words(value)) {
            if (signal.aborted) return;
            yield ev({ type: "part.delta", partId, text: word });
            await pause(25 + Math.random() * 35);
          }
          yield ev({ type: "part.end", partId });
        },
        async *thinking(title, value) {
          const partId = id("think");
          const began = Date.now();
          yield ev({ type: "part.start", part: { type: "thinking", id: partId, text: "", status: "streaming", title, visibility: "summary" } });
          for (const word of words(value)) {
            if (signal.aborted) return;
            yield ev({ type: "part.delta", partId, text: word });
            await pause(18);
          }
          yield ev({ type: "part.end", partId, durationMs: Date.now() - began });
        },
        async *call(name, input, options = {}) {
          const partId = id("call");
          const json = JSON.stringify(input);
          yield ev({ type: "part.start", part: { type: "tool_call", id: partId, name, status: "input", inputJson: "", ...(options.runsOn && { runsOn: "client" }), ...(options.needsApproval && { needsApproval: true }) } });
          const chunk = options.chunk ?? 16;
          for (let i = 0; i < json.length; i += chunk) {
            if (signal.aborted) return;
            if (options.failAfter !== undefined && i >= options.failAfter) throw new Error("Connection to the model was lost");
            yield ev({ type: "part.delta", partId, inputJson: json.slice(i, i + chunk) });
            await pause(options.delay ?? 20);
          }
          if (options.runsOn || options.needsApproval) {
            yield ev({ type: "part.update", partId, status: "awaiting", input });
            return;
          }
          const takes = options.takes ?? 800;
          yield ev({ type: "part.update", partId, status: "running", input });
          await pause(takes);
          yield ev({ type: "part.end", partId, result: options.result, durationMs: takes });
        },
        async *finish(part, result, takes = 900) {
          yield ev({ type: "part.update", partId: part.id, status: "running" });
          await pause(takes);
          yield ev({ type: "part.end", partId: part.id, result, durationMs: takes });
        },
      };

      await pause(300);
      yield ev({
        type: "run.start",
        messageId: request.continuation ? request.message.id : id("msg"),
        parentId: request.continuation ? request.message.parentId : request.message.id,
        createdAt: new Date().toISOString(),
      });
      for await (const event of script(s)) {
        if (signal.aborted) return;
        yield event;
      }
      yield ev({ type: "run.end", status: "done" });
    },
  };
}
