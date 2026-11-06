---
title: Agent tools
description: Let pages register tools the model can call, in the browser or on your server.
sidebar:
  order: 4
---

![The model proposes calendar events; the page draws them and asks before adding them](/images/calendar.png)

Pages register the tools they own while they are mounted, so the model's tools follow what's on screen. One
definition covers both kinds:

- **Client tools** have `execute`. They run in the browser and can change the page directly; the result is
  sent back and the model continues.
- **Server tools** run on your backend. The page still sees every call, through `onCall` (each change, e.g.
  arguments streaming in) and `onResult` (once, done or failed), and can draw previews or refresh data.

```tsx
import { AgentProvider, useAgentContext, useChatTool } from "agentic-ui-kit";

function ApplicationForm() {
  const [values, setValues] = useState(empty);
  useAgentContext("application", values); // sent with each request

  // Client tool: the model fills in the form on screen.
  useChatTool({
    name: "fill_fields",
    description: "Fill in fields of the application form.",
    inputSchema: { type: "object", properties: { fields: { type: "object" } }, required: ["fields"] },
    execute: ({ fields }) => {
      setValues((v) => ({ ...v, ...fields }));
      return { filled: Object.keys(fields) };
    },
    view: { label: (call) => (call.status === "done" ? "Filled in the form" : "Filling in the form") },
  });

  // Server tool that needs the user's OK: the backend sets `needsApproval` on the call.
  useChatTool({
    name: "submit_application",
    view: { ask: () => "Submit your application?" },
    onResult: (call) => call.status === "done" && setSubmitted(true),
  });
  // ...
}

// Wrap the page and the chat so they share tools and context.
<AgentProvider>
  <ApplicationForm />
  <Assistant /> {/* uses useChat() and ChatView as in the quick start */}
</AgentProvider>;
```

While a tool call's arguments stream in, `call.partialInput` holds what has been written so far, parsed from
incomplete JSON. Use it to show a preview as the model writes: draw calendar events field by field, or type an
edit into an open file. If the stream breaks or the arguments aren't valid JSON, the call ends with
`status: "error"` and the preview should go away.

A tool's `view` sets how it looks in the chat: `label`, `subtitle`, `summary`, a `Detail` component for the
expanded row and the approval card, and `ask` for the approval question. `Block` renders a call on its own
instead of inside the activity group; `Card` draws a card under the group while the call keeps its row (job
cards, a diff with Apply/Undo). A backend can set `data` on a tool call (with `part.update` / `part.end`):
display data for these views, kept apart from the `result` the model sees. `MarkdownLinksProvider` draws
chosen links in replies your way, e.g. a job link as a job row.

