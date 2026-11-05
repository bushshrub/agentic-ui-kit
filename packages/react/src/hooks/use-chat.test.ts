import type { StreamEvent } from "@agentic-ui-kit/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { useChat, type SendRequest, type Transport } from "./use-chat";

/** Replies "echo: <text>" in two deltas; `hold` keeps the run open until aborted. */
function echo({ hold = false } = {}): Transport & { requests: SendRequest[] } {
  const requests: SendRequest[] = [];
  let n = 0;
  return {
    requests,
    async *send(request) {
      requests.push(request);
      const runId = `r${n}`;
      const text = (request.message.parts[0] as { text: string }).text;
      const events: StreamEvent[] = [
        { type: "run.start", runId, seq: 0, messageId: `a${n++}`, parentId: request.message.id, createdAt: "2026-11-05T00:00:00Z" },
        { type: "part.start", runId, seq: 1, part: { type: "text", id: "p", text: "", status: "streaming" } },
        { type: "part.delta", runId, seq: 2, partId: "p", text: "echo: " },
      ];
      yield* events;
      if (hold) await new Promise((resolve) => request.signal.addEventListener("abort", resolve));
      yield { type: "part.delta", runId, seq: 3, partId: "p", text };
      yield { type: "part.end", runId, seq: 4, partId: "p" };
      yield { type: "run.end", runId, seq: 5, status: "done" };
    },
  };
}

const textOf = (m: { parts: { type: string; text?: string }[] }) => m.parts.map((p) => p.text ?? "").join("");

it("sends a message and streams the reply after it", async () => {
  const transport = echo();
  const { result } = renderHook(() => useChat({ transport }));
  act(() => result.current.send("hi", { model: "m1" }));
  await waitFor(() => expect(result.current.busy).toBe(false));
  const [user, reply] = result.current.messages;
  expect(textOf(user!)).toBe("hi");
  expect(reply).toMatchObject({ role: "assistant", status: "done", parentId: user!.id });
  expect(textOf(reply!)).toBe("echo: hi");
  expect(transport.requests[0]!.model).toBe("m1");
});

it("stop ends the reply as stopped and keeps what arrived", async () => {
  const { result } = renderHook(() => useChat({ transport: echo({ hold: true }) }));
  act(() => result.current.send("hi"));
  await waitFor(() => expect(result.current.messages).toHaveLength(2));
  act(() => result.current.stop());
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(result.current.messages[1]).toMatchObject({ status: "stopped" });
  expect(textOf(result.current.messages[1]!)).toBe("echo: ");
});

it("retry replaces the reply with a new one from the same user message", async () => {
  const { result } = renderHook(() => useChat({ transport: echo() }));
  act(() => result.current.send("hi"));
  await waitFor(() => expect(result.current.busy).toBe(false));
  const first = result.current.messages[1]!.id;
  act(() => result.current.retry(first));
  await waitFor(() => expect(result.current.messages[1]?.id).not.toBe(first));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(result.current.messages).toHaveLength(2);
  expect(textOf(result.current.messages[1]!)).toBe("echo: hi");
});
