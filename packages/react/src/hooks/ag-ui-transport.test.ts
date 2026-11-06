import { reduceEvents, settleToolCall, type AgUiEvent, type Message, type StreamEvent } from "@agentic-ui-kit/core";
import { expect, it, vi } from "vitest";
import { agUiTransport } from "./ag-ui-transport";

const user: Message = { id: "u", role: "user", parentId: null, createdAt: "", status: "done", parts: [{ type: "text", id: "t", text: "Hi", status: "done" }] };
const sse = (events: AgUiEvent[]) => new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""), { headers: { "content-type": "text/event-stream" } });
const collect = async (events: AsyncIterable<StreamEvent>) => {
  const out: StreamEvent[] = [];
  for await (const e of events) out.push(e);
  return out;
};

it("posts a RunAgentInput with page tools and context and translates the reply", async () => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) =>
    sse([
      { type: "RUN_STARTED", threadId: "c", runId: "r" },
      { type: "TEXT_MESSAGE_START", messageId: "m", role: "assistant" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "Hello" },
      { type: "TEXT_MESSAGE_END", messageId: "m" },
      { type: "RUN_FINISHED", threadId: "c", runId: "r" },
    ]),
  );
  const transport = agUiTransport({ url: "/agent", headers: { authorization: "Bearer t" }, fetch: fetch as typeof globalThis.fetch });
  const events = await collect(
    transport.send({ conversationId: "c", message: user, history: [user], tools: [{ name: "pick", description: "Pick one" }], context: { page: "jobs", filters: { remote: true } }, model: "m1", signal: new AbortController().signal }),
  );
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe("/agent");
  expect(new Headers(init!.headers).get("authorization")).toBe("Bearer t");
  expect(new Headers(init!.headers).get("accept")).toBe("text/event-stream");
  expect(JSON.parse(String(init!.body))).toMatchObject({
    threadId: "c",
    messages: [{ id: "u", role: "user", content: "Hi" }],
    tools: [{ name: "pick", description: "Pick one", parameters: { type: "object", properties: {} } }],
    context: [
      { description: "page", value: "jobs" },
      { description: "filters", value: '{"remote":true}' },
    ],
    forwardedProps: { model: "m1" },
  });
  expect(reduceEvents(events)).toMatchObject({ parentId: "u", status: "done", parts: [{ type: "text", text: "Hello" }] });
});

it("resumes an interrupted tool call with the user's approval on the same message", async () => {
  const fetch = vi
    .fn(async (_url: string, _init?: RequestInit) => new Response())
    .mockResolvedValueOnce(
      sse([
        { type: "RUN_STARTED", threadId: "c", runId: "r1" },
        { type: "TOOL_CALL_START", toolCallId: "c1", toolCallName: "delete" },
        { type: "TOOL_CALL_ARGS", toolCallId: "c1", delta: "{}" },
        { type: "TOOL_CALL_END", toolCallId: "c1" },
        { type: "RUN_FINISHED", threadId: "c", runId: "r1", outcome: { type: "interrupt", interrupts: [{ id: "i1", reason: "tool_approval", toolCallId: "c1" }] } },
      ]),
    )
    .mockResolvedValueOnce(
      sse([
        { type: "RUN_STARTED", threadId: "c", runId: "r2" },
        { type: "TOOL_CALL_RESULT", messageId: "x", toolCallId: "c1", content: "deleted" },
        { type: "RUN_FINISHED", threadId: "c", runId: "r2" },
      ]),
    );
  const transport = agUiTransport({ url: "/agent", threadId: "c", fetch: fetch as typeof globalThis.fetch });
  const first = reduceEvents(await collect(transport.send({ message: user, history: [user], signal: new AbortController().signal })))!;
  expect(first.parts[0]).toMatchObject({ status: "awaiting", needsApproval: true });

  // What useChat does once the user approves an awaiting server tool.
  const approved = settleToolCall(settleToolCall(first, "c1", { approval: "granted" }), "c1", { status: "running" });
  const second = await collect(transport.send({ message: approved, history: [user, approved], continuation: true, signal: new AbortController().signal }));
  const body = JSON.parse(String(fetch.mock.calls[1]![1]!.body));
  expect(body.resume).toEqual([{ interruptId: "i1", status: "resolved", payload: { approved: true } }]);
  expect(body.messages.filter((m: { role: string }) => m.role === "tool")).toEqual([]);
  expect(second[0]).toMatchObject({ type: "run.start", messageId: first.id });
  expect(reduceEvents(second, approved)!.parts).toMatchObject([{ id: "c1", status: "done", result: "deleted" }]);
});
