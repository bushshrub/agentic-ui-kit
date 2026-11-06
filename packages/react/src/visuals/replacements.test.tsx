import type { Message, PartStatus, ToolCallPart } from "@agentic-ui-kit/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MessageList } from "../components/message-list";
import { VisualsProvider } from "./provider";
import { ToolViewsProvider } from "../components/tools";

beforeEach(() => {
  Element.prototype.scrollTo = () => {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

const call = (id: string, text: string, replaces?: string, status: PartStatus = "done"): ToolCallPart => ({
  type: "tool_call",
  id,
  name: "draw",
  status,
  inputJson: "",
  input: { text, ...(replaces && { replaces }) },
});
const reply = (id: string, parts: ToolCallPart[]): Message => ({ id, parentId: null, role: "assistant", status: "done", createdAt: "2026-11-05T10:00:00Z", parts });
const tools = { draw: { Block: ({ part }: { part: ToolCallPart }) => <p>{(part.input as { text: string }).text}</p> } };
const list = (messages: Message[]) => (
  <VisualsProvider>
    <ToolViewsProvider tools={tools}>
      <MessageList messages={messages} />
    </ToolViewsProvider>
  </VisualsProvider>
);

it("draws a same-reply update in the first call's place, once its input is complete", () => {
  const { rerender } = render(list([reply("a1", [call("c1", "broken"), call("c2", "fixed", "c1", "streaming")])]));
  expect(screen.getByText("broken")).toBeTruthy();
  expect(screen.queryByText("fixed")).toBeNull();
  expect(screen.getByText("Updating…")).toBeTruthy();
  rerender(list([reply("a1", [call("c1", "broken"), call("c2", "fixed", "c1")])]));
  expect(screen.queryByText("broken")).toBeNull();
  expect(screen.getAllByText("fixed")).toHaveLength(1);
  expect(screen.queryByText("Updating…")).toBeNull();
});

it("keeps the old visual when the update fails", () => {
  render(list([reply("a1", [call("c1", "old"), call("c2", "bad", "c1", "error")])]));
  expect(screen.getByText("old")).toBeTruthy();
  expect(screen.queryByText("Updating…")).toBeNull();
});

it("folds a visual updated in a later reply into a link to the update", () => {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  render(list([reply("a1", [call("c1", "red curve")]), reply("a2", [call("c2", "blue curve", "c1")])]));
  expect(screen.queryByText("red curve")).toBeNull();
  expect(screen.getByText("blue curve")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Updated below ↓" }));
  expect(scroll).toHaveBeenCalled();
});

it("matches replaces against an earlier visual's title when the model doesn't know the id", () => {
  const titled = (id: string, text: string, title: string, replaces?: string): ToolCallPart => ({
    ...call(id, text, replaces),
    input: { text, title, ...(replaces && { replaces }) },
  });
  render(list([reply("a1", [titled("c1", "red curve", "normal_distribution")]), reply("a2", [titled("c2", "blue curve", "normal_distribution", "normal_distribution")])]));
  expect(screen.queryByText("red curve")).toBeNull();
  expect(screen.getByRole("button", { name: "Updated below ↓" })).toBeTruthy();
});
