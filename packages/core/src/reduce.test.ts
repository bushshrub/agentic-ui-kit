import { describe, expect, it } from "vitest";
import type { StreamEvent } from "./events";
import { mathRun, stoppedRun } from "./fixtures";
import { activityTokens, applyEvent, awaitingToolCalls, reduceEvents, resolveEffort, settleToolCall } from "./reduce";
import type { Part, ToolCallPart } from "./types";

describe("reduceEvents", () => {
  it("builds the full message from a run", () => {
    const message = reduceEvents(mathRun)!;
    expect(message).toMatchObject({ id: "msg_a1", parentId: "msg_u1", status: "done", model: "claude-sonnet-5-5" });
    expect(message.usage?.outputTokens).toBe(612);
    expect(message.parts.map((p) => [p.type, p.status])).toEqual([
      ["tool_call", "done"],
      ["thinking", "done"],
      ["text", "done"],
    ]);
  });

  it("joins deltas and parses tool input on part.end", () => {
    const [tool, thinking, text] = reduceEvents(mathRun)!.parts;
    expect(tool).toMatchObject({
      input: { path: "/memories/preferences.md" },
      subtitle: "preferences.md",
      durationMs: 420,
    });
    expect(thinking).toMatchObject({ title: "Working out when the caffeine wears off" });
    expect(text?.type === "text" && text.text).toContain("```python\nfrom math import log2");
  });

  it("marks an open tool call as an error when the run is stopped", () => {
    const message = reduceEvents(stoppedRun)!;
    expect(message.status).toBe("stopped");
    const search = message.parts[1] as ToolCallPart;
    expect(search).toMatchObject({ status: "error", error: "Stopped", input: { query: "caffeine half-life range adults" } });
  });

  it("gives the same message when events are replayed after a reconnect", () => {
    const half = Math.floor(mathRun.length / 2);
    const partial = reduceEvents(mathRun.slice(0, half));
    const resumed = reduceEvents(mathRun.slice(half - 5), partial);
    expect(resumed).toEqual(reduceEvents(mathRun));
  });
});

describe("applyEvent", () => {
  const start: StreamEvent = { type: "run.start", runId: "r", seq: 0, messageId: "m", parentId: null, createdAt: "t" };
  const message = applyEvent(undefined, start)!;

  it("returns the same object for a repeated event", () => {
    expect(applyEvent(message, start)).toBe(message);
  });

  it("ignores events from another run", () => {
    const other: StreamEvent = { type: "run.end", runId: "other", seq: 5, status: "done" };
    expect(applyEvent(message, other)).toBe(message);
  });

  it("ignores fields that do not belong to the part's type", () => {
    const withText = reduceEvents(
      [
        { type: "part.start", runId: "r", seq: 1, part: { type: "text", id: "t", text: "", status: "streaming" } },
        { type: "part.end", runId: "r", seq: 2, partId: "t", result: "x", title: "y" },
      ],
      message,
    )!;
    expect(withText.parts[0]).toEqual({ type: "text", id: "t", text: "", status: "done" });
  });

  it("streams widget html from text deltas", () => {
    const widget = reduceEvents(
      [
        { type: "part.start", runId: "r", seq: 1, part: { type: "widget", id: "w", status: "streaming" } },
        { type: "part.delta", runId: "r", seq: 2, partId: "w", text: "<svg>" },
        { type: "part.delta", runId: "r", seq: 3, partId: "w", text: "</svg>" },
      ],
      message,
    )!;
    expect(widget.parts[0]).toMatchObject({ html: "<svg></svg>" });
  });
});

describe("activityTokens", () => {
  it("counts reasoning and tool input, not tool results", () => {
    const parts: Part[] = [
      { type: "thinking", id: "t", text: "x".repeat(40), status: "done" },
      { type: "tool_call", id: "c", name: "bash", status: "done", inputJson: "y".repeat(20), result: { stdout: "z".repeat(4000) } },
    ];
    expect(activityTokens(parts)).toBe(15);
  });
});

describe("resolveEffort", () => {
  const levels = [{ id: "low", label: "Low" }, { id: "high", label: "High" }];
  it("sends no effort for models without levels", () => {
    expect(resolveEffort({ id: "g", label: "G" }, "high")).toBeUndefined();
  });
  it("keeps a supported choice, else falls back to the model default", () => {
    expect(resolveEffort({ id: "q", label: "Q", efforts: levels, defaultEffort: "low" }, "high")).toBe("high");
    expect(resolveEffort({ id: "q", label: "Q", efforts: levels, defaultEffort: "low" }, "max")).toBe("low");
  });
});

