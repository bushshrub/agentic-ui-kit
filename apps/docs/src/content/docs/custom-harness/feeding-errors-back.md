---
title: Feeding errors back
description: Check what the model drew and tell it what to fix, so you don't retry blind.
sidebar:
  order: 2
---

You don't know which model your users will plug in. Some will get a prop wrong or reach for a component
that doesn't exist. Rather than retrying until the UI comes out right, check what the model wrote and send
it a message it can act on. The kit's checks name the line, the component and the fix:

```text
Not all of it is shown. Fix these and call show_ui again with "replaces" set to this call's id, without remarking on the fix to the user:
- line 3 <List>.props.items[0]: expected object, got string "Tent"
- line 5 <Txt>.component: unknown "Txt"; use one of Stack, Card, Text, List, Button
```

The kit draws whatever is valid, so the user still sees most of it; the check is for the model.

## Tool calls

Return the check's feedback as the tool result. The model reads it like any other tool result and can call
again:

```ts
import { checkUiMarkupCode, checkUiTree, checkWidgetCode } from "agentic-ui-kit/core";

if (call.name === "show_ui") return checkUiMarkupCode(call.input.markup, uiSpecs).feedback;
if (call.name === "show_widget") return checkWidgetCode(call.input.widget_code, allow).feedback;
if (call.name === "render_ui") return checkUiTree(call.input, uiSpecs).feedback;
```

`checkWidgetCode` reports what breaks in the sandbox (document tags, blocked origins, fetch, storage,
`alert`) as errors and what looks off in the chat (hard-coded colors) as warnings. `checkUiTree` accepts a
`root` sent as a JSON string, draws what it can, and tells the model to send an object.

### Fixes and changes redraw in place

`show_widget`, `show_ui` and `render_ui` take an optional `replaces`: the id of an earlier call of the
tool. The checks' feedback asks for it on a resend, and the tool descriptions tell the model to use it when
the user asks to change a visual. The kit then:

- **same reply** (a fix): keeps the first visual, dimmed with "Updating…", until the new call's input is
  complete, then draws the new one in its place. A failed update leaves the old one.
- **later reply** ("make the line thinner"): draws the new visual in the new reply and folds the old one
  into an "Updated below ↓" link that scrolls to it.

The model refers to its own call ids, so send the history back with the tool call ids intact. Warning-only
feedback (hard-coded colors) says the widget works and not to redraw it. Your own drawing tool can take part
too: add `replacesProperty` from agentic-ui-kit/core to its input schema and `replacesGuide` to its description.

## UI blocks in the reply

There is no tool call to answer, so check the reply when it is done and append the feedback for the next
request:

```ts
import { checkUiMarkup } from "agentic-ui-kit/core";

const check = checkUiMarkup(replyText, uiSpecs);
if (!check.ok) {
  input.push(...response.output, { role: "developer", content: check.feedback });
  // Either ask again now (the model rewrites the block) or keep it for the user's next turn.
}
```

Whether you re-ask at once or let the note ride along with the next user message is your call: re-asking
fixes it while the user watches, at the cost of another request.

## Errors at runtime

A widget's script can still fail in the browser. `widgets.onWidgetError` gets each message once:

```tsx
<ChatView {...chat} widgets={{ onWidgetError: ({ partId, message }) => api.reportWidgetError(chatId, partId, message) }} />
```

Send it to your server and add it to the model's next input, e.g. `Your widget failed: x is not defined
(line 3)`.

## Keep the prompt cache

Feedback only ever goes at the end: as a tool result, or a new input item after the reply. Never edit
earlier messages or the instructions to carry it; the provider would have to re-read the whole conversation.
