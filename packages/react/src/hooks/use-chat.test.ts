import type { Message, StreamEvent } from "@agentic-ui-kit/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
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

/** A transport whose only way to a reply is joining the run that is already going. */
function joinable(): Transport & { joined: string[]; sends: number } {
  const t = {
    joined: [] as string[],
    sends: 0,
    // eslint-disable-next-line require-yield
    async *send() {
      t.sends++;
    },
    async *resume(conversationId: string) {
      t.joined.push(conversationId);
      const runId = "r";
      yield { type: "run.start", runId, seq: 0, messageId: "a", parentId: "u", createdAt: "2026-11-05T00:00:00Z" } as const;
      yield { type: "part.start", runId, seq: 1, part: { type: "text", id: "p", text: "", status: "streaming" } } as const;
      yield { type: "part.delta", runId, seq: 2, partId: "p", text: "so far" } as const;
      yield { type: "part.end", runId, seq: 3, partId: "p" } as const;
      yield { type: "run.end", runId, seq: 4, status: "done" } as const;
    },
  };
  return t;
}

const asked = (): Message => ({ id: "u", parentId: null, role: "user", status: "done", createdAt: "2026-11-05T00:00:00Z", parts: [{ type: "text", id: "t", text: "hi", status: "done" }] });
const placeholder = (): Message => ({ id: "awaited", parentId: "u", role: "assistant", status: "streaming", createdAt: "2026-11-05T00:00:00Z", parts: [] });

it("resume joins the running reply and replaces an empty placeholder", async () => {
  const transport = joinable();
  const { result } = renderHook(() => useChat({ transport, conversationId: "c1", initialMessages: [asked(), placeholder()], resume: true }));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(transport.joined).toEqual(["c1"]);
  expect(transport.sends).toBe(0);
  expect(result.current.messages.map((m) => m.id)).toEqual(["u", "a"]);
  expect(textOf(result.current.messages[1]!)).toBe("so far");
  expect(result.current.messages[1]).toMatchObject({ status: "done" });
});

it("resume survives the StrictMode double mount and joins once", async () => {
  const transport = joinable();
  const { result } = renderHook(() => useChat({ transport, conversationId: "c1", initialMessages: [asked()], resume: true }), { wrapper: StrictMode });
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(transport.joined).toHaveLength(1);
  expect(result.current.messages[1]).toMatchObject({ status: "done" });
  expect(textOf(result.current.messages[1]!)).toBe("so far");
});

it("a send from a mount effect survives StrictMode; a real unmount aborts", async () => {
  const transport = echo({ hold: true });
  const { result, unmount } = renderHook(
    () => {
      const chat = useChat({ transport });
      useEffect(() => chat.send("hi"), []);
      return chat;
    },
    { wrapper: StrictMode },
  );
  await waitFor(() => expect(result.current.messages).toHaveLength(2));
  expect(transport.requests).toHaveLength(1);
  expect(transport.requests[0]!.signal.aborted).toBe(false);
  unmount();
  await waitFor(() => expect(transport.requests[0]!.signal.aborted).toBe(true));
});

it("resume with nothing running ends quietly and keeps the conversation", async () => {
  // eslint-disable-next-line require-yield
  const transport: Transport = { async *send() {}, async *resume() { throw new Error("404 Not Found"); } };
  const { result } = renderHook(() => useChat({ transport, conversationId: "c1", initialMessages: [asked()], resume: true }));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(result.current.messages.map((m) => m.id)).toEqual(["u"]);
});