describe("client tools and continuations", () => {
  const base = (status: "done" | "stopped") => {
    const events: StreamEvent[] = [
      { type: "run.start", runId: "r1", seq: 0, messageId: "m1", parentId: "u1", createdAt: "2026-01-01T00:00:00Z" },
      { type: "part.start", runId: "r1", seq: 1, part: { type: "tool_call", id: "t1", name: "fill", status: "input", inputJson: "", runsOn: "client" } },
      { type: "part.delta", runId: "r1", seq: 2, partId: "t1", inputJson: '{"a":1}' },
      { type: "part.update", runId: "r1", seq: 3, partId: "t1", status: "awaiting" },
      { type: "run.end", runId: "r1", seq: 4, status },
    ];
    return reduceEvents(events)!;
  };

  it("keeps an awaiting call open when the run finishes, with its input parsed", () => {
    const m = base("done");
    expect(awaitingToolCalls(m).map((p) => [p.id, p.input])).toEqual([["t1", { a: 1 }]]);
  });

  it("cancels an awaiting call when the run is stopped", () => {
    expect(awaitingToolCalls(base("stopped"))).toEqual([]);
  });

  it("continues the same message on a run.start with its id", () => {
    const settled = settleToolCall(base("done"), "t1", { status: "done", result: "ok" });
    const next = applyEvent(settled, { type: "run.start", runId: "r2", seq: 0, messageId: "m1", parentId: "u1", createdAt: "2026-01-01T00:00:01Z" })!;
    expect(next.status).toBe("streaming");
    expect(next.parts).toHaveLength(1);
    const after = applyEvent(next, { type: "part.start", runId: "r2", seq: 1, part: { type: "text", id: "x", text: "Done.", status: "streaming" } })!;
    expect(after.parts.map((p) => p.id)).toEqual(["t1", "x"]);
  });
});

describe("streamed tool input", () => {
  const start: StreamEvent[] = [
    { type: "run.start", runId: "r", seq: 0, messageId: "m", parentId: null, createdAt: "2026-01-01T00:00:00Z" },
    { type: "part.start", runId: "r", seq: 1, part: { type: "tool_call", id: "t", name: "propose_events", status: "input", inputJson: "" } },
    { type: "part.delta", runId: "r", seq: 2, partId: "t", inputJson: '{"events":[{"title":"Stand-up","day":"Tu' },
  ];

  it("exposes the fields written so far while the input streams", () => {
    const part = reduceEvents(start)!.parts[0] as ToolCallPart;
    expect(part.partialInput).toEqual({ events: [{ title: "Stand-up", day: "Tu" }] });
    expect(part.input).toBeUndefined();
  });

  it("swaps the partial view for the parsed input once complete", () => {
    const part = reduceEvents([...start, { type: "part.delta", runId: "r", seq: 3, partId: "t", inputJson: 'e"}]}' }, { type: "part.update", runId: "r", seq: 4, partId: "t", status: "running" }])!.parts[0] as ToolCallPart;
    expect(part).toMatchObject({ status: "running", input: { events: [{ title: "Stand-up", day: "Tue" }] } });
    expect(part).not.toHaveProperty("partialInput");
  });

  it("fails a call whose stream breaks mid-input, and one whose input is not valid JSON", () => {
    const broken = reduceEvents([...start, { type: "run.end", runId: "r", seq: 3, status: "error", error: "connection lost" }])!.parts[0] as ToolCallPart;
    expect(broken.status).toBe("error");
    const invalid = reduceEvents([...start, { type: "part.end", runId: "r", seq: 3, partId: "t" }])!.parts[0] as ToolCallPart;
    expect(invalid).toMatchObject({ status: "error", error: expect.stringContaining("not valid JSON") });
  });
});

it("keeps a tool call's display data apart from its result", () => {
  const message = reduceEvents([
    { type: "run.start", runId: "r", seq: 0, messageId: "m", parentId: null, createdAt: "t" },
    { type: "part.start", runId: "r", seq: 1, messageId: "m", part: { type: "tool_call", id: "c", name: "find_jobs", status: "running", inputJson: "{}" } },
    { type: "part.end", runId: "r", seq: 2, messageId: "m", partId: "c", result: "3 jobs found", data: { jobs: [{ id: 1 }] } },
  ] as StreamEvent[])!;
  expect(message.parts[0]).toMatchObject({ result: "3 jobs found", data: { jobs: [{ id: 1 }] } });
});
