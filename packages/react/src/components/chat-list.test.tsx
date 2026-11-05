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
