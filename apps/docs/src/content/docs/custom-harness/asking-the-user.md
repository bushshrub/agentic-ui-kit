---
title: Asking the user
description: "Let the model ask questions with the ask_user tool: single choice, multiple choice and ranking, answered in a prompt over the composer."
sidebar:
  order: 4
---

`ask_user` lets the model stop and ask the user one to four questions before it goes on. The prompt appears
over the composer. Each question is one of:

- **single**: numbered rows. A number key or a click picks the answer and moves on.
- **multiple**: checkboxes with a "2 selected" count and an arrow to go on.
- **rank**: rows with drag handles ("Drag to re-order"). Alt with the arrow keys moves a row.

Every question also has a "Something else" text row and Skip. A pager ("1 of 3") goes back and forth, the close
button (or Escape) declines everything, and typing in the composer does the same: its placeholder changes to
"Or reply directly…". Once answered, a card in the message lists each question and its answer.

The kit is UI only, so your harness brings the tool. The kit ships the definition and the views.

## 1. Give the model the tool

`askUserTool` is a tool definition with a name, a JSON schema and a short description, like `visualizeTool`:

```ts
import { askUserTool } from "agentic-ui-kit/core";

// Add it to the tools you send the model. Same shape as a page tool's ToolSpec.
tools.push(askUserTool);
```

The input is `{ questions: [{ question, kind?, options }] }`, with `kind` one of `"single"` (default),
`"multiple"` or `"rank"`.

## 2. End the run when the model calls it

The tool runs in the browser, so do not execute it. Stream the call like any other, with `runsOn: "client"`,
set it to `"awaiting"` once its input is complete and end the run with `run.end` `"done"`:

```ts
yield { type: "part.start", runId, seq: seq++, part: { type: "tool_call", id, name: "ask_user", status: "input", inputJson: "", runsOn: "client" } };
yield { type: "part.delta", runId, seq: seq++, partId: id, inputJson: json };
yield { type: "part.update", runId, seq: seq++, partId: id, status: "awaiting", input };
yield { type: "run.end", runId, seq: seq++, status: "done" };
```

The chat shows the prompt. When the user answers, `useChat` sends a continuation request (the same one it
sends after an approval): `continuation: true`, and `message` is the assistant message with the call now
`status: "done"` and its `result` set, or `status: "error"` if declined. Hand that to the model as the tool
result and stream the rest of the turn with the **same** `messageId`.

## 3. Show it

`useChat` and `ChatView` do the wiring. `ask_user` is part of `defaultToolViews`; if you pass your own
`ToolViewsProvider`, include it (`{ ...defaultToolViews, mine }` or `{ ask_user: askUserToolView }`).

```tsx
const chat = useChat({ transport }); // promptTools defaults to ["ask_user"]

<ChatView
  messages={chat.messages}
  busy={chat.busy}
  onSend={chat.send}
  approvals={chat.approvals}
  onApprove={chat.respond}
  prompts={chat.prompts}
  onAnswer={chat.answer}
  onDecline={chat.decline}
/>;
```

All text comes from [labels](/get-started/theming/), keys starting with `askUser`.

## What the model receives

| User did | Tool call | The model gets |
| --- | --- | --- |
| Answered every question | `status: "done"` | `result`: `{ answers: [...] }` |
| Skipped a question | same | that entry has `skipped: true` and no `answer` |
| Closed the prompt, or typed a reply in the composer | `status: "error"` | the error `"Declined by the user"`; no result |

An answer is `{ question, kind, answer }`, with `answer`:

- single: the option's text, or the free text typed under "Something else";
- multiple: an array of the chosen options' texts (free text added at the end);
- rank: an array of all options, best first.

```json
{
  "answers": [
    { "question": "Which database?", "kind": "single", "answer": "SQLite" },
    { "question": "Which features?", "kind": "multiple", "answer": ["Sign in", "Billing"] },
    { "question": "Rank what matters", "kind": "rank", "answer": ["Cheap to run", "Fast to ship"] },
    { "question": "Anything else?", "kind": "single", "skipped": true }
  ]
}
```

The types are `AskUserInput`, `AskUserAnswer` and `AskUserResult` in `agentic-ui-kit/core`, with
`readAskUserInput` and `readAskUserResult` to read them defensively.

When the user replies in the composer, the reply is sent as a normal new message after the declined call, so the
model sees the question was not answered and what the user said instead.

## Without `useChat`

If you manage messages yourself (see [Bring your own messages](/custom-harness/bring-your-own-messages/)),
three things are yours:

1. Find the pending calls: `awaitingToolCalls(message)` filtered to the tools whose view has a `Prompt`.
2. Render `<ToolPromptCard prompt={{ messageId, part }} onAnswer={...} onDecline={...} />` above your composer,
   or pass them to `ChatView` as `prompts`, `onAnswer` and `onDecline`.
3. On answer, settle the call and send the continuation:
   `settleToolCall(message, partId, { status: "done", result })`, or
   `{ status: "error", error: "Declined by the user" }` to decline, then post the updated message to your
   backend as a continuation. When the user sends a message instead, settle all pending prompts as declined first.

## Your own question tools

`ask_user` is a tool view with a `Prompt`: a component that gets `{ part, onSubmit, onDecline }` while the call
is awaiting. What it passes to `onSubmit` becomes the call's `result`. Register the view on any client tool and
list the tool in `useChat({ promptTools })` (tools registered with `useChatTool` whose view has a `Prompt` are
found without it):

```tsx
const pickDate: ToolView = {
  Prompt: ({ onSubmit, onDecline }) => <DatePicker onPick={(date) => onSubmit({ date })} onCancel={onDecline} />,
  Block: ({ part }) => <p>Picked {(part.result as { date: string }).date}</p>,
};
```
