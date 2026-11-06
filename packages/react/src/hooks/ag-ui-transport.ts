import { agUiResume, fromAgUiEvents, readEventStream, toAgUiMessages, type AgUiEvent, type AgUiInterrupt, type RunAgentInput, type StreamEvent } from "@agentic-ui-kit/core";
import type { SendRequest, Transport } from "./use-chat";

export interface AgUiTransportOptions {
  /** The agent's AG-UI endpoint. Gets a `RunAgentInput` as JSON and answers with AG-UI events over SSE. */
  url: string;
  /** Extra headers, e.g. auth. A function is called per request. */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  /** The AG-UI thread. Defaults to the conversation id, else one id per transport. */
  threadId?: string;
  /** Shared state sent with each run. AG-UI agents send theirs back as STATE_SNAPSHOT / STATE_DELTA (see `onEvent`). */
  state?: () => unknown;
  /** Extra data for the agent. Defaults to `{ model, effort }` when the request has them. */
  forwardedProps?: (request: SendRequest) => unknown;
  /** CUSTOM event names to show as custom parts, rendered by the `renderers` registered for that kind. */
  customKinds?: string[];
  /** Every AG-UI event as it arrives, including the ones the kit does not show (state, steps, activity). */
  onEvent?: (event: AgUiEvent) => void;
  /** Interrupts the run ends with. Ones tied to a tool call are also shown as an approval. */
  onInterrupt?: (interrupt: AgUiInterrupt) => void;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/**
 * A `Transport` for agents that speak AG-UI (https://docs.ag-ui.com) over HTTP + SSE, e.g. LangGraph, Mastra,
 * CrewAI, Pydantic AI or ADK agents. Page tools (`useAgentTool`) are sent as AG-UI frontend tools and page
 * context as AG-UI context. An interrupt on a tool call asks the user, and the answer resumes the run.
 * AG-UI has no stop or rejoin endpoint: Stop closes the stream, and `useChat({ resume: true })` does nothing.
 */
export function agUiTransport({ url, headers, threadId, state, forwardedProps, customKinds, onEvent, onInterrupt, fetch: fetchImpl = fetch }: AgUiTransportOptions): Transport {
  const ownThread = crypto.randomUUID();
  // Interrupts waiting on the user, by tool call id, until the continuation resumes them.
  const interrupts = new Map<string, AgUiInterrupt>();
  return {
    async *send(request: SendRequest): AsyncIterable<StreamEvent> {
      const { message, history, continuation, tools = [], context = {}, signal } = request;
      const resume = continuation ? agUiResume(message, interrupts) : [];
      const resumed = new Set(continuation ? message.parts.filter((p) => interrupts.has(p.id)).map((p) => p.id) : []);
      for (const id of resumed) interrupts.delete(id);
      const props = forwardedProps ? forwardedProps(request) : { ...(request.model !== undefined && { model: request.model }), ...(request.effort !== undefined && { effort: request.effort }) };
      const input: RunAgentInput = {
        threadId: threadId ?? request.conversationId ?? ownThread,
        runId: crypto.randomUUID(),
        messages: toAgUiMessages(history, resumed),
        tools: tools.map((t) => ({ name: t.name, description: t.description ?? "", parameters: t.inputSchema ?? { type: "object", properties: {} } })),
        context: Object.entries(context).map(([description, value]) => ({ description, value: typeof value === "string" ? value : JSON.stringify(value) })),
        ...(state && { state: state() }),
        ...(Object.keys(props ?? {}).length > 0 && { forwardedProps: props }),
        ...(resume.length > 0 && { resume }),
      };
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream", ...Object.fromEntries(new Headers(typeof headers === "function" ? await headers() : headers)) },
        body: JSON.stringify(input),
        signal,
      });
      if (!response.ok || !response.body) throw new Error(`${url} answered ${response.status} ${response.statusText}`.trim());
      yield* fromAgUiEvents(readEventStream<AgUiEvent>(response.body), {
        messageId: continuation ? message.id : crypto.randomUUID(),
        parentId: continuation ? message.parentId : message.id,
        clientTools: tools.map((t) => t.name),
        ...(continuation && { existing: message.parts.map((p) => p.id) }),
        ...(customKinds && { customKinds }),
        ...(onEvent && { onEvent }),
        onInterrupt: (interrupt) => {
          if (interrupt.toolCallId) interrupts.set(interrupt.toolCallId, interrupt);
          onInterrupt?.(interrupt);
        },
        signal,
      });
    },
  };
}
