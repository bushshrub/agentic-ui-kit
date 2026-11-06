import type { Message } from "@agentic-ui-kit/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ChatView } from "./chat-view";

const messages: Message[] = [
  { id: "u1", parentId: null, role: "user", status: "done", createdAt: "2026-11-05T10:00:00Z", parts: [{ type: "text", id: "t", text: "Hello", status: "done" }] },
];

beforeEach(() => {
  Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo;
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

it("has a composer by default and none with composer={false}", () => {
  const { rerender } = render(<ChatView messages={messages} onSend={() => {}} />);
  expect(screen.getByRole("textbox")).toBeTruthy();
  rerender(<ChatView messages={messages} onSend={() => {}} composer={false} renderComposer={(c) => <div data-wrapped>{c}</div>} />);
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(document.querySelector("[data-wrapped]")).toBeNull();
  expect(screen.getByText("Hello")).toBeTruthy();
});

it("shows only the empty state's own content without a composer when the chat is empty", () => {
  render(<ChatView messages={[]} onSend={() => {}} composer={false} emptyState={(composer) => <h1>Nothing yet{composer}</h1>} />);
  expect(screen.getByRole("heading").textContent).toBe("Nothing yet");
  expect(screen.queryByRole("textbox")).toBeNull();
});
