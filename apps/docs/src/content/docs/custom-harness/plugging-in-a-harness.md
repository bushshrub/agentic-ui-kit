---
title: Plugging in a harness
description: "Put any agent behind the chat: the two endpoints, the events to stream, and approvals. Worked example: Claude Code over ACP."
sidebar:
  order: 0
---

The chat talks to your backend through a `Transport`. The usual one is `sseTransport`: it POSTs each send
to your endpoint and reads back a stream of events. Your harness can be anything that can write those events:
your own model loop, a hosted agent, or a coding agent like Claude Code.

A working example lives in the repo at
[`examples/claude-code-acp`](https://github.com/bushshrub/agentic-ui-kit/tree/main/examples/claude-code-acp).
It runs Claude Code through the [Agent Client Protocol](https://agentclientprotocol.com) (ACP), with tool
calls, approvals, titles and stop. The bridge is one file of about 250 lines.

```sh
cd examples/claude-code-acp
pnpm dev                      # http://localhost:5180, Claude Code works in ./workspace
CLAUDE_CODE_MODEL=sonnet CLAUDE_CODE_CWD=~/code/app pnpm dev
```

It uses your Claude Code login. It defaults to Haiku and to the agent's `default` mode, which asks before
commands and edits.

## The web side

```tsx
import { ChatHeader, ChatView, sseTransport, useChat } from "agentic-ui-kit";

const transport = sseTransport({ url: "/api/chat", stopUrl: "/api/stop" });

function App() {
  const [title, setTitle] = useState("New chat");
  const chat = useChat({ transport, conversationId, onTitle: setTitle });
  return (
    <ChatView
      header={<ChatHeader title={title} />}
      messages={chat.messages}
      busy={chat.busy}
      onSend={(text) => chat.send(text)}
      onStop={chat.stop}
      approvals={chat.approvals}
      onApprove={chat.respond}
    />
  );
}
```

## The two endpoints

- `POST /api/chat` receives `{ conversationId, message, history, continuation, tools, context, model, effort }`.
  Answer with `text/event-stream`, one `formatEvent(event)` per event (from `agentic-ui-kit/core`).
- `POST /api/stop` receives `{ runId }`. Cancel that run, then end its stream with `run.end` `"stopped"`.

An agent that keeps its own history, like Claude Code, needs only the new `message`. Map each
`conversationId` to one agent session. A stateless model loop sends `history` instead.

## The events

Every event carries the `runId` and a `seq` that counts up from 0.

| Event | When |
| --- | --- |
| `run.start` `{ messageId, parentId, createdAt }` | First. `parentId` is the user message's id. |
| `part.start` `{ part }` | A new text, thinking or tool_call part begins. |
| `part.delta` `{ partId, text }` or `{ partId, inputJson }` | Streamed text, or a tool's input JSON. |
| `part.update` `{ partId, ...fields }` | Changes to a part, e.g. a tool's `input` or `title` that came later. |
| `part.end` `{ partId, result?, status?, error? }` | A part is complete. A tool's `result` goes here. |
| `title` `{ conversationId, title }` | Names the chat. |
| `run.end` `{ status, usage?, error? }` | Last. `status` is `"done"`, `"stopped"` or `"error"`. |

Name tool parts after the kit's tool views and they render as they should. For example, `bash` with input
`{ command, description }` and a string result shows as a command. The bridge maps Claude Code's `Bash`,
`WebSearch` and `WebFetch` this way.

## Approvals

To ask before a tool runs, set the call to `"awaiting"` with `needsApproval: true` and end the run with
`run.end` `"done"`. Put both on the `part.start`, or, as with Claude Code, send a `part.update` when the agent
asks for permission after the call has started. Keep the agent waiting.

The chat shows the request. When the user answers, `useChat` sends a continuation: the same assistant
message with `continuation: true`, and the call's `approval` set to `"granted"` or `"denied"`. Answer the agent,
then stream the rest of the turn with the **same** `messageId`. Its parts carry on where they left off.

In ACP terms, a `session/request_permission` request ends the run. The continuation then picks the
`allow_once` or `reject_once` option. If the user sends a new message instead, the bridge cancels the waiting
turn first.

## Testing without the agent

`server/bridge.test.ts` connects the bridge to a fake ACP agent in memory, built with the SDK's `agent()`.
It runs a turn that needs permission, once allowed and once rejected, with no Claude Code process.
