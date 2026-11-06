import { describe, expect, it } from "vitest";
import { agUiResume, fromAgUiEvents, toAgUiMessages, type AgUiEvent, type AgUiInterrupt, type AgUiTranslateOptions } from "./ag-ui";
import type { StreamEvent } from "./events";
import { reduceEvents } from "./reduce";
import type { Message } from "./types";

async function translate(events: AgUiEvent[], options: Partial<AgUiTranslateOptions> = {}): Promise<StreamEvent[]> {
  async function* source() {
    yield* events;
  }
  const out: StreamEvent[] = [];
  for await (const e of fromAgUiEvents(source(), { messageId: "a", parentId: "u", now: () => 1000, ...options })) out.push(e);
  return out;
}

const started = { type: "RUN_STARTED", threadId: "t", runId: "r" };
const finished = { type: "RUN_FINISHED", threadId: "t", runId: "r" };

describe("fromAgUiEvents", () => {
  it("builds one assistant message from text, reasoning and a server tool call", async () => {
    const events = await translate([
      started,
      { type: "REASONING_START", messageId: "th" },
      { type: "REASONING_MESSAGE_START", messageId: "th", role: "reasoning" },
      { type: "REASONING_MESSAGE_CONTENT", messageId: "th", delta: "Hmm" },
      { type: "REASONING_MESSAGE_END", messageId: "th" },
      { type: "REASONING_END", messageId: "th" },
      { type: "TOOL_CALL_START", toolCallId: "c1", toolCallName: "search", parentMessageId: "m1" },
      { type: "TOOL_CALL_ARGS", toolCallId: "c1", delta: '{"q":' },
      { type: "TOOL_CALL_ARGS", toolCallId: "c1", delta: '"x"}' },
      { type: "TOOL_CALL_END", toolCallId: "c1" },
      { type: "TOOL_CALL_RESULT", messageId: "tr", toolCallId: "c1", content: '{"hits":2}' },
      { type: "TEXT_MESSAGE_START", messageId: "m2", role: "assistant" },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "m2", delta: "Two " },
      { type: "TEXT_MESSAGE_CONTENT", messageId: "m2", delta: "hits." },
      { type: "TEXT_MESSAGE_END", messageId: "m2" },
      { type: "STATE_SNAPSHOT", snapshot: {} },
      finished,
    ]);
    expect(events[0]).toMatchObject({ type: "run.start", runId: "r", messageId: "a", parentId: "u" });
    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i));
    const message = reduceEvents(events)!;
    expect(message.status).toBe("done");
    expect(message.parts).toMatchObject([
      { type: "thinking", text: "Hmm", status: "done" },
      { type: "tool_call", name: "search", input: { q: "x" }, result: { hits: 2 }, status: "done", runsOn: "server" },
      { type: "text", text: "Two hits.", status: "done" },
    ]);
  });

  it("expands chunk events and closes each when another event comes", async () => {
    const message = reduceEvents(
      await translate([
        started,
        { type: "TEXT_MESSAGE_CHUNK", messageId: "m", delta: "Hi" },
        { type: "TEXT_MESSAGE_CHUNK", delta: " there" },
        { type: "TOOL_CALL_CHUNK", toolCallId: "c", toolCallName: "lookup", delta: "{}" },
        { type: "TOOL_CALL_RESULT", messageId: "x", toolCallId: "c", content: "plain text" },
        finished,
      ]),
    )!;
    expect(message.parts).toMatchObject([
      { type: "text", text: "Hi there", status: "done" },
      { type: "tool_call", name: "lookup", input: {}, result: "plain text", status: "done" },
    ]);
  });

  it("leaves a page tool's call awaiting so the page runs it", async () => {
    const message = reduceEvents(
      await translate(
        [started, { type: "TOOL_CALL_START", toolCallId: "c", toolCallName: "pick" }, { type: "TOOL_CALL_ARGS", toolCallId: "c", delta: '{"n":1}' }, { type: "TOOL_CALL_END", toolCallId: "c" }, finished],
        { clientTools: ["pick"] },
      ),
    )!;
    expect(message.parts[0]).toMatchObject({ status: "awaiting", runsOn: "client", input: { n: 1 } });
  });

  it("turns a tool call interrupt into an approval", async () => {
    const seen: AgUiInterrupt[] = [];
    const interrupt = { id: "i1", reason: "tool_approval", toolCallId: "c" };
    const message = reduceEvents(
      await translate(
        [started, { type: "TOOL_CALL_START", toolCallId: "c", toolCallName: "delete" }, { type: "TOOL_CALL_END", toolCallId: "c" }, { ...finished, outcome: { type: "interrupt", interrupts: [interrupt] } }],
        { onInterrupt: (i) => seen.push(i) },
      ),
    )!;
    expect(message.parts[0]).toMatchObject({ status: "awaiting", needsApproval: true });
    expect(seen).toEqual([interrupt]);
  });

  it("does not replay a resumed call's input but takes its result", async () => {
    const before: Message = {
      id: "a",
      parentId: "u",
      role: "assistant",
      status: "done",
      createdAt: "",
      parts: [{ type: "tool_call", id: "c", name: "delete", status: "running", inputJson: "{}", input: {}, approval: "granted" }],
    };
    const events = await translate(
      [started, { type: "TOOL_CALL_START", toolCallId: "c", toolCallName: "delete" }, { type: "TOOL_CALL_ARGS", toolCallId: "c", delta: "{}" }, { type: "TOOL_CALL_RESULT", messageId: "x", toolCallId: "c", content: "ok" }, finished],
      { existing: ["c"] },
    );
    expect(reduceEvents(events, before)!.parts).toMatchObject([{ id: "c", inputJson: "{}", status: "done", result: "ok" }]);
  });

  it("maps CUSTOM events to custom parts only for the listed kinds", async () => {
    const message = reduceEvents(
      await translate([started, { type: "CUSTOM", name: "job_row", value: { id: 1 } }, { type: "CUSTOM", name: "internal", value: 1 }, finished], { customKinds: ["job_row"] }),
    )!;
    expect(message.parts).toMatchObject([{ type: "custom", kind: "job_row", data: { id: 1 }, status: "done" }]);
  });

  it("ends with an error on RUN_ERROR and when the stream stops early", async () => {
    expect((await translate([started, { type: "RUN_ERROR", message: "boom" }])).at(-1)).toMatchObject({ type: "run.end", status: "error", error: "boom" });
    expect(reduceEvents(await translate([{ type: "TEXT_MESSAGE_START", messageId: "m" }]))).toMatchObject({ status: "error" });
    const aborted = new AbortController();
    aborted.abort();
    expect((await translate([started], { signal: aborted.signal })).map((e) => e.type)).toEqual(["run.start"]);
  });

  it("shows reasoning without messages as hidden thinking with its duration", async () => {
    let t = 0;
    const message = reduceEvents(await translate([started, { type: "REASONING_START", messageId: "r" }, { type: "REASONING_END", messageId: "r" }, finished], { now: () => (t += 500) }))!;
    expect(message.parts).toMatchObject([{ type: "thinking", visibility: "hidden", durationMs: 500 }]);
  });
});

