import { formatEvent, type StreamEvent } from "@agentic-ui-kit/core";
import { expect, it, vi } from "vitest";
import { sseTransport } from "./sse-transport";

const events: StreamEvent[] = [
  { type: "run.start", runId: "r", seq: 0, messageId: "a", parentId: "u", createdAt: "2026-01-01T00:00:00Z" },
  { type: "run.end", runId: "r", seq: 1, status: "done" },
];
const message = { id: "u", role: "user" as const, parentId: null, createdAt: "2026-01-01T00:00:00Z", status: "done" as const, parts: [] };

it("posts the request without the signal and yields the streamed events", async () => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(events.map(formatEvent).join(""), { headers: { "content-type": "text/event-stream" } }));
  const transport = sseTransport({ url: "/api/chat", headers: () => ({ authorization: "Bearer t" }), fetch: fetch as typeof globalThis.fetch });
  const out: StreamEvent[] = [];
  for await (const e of transport.send({ message, history: [message], model: "m", signal: new AbortController().signal })) out.push(e);
  expect(out).toEqual(events);
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe("/api/chat");
  expect(JSON.parse(String(init!.body))).toEqual({ message, history: [message], model: "m" });
  expect(new Headers(init!.headers).get("authorization")).toBe("Bearer t");
});

it("fails with the status when the backend errors", async () => {
  const fetch = vi.fn(async () => new Response("nope", { status: 502, statusText: "Bad Gateway" }));
  const transport = sseTransport({ url: "/api/chat", fetch: fetch as typeof globalThis.fetch });
  const run = async () => { for await (const _ of transport.send({ message, history: [message], signal: new AbortController().signal })); };
  await expect(run()).rejects.toThrow("/api/chat answered 502 Bad Gateway");
});

it("resume GETs the resume url with the conversation id and yields the replayed events", async () => {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(events.map(formatEvent).join(""), { headers: { "content-type": "text/event-stream" } }));
  const transport = sseTransport({ url: "/api/chat", resumeUrl: "/api/chat/resume", headers: { authorization: "Bearer t" }, fetch: fetch as typeof globalThis.fetch });
  const out: StreamEvent[] = [];
  for await (const e of transport.resume!("c 1", new AbortController().signal)) out.push(e);
  expect(out).toEqual(events);
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe("/api/chat/resume?conversationId=c%201");
  expect(init!.method).toBe("GET");
  expect(new Headers(init!.headers).get("authorization")).toBe("Bearer t");
});

it("has no resume without a resume url", () => {
  expect(sseTransport({ url: "/api/chat" }).resume).toBeUndefined();
});
