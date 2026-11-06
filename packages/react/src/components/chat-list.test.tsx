import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChatList, type ChatListSection } from "./chat-list";

afterEach(cleanup);

const sections: ChatListSection[] = [
  { id: "pinned", title: "Pinned", items: [{ id: "a", title: "Alpha" }] },
  { id: "projects", title: "Projects", items: [{ type: "project", id: "p", name: "website", chats: [{ id: "b", title: "Beta" }] }] },
];

it("marks the active chat and reports picks", () => {
  const onSelect = vi.fn();
  render(<ChatList sections={sections} activeId="a" onSelect={onSelect} />);
  expect(screen.getByRole("button", { name: "Alpha" }).getAttribute("aria-current")).toBe("page");
  fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
  expect(onSelect).toHaveBeenCalledWith("a");
});

it("opens a project that holds the active chat", () => {
  render(<ChatList sections={sections} activeId="b" />);
  expect(screen.getByRole("button", { name: "website" }).getAttribute("aria-expanded")).toBe("true");
});

it("shows a row's detail and dims a muted row without an unread marker", () => {
  render(<ChatList sections={[{ id: "s", items: [{ id: "a", title: "Alpha", detail: "2h" }, { id: "b", title: "Beta", muted: true, unread: true }] }]} />);
  expect(screen.getByText("2h")).toBeTruthy();
  expect(screen.queryByRole("img", { name: "Unread" })).toBeNull();
  expect(screen.getByText("Beta").className).toContain("text-chat-muted");
});
