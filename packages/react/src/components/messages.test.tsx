import type { AttachmentPart, Message } from "@agentic-ui-kit/core";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { UserMessage } from "./messages";

afterEach(cleanup);

const photo: AttachmentPart = { type: "attachment", id: "a1", status: "done", fileId: "f1", name: "cat.png", mime: "image/png", size: 10, url: "https://cdn.example/cat.png" };
const message = (parts: Message["parts"]): Message => ({ id: "m1", parentId: null, role: "user", status: "done", parts, createdAt: new Date().toISOString() });

it("shows a caption above the message", () => {
  render(<UserMessage message={message([photo])} caption="Sent by the agent" />);
  expect(screen.getByText("Sent by the agent")).toBeTruthy();
});

it("opens an image attachment in the kit's viewer, or the host's", async () => {
  render(<UserMessage message={message([photo])} />);
  await userEvent.click(screen.getByRole("button", { name: "Open image cat.png" }));
  expect(screen.getByRole("dialog", { name: "cat.png" }).querySelector("img")?.getAttribute("src")).toBe(photo.url);
  cleanup();
  const onOpenAttachment = vi.fn();
  render(<UserMessage message={message([photo])} onOpenAttachment={onOpenAttachment} />);
  screen.getByRole("button", { name: "Open image cat.png" }).focus();
  await userEvent.keyboard("{Enter}");
  expect(onOpenAttachment).toHaveBeenCalledWith(photo);
  expect(screen.queryByRole("dialog")).toBeNull();
});
