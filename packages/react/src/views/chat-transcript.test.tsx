import type { Message } from "@agentic-ui-kit/core";
import { cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatTranscript } from "./chat-transcript";
import { ChatView } from "./chat-view";

const msg = (id: string, role: Message["role"], text: string, parentId: string | null): Message => ({
  id,
  parentId,
  role,
  status: "done",
  createdAt: "2026-11-05T10:00:00Z",
  parts: [{ type: "text", id: id + "-t", text, status: "done" }],
});
const messages = [msg("u1", "user", "Why is the sky blue?", null), msg("a1", "assistant", "Rayleigh scattering.", "u1")];

let scrolls = 0;
beforeEach(() => {
  scrolls = 0;
  Element.prototype.scrollTo = function () {
    scrolls++;
  } as typeof Element.prototype.scrollTo;
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

it("shows the conversation and the footer, with nothing to type in or act on but Copy", () => {
  render(<ChatTranscript messages={messages} footer={<a href="/new">Continue this chat</a>} />);
  expect(screen.getByText("Why is the sky blue?")).toBeTruthy();
  expect(screen.getByText("Rayleigh scattering.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Continue this chat" })).toBeTruthy();
  expect(screen.queryByRole("textbox")).toBeNull();
  const buttons = screen.queryAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
  expect(buttons.filter((b) => b !== "Copy")).toEqual([]);
});

// StrictMode runs the mount effects twice; the second run must not count as a new message and jump down.
it("starts at the top, where ChatView starts at the bottom", () => {
  render(<StrictMode><ChatTranscript messages={messages} /></StrictMode>);
  expect(scrolls).toBe(0);
  cleanup();
  render(<StrictMode><ChatView messages={messages} onSend={vi.fn()} /></StrictMode>);
  expect(scrolls).toBeGreaterThan(0);
});
