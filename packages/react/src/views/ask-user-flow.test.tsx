import type { StreamEvent, ToolCallPart } from "@agentic-ui-kit/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { useChat, type SendRequest, type Transport } from "../hooks/use-chat";
import { ChatView } from "./chat-view";

beforeEach(() => {
  Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo;
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

const input = { questions: [{ question: "Which database?", kind: "single", options: ["Postgres", "SQLite"] }] };

/** First request: the model asks. Any later request: it reports what the call ended as. */
function backend(): Transport & { requests: SendRequest[] } {
  const requests: SendRequest[] = [];
  return {
    requests,
    async *send(request) {
      requests.push(request);
      const runId = `r${requests.length}`;
      let seq = 0;
      const ev = (e: Record<string, unknown>) => ({ runId, seq: seq++, ...e }) as StreamEvent;
      yield ev({ type: "run.start", messageId: `a${requests.length}`, parentId: request.message.id, createdAt: "2026-11-05T00:00:00Z" });
      if (requests.length === 1) {
        yield ev({ type: "part.start", part: { type: "tool_call", id: "t1", name: "ask_user", status: "input", inputJson: JSON.stringify(input), runsOn: "client" } });
        yield ev({ type: "part.update", partId: "t1", status: "awaiting", input });
      } else {
        const asked = request.history.flatMap((m) => m.parts).find((p): p is ToolCallPart => p.id === "t1");
        const said = asked?.status === "error" ? `error: ${asked.error}` : `result: ${JSON.stringify(asked?.result)}`;
        yield ev({ type: "part.start", part: { type: "text", id: "x", text: said, status: "done" } });
      }
      yield ev({ type: "run.end", status: "done" });
    },
  };
}

function App({ transport }: { transport: Transport }) {
  const chat = useChat({ transport });
  return <ChatView messages={chat.messages} busy={chat.busy} onSend={chat.send} prompts={chat.prompts} onAnswer={chat.answer} onDecline={chat.decline} />;
}

async function ask() {
  const transport = backend();
  render(<App transport={transport} />);
  const box = screen.getByLabelText("Message");
  fireEvent.change(box, { target: { value: "set up storage" } });
  fireEvent.keyDown(box, { key: "Enter" });
  await screen.findByRole("dialog", { name: "Question for you" });
  return { transport };
}

it("shows the prompt over the composer, and the answer goes back as the tool's result", async () => {
  const { transport } = await ask();
  expect(screen.getByLabelText("Message").getAttribute("placeholder")).toBe("Or reply directly…");
  fireEvent.keyDown(document.activeElement!, { key: "2" });
  await waitFor(() => expect(transport.requests).toHaveLength(2));
  expect(transport.requests[1]!.continuation).toBe(true);
  await screen.findByText('result: {"answers":[{"question":"Which database?","kind":"single","answer":"SQLite"}]}');
  expect(screen.queryByRole("dialog")).toBeNull();
  // The answers are kept in the message as a card.
  expect(screen.getByLabelText("Your answers")).toBeTruthy();
});

it("typing in the composer declines the prompt and the model hears it", async () => {
  const { transport } = await ask();
  const box = screen.getByLabelText("Message"); // the docked composer replaced the centered one
  fireEvent.change(box, { target: { value: "just use postgres" } });
  fireEvent.keyDown(box, { key: "Enter" });
  await screen.findByText("error: Declined by the user");
  expect(transport.requests[1]!.continuation).toBeUndefined();
  expect(screen.queryByRole("dialog")).toBeNull();
});
