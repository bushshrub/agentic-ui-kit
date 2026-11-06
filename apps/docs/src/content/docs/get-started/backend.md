---
title: The backend
description: Connect the kit to your server with a Transport and a stream of events.
sidebar:
  order: 3
---

The kit talks to your backend through a `Transport`. `sseTransport` POSTs the request as JSON and reads a
`text/event-stream` of events back. Your server translates whatever model API it uses into these events:

```ts
import { formatEvent, type StreamEvent } from "agentic-ui-kit/core";
import type { SseRequestBody } from "agentic-ui-kit";

export async function POST(request: Request) {
  const body = (await request.json()) as SseRequestBody; // { message, history, model, tools, context, ... }
  const runId = crypto.randomUUID();
  let seq = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) =>
        controller.enqueue(new TextEncoder().encode(formatEvent({ ...event, runId, seq: seq++ } as StreamEvent)));

      send({ type: "run.start", messageId: crypto.randomUUID(), parentId: body.message.id, createdAt: new Date().toISOString() });
      send({ type: "part.start", part: { type: "text", id: "p1", text: "", status: "streaming" } });
      for await (const chunk of callYourModel(body.history)) send({ type: "part.delta", partId: "p1", text: chunk });
      send({ type: "part.end", partId: "p1" });
      send({ type: "run.end", status: "done" });
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream" } });
}
```

| Event        | Meaning                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| `run.start`  | A reply starts. Reusing an existing `messageId` continues that message (after tools ran).     |
| `part.start` | A new part: `text`, `thinking`, `tool_call`, attachments, or your own custom type. It is added as sent: a `status` of `done` or `error` counts as finished. |
| `part.delta` | Appends `text`, or `inputJson` for a tool call's arguments as the model writes them.          |
| `part.update`| Sets fields: `status`, `title`, `subtitle`, `result`, `error`, …                                |
| `part.end`   | Closes a part. A tool call's input is parsed here; invalid JSON fails the call.                |
| `run.usage`  | Token counts so far.                                                                             |
| `run.end`    | `done`, `stopped` or `error`.                                                                    |
| `title`      | A title for the conversation.                                                                    |

A tool call's `inputJson` is parsed into `input` only when the part closes: on `part.end`, on a `part.update`
with a status past `input`, or on `run.end` for a part still open. A `part.start` that arrives already `done`
is never parsed, so send its `input` yourself.

Every event carries `runId` and an increasing `seq`, so a client can resume a dropped stream. Not using SSE?
Implement `Transport` yourself: one `send(request)` that returns an async iterable of events.

## Joining a run already going

A page opened while a reply is still being written, or a chat just created whose reply has started, can join
that run: `useChat({ transport, conversationId, resume: true })` calls `transport.resume(conversationId, signal)`
once when the hook mounts. It survives React StrictMode's double mount. For `sseTransport`, give it a
`resumeUrl`:

```ts
const transport = sseTransport({ url: "/api/chat", stopUrl: "/api/stop", resumeUrl: "/api/chat/stream" });
// or: resumeUrl: (id) => `/api/chats/${id}/stream`
```

The kit sends `GET /api/chat/stream?conversationId=<id>` (same headers, no body). Answer with the same
`text/event-stream`, **replayed from the start of the run**: `run.start` first (same `runId` and `messageId`
as the live run), the parts so far, then the rest as they are produced, ending with `run.end`. The kit rebuilds
the reply from these events, replacing a trailing assistant message that is still streaming in
`initialMessages` (such as an empty placeholder). If nothing is running, answer 404 and the hook ends quietly
with no new message. Hosts with their own `Transport` implement `resume?(conversationId, signal)` the same way.