describe("toAgUiMessages", () => {
  const user: Message = {
    id: "u",
    parentId: null,
    role: "user",
    status: "done",
    createdAt: "",
    parts: [
      { type: "text", id: "t", text: "Look", status: "done" },
      { type: "attachment", id: "f", status: "done", fileId: "f", name: "a.png", mime: "image/png", size: 1, url: "https://x/a.png" },
    ],
  };
  const reply: Message = {
    id: "a",
    parentId: "u",
    role: "assistant",
    status: "done",
    createdAt: "",
    parts: [
      { type: "thinking", id: "th", text: "hm", status: "done" },
      { type: "text", id: "t1", text: "Checking.", status: "done" },
      { type: "tool_call", id: "c1", name: "search", status: "done", inputJson: '{"q":"x"}', result: { hits: 2 } },
      { type: "tool_call", id: "c2", name: "pick", status: "error", inputJson: "{}", error: "Declined by the user" },
      { type: "text", id: "t2", text: "Done.", status: "done" },
    ],
  };

  it("splits a reply at text after tool calls and adds tool messages", () => {
    expect(toAgUiMessages([user, reply])).toEqual([
      { id: "u", role: "user", content: [{ type: "text", text: "Look" }, { type: "binary", mimeType: "image/png", url: "https://x/a.png", filename: "a.png" }] },
      {
        id: "a",
        role: "assistant",
        content: "Checking.",
        toolCalls: [
          { id: "c1", type: "function", function: { name: "search", arguments: '{"q":"x"}' } },
          { id: "c2", type: "function", function: { name: "pick", arguments: "{}" } },
        ],
      },
      { id: "c1:result", role: "tool", toolCallId: "c1", content: '{"hits":2}' },
      { id: "c2:result", role: "tool", toolCallId: "c2", content: "Declined by the user", error: "Declined by the user" },
      { id: "a:3", role: "assistant", content: "Done." },
    ]);
  });

  it("leaves out tool messages for calls answered by resume", () => {
    expect(toAgUiMessages([reply], new Set(["c2"])).filter((m) => m.role === "tool").map((m) => m.id)).toEqual(["c1:result"]);
  });
});

it("agUiResume resolves granted and cancels denied interrupted calls", () => {
  const message: Message = {
    id: "a",
    parentId: "u",
    role: "assistant",
    status: "done",
    createdAt: "",
    parts: [
      { type: "tool_call", id: "c1", name: "x", status: "running", inputJson: "{}", approval: "granted" },
      { type: "tool_call", id: "c2", name: "y", status: "error", inputJson: "{}", approval: "denied" },
      { type: "tool_call", id: "c3", name: "z", status: "done", inputJson: "{}" },
    ],
  };
  const interrupts = new Map([
    ["c1", { id: "i1", reason: "approve" }],
    ["c2", { id: "i2", reason: "approve" }],
  ]);
  expect(agUiResume(message, interrupts)).toEqual([
    { interruptId: "i1", status: "resolved", payload: { approved: true } },
    { interruptId: "i2", status: "cancelled" },
  ]);
});
