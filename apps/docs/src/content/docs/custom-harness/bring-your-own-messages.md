---
title: Bring your own messages
description: "Skip useChat: reduce a replaying event stream into Message[] yourself and hand it to ChatView. For dashboards that watch many sessions."
sidebar:
  order: 3
---

`useChat` owns one conversation: it sends, streams, retries and runs the agent loop. A dashboard that watches
many long-lived sessions often wants something else. Its server already keeps each session's event history
and replays all of it over its own SSE endpoint; the page just has to draw it. For that, reduce the events
yourself with `agentic-ui-kit/core` and pass the resulting `Message[]` to `ChatView`, which only needs
messages and callbacks.

## The reducer

```ts
import { applyEvent, reduceEvents, readEventStream, type Message, type StreamEvent } from "agentic-ui-kit/core";
```

- `applyEvent(message, event)` applies one event to the assistant message that run builds. It is pure and
  returns the same object when nothing changed. An event whose `seq` is at or below `message.lastSeq` is
  dropped, so a replay that starts over after a reconnect adds nothing twice.
- `reduceEvents(events, initial?)` is the same over a whole list (a stored run, a fixture).
- `readEventStream(response.body)` turns an SSE response into an async iterator of `StreamEvent`s.

A message is built from one run, but a continuation (after approvals or client tools) is a second run that
carries on the same message, so key your state by `messageId`. Only `run.start` names it; the other events
carry the `runId`, so remember which message each run belongs to.

## Reducing as events arrive

```ts
interface Session {
  messages: Map<string, Message>; // by messageId, in order of first appearance
  runs: Map<string, string>; // runId -> messageId
}

function apply(session: Session, event: StreamEvent): Session {
  const messageId = event.type === "run.start" ? event.messageId : session.runs.get(event.runId);
  if (!messageId) return session; // an event for a run we never saw start: drop it
  const before = session.messages.get(messageId);
  const after = applyEvent(before, event);
  const runs = event.type === "run.start" ? new Map(session.runs).set(event.runId, messageId) : session.runs;
  if (after === before && runs === session.runs) return session; // unchanged: React skips the render
  // `after` is undefined only for events the reducer drops; keep the old message then.
  const messages = new Map(session.messages).set(messageId, after ?? before!);
  return { messages, runs };
}
```

Copying the two maps on every event is fine for a chat. With a long history, batch: collect the events that
arrive within one animation frame and fold them with a plain `for` loop before calling `setState` once.

The hook around it opens the stream, folds events in and closes on unmount:

```tsx
import { useEffect, useMemo, useState } from "react";
import { ChatView } from "agentic-ui-kit";

const empty: Session = { messages: new Map(), runs: new Map() };

function useSession(sessionId: string) {
  const [session, setSession] = useState(empty);
  useEffect(() => {
    setSession(empty);
    const abort = new AbortController();
    (async () => {
      const res = await fetch(`/api/sessions/${sessionId}/events`, { signal: abort.signal });
      if (!res.ok || !res.body) return;
      for await (const event of readEventStream(res.body)) setSession((s) => apply(s, event));
    })().catch(() => {}); // aborted on unmount; add your reconnect with the last seq here
    return () => abort.abort();
  }, [sessionId]);
  return session;
}
```

`readEventStream` ends when the server closes the stream. Reconnect from the last `seq` you applied (sent as
the SSE `id`, so `Last-Event-ID`) or just replay from the start: the `lastSeq` check makes the replay safe.

## Drawing it

Your own messages (what the user typed) do not come from the event stream. Keep them in your state or have
your server emit them in its history, and merge them with the assistant messages in order, each with `role`,
`parts` and `createdAt`.

```tsx
import { awaitingToolCalls } from "agentic-ui-kit/core";

const post = (url: string, body?: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });

function SessionView({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const messages = useMemo(() => [...session.messages.values()], [session.messages]);
  const busy = messages.at(-1)?.status === "streaming";
  const approvals = messages.flatMap((message) => awaitingToolCalls(message).map((part) => ({ messageId: message.id, part })));
  return (
    <ChatView
      messages={messages}
      busy={busy}
      approvals={approvals}
      onSend={(text) => void post(`/api/sessions/${sessionId}/messages`, { text })}
      onStop={() => void post(`/api/sessions/${sessionId}/stop`)}
      onApprove={(partId, granted) => void post(`/api/sessions/${sessionId}/approve`, { partId, granted })}
    />
  );
}
```

`ChatView` is controlled: it never sends anything itself.

- **Sending.** `onSend` is yours. POST the text to your server and let the reply come back through the same
  event stream you already watch. Nothing else to update; the new `run.start` appears as a message.
- **Stopping.** `onStop` posts to your stop endpoint; the run ends with `run.end` and a status.
- **Approvals.** A tool call waiting for the user has `status: "awaiting"`. `awaitingToolCalls(message)` lists
  them; `SessionView` above passes them to `approvals` and answers through your server in `onApprove`.


  The card stays until the server says it is settled: the call comes back from the agent as a part update
  with `approval` set (or the run continues). If you want the card to go away at once, apply the answer
  locally with `settleToolCall(message, partId, { approval: granted ? "granted" : "denied" })` on the stored
  message. Replayed history (calls that were awaiting long ago) should not show cards: only offer approvals for
  messages whose `status` is still open.
- **Retry, edit, feedback.** Leave `onRetry`, `onEdit` and `onFeedback` out and the buttons are not drawn.

See [Plugging in a harness](/custom-harness/plugging-in-a-harness/) for the events a server sends and how
approvals travel when you do use `useChat`, and [Backend](/get-started/backend/) for resuming a run.
