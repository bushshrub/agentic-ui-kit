import type { Part, StreamEvent } from "agentic-ui-kit/core";

/** One piece of a scripted reply: prose, or any tool call (show_widget, render_ui, a host tool). */
export type ReplyStep = { text: string } | { tool: string; input: unknown; result?: unknown };

/**
 * Turns a scripted reply into the stream a backend would send: text as word deltas, tool input as raw JSON
 * chunks (so views see `partialInput` grow), then the result. Nothing here knows what the tools draw.
 */
export function replyEvents(steps: ReplyStep[], { messageId = "a1", parentId = null as string | null, chunk = 60 } = {}): StreamEvent[] {
  let seq = 0;
  const base = () => ({ runId: "r1", seq: seq++ });
  const events: StreamEvent[] = [{ type: "run.start", ...base(), messageId, parentId, createdAt: new Date().toISOString() } as StreamEvent];
  steps.forEach((step, i) => {
    const id = `p${i}`;
    if ("text" in step) {
      events.push({ type: "part.start", ...base(), part: { type: "text", id, text: "", status: "streaming" } as Part });
      for (const word of step.text.match(/\S+\s*/g) ?? []) events.push({ type: "part.delta", ...base(), partId: id, text: word });
      events.push({ type: "part.end", ...base(), partId: id });
      return;
    }
    const json = JSON.stringify(step.input);
    events.push({ type: "part.start", ...base(), part: { type: "tool_call", id, name: step.tool, status: "input", inputJson: "" } as Part });
    for (let at = 0; at < json.length; at += chunk) events.push({ type: "part.delta", ...base(), partId: id, inputJson: json.slice(at, at + chunk) });
    events.push({ type: "part.end", ...base(), partId: id, result: step.result ?? "shown" });
  });
  events.push({ type: "run.end", ...base(), status: "done" } as StreamEvent);
  return events;
}
