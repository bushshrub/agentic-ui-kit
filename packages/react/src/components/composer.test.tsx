import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Composer } from "./composer";

afterEach(cleanup);

const paste = (el: Element, data: { text?: string; files?: File[] }) =>
  fireEvent.paste(el, { clipboardData: { files: data.files ?? [], getData: () => data.text ?? "" } });

it("turns long pasted text into an attachment and keeps short pastes in the box", () => {
  const onLongPaste = vi.fn();
  render(<Composer onSubmit={() => {}} onLongPaste={onLongPaste} longPasteChars={10} />);
  const box = screen.getByLabelText("Message");
  paste(box, { text: "a long pasted paragraph" });
  expect(onLongPaste).toHaveBeenCalledWith("a long pasted paragraph");
  paste(box, { text: "short" });
  expect(onLongPaste).toHaveBeenCalledTimes(1);
});

it("hands pasted files to onFiles", () => {
  const onFiles = vi.fn();
  render(<Composer onSubmit={() => {}} onFiles={onFiles} />);
  const file = new File(["x"], "shot.png", { type: "image/png" });
  paste(screen.getByLabelText("Message"), { files: [file] });
  expect(onFiles).toHaveBeenCalledWith([file]);
});

it("sends on Enter, not Shift+Enter, and not while held back", () => {
  const onSubmit = vi.fn();
  const { rerender } = render(<Composer onSubmit={onSubmit} />);
  const box = screen.getByLabelText("Message");
  fireEvent.change(box, { target: { value: "hi" } });
  fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
  expect(onSubmit).not.toHaveBeenCalled();
  rerender(<Composer onSubmit={onSubmit} submitDisabled />);
  fireEvent.keyDown(box, { key: "Enter" });
  expect(onSubmit).not.toHaveBeenCalled();
  rerender(<Composer onSubmit={onSubmit} />);
  fireEvent.keyDown(box, { key: "Enter" });
  expect(onSubmit).toHaveBeenCalledWith("hi");
});

it("sendWhileBusy: Enter sends while busy, and the button is stop only while the box is empty", () => {
  const onSubmit = vi.fn();
  const { rerender } = render(<Composer onSubmit={onSubmit} onStop={() => {}} busy />);
  const box = screen.getByLabelText("Message");
  fireEvent.change(box, { target: { value: "hi" } });
  fireEvent.keyDown(box, { key: "Enter" });
  expect(onSubmit).not.toHaveBeenCalled();
  rerender(<Composer onSubmit={onSubmit} onStop={() => {}} busy sendWhileBusy />);
  expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
  fireEvent.keyDown(box, { key: "Enter" });
  expect(onSubmit).toHaveBeenCalledWith("hi");
  expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
});

it("puts id and ref on the textarea", () => {
  const ref = createRef<HTMLTextAreaElement>();
  render(<Composer onSubmit={() => {}} id="reply" ref={ref} />);
  expect(ref.current).toBe(screen.getByLabelText("Message"));
  expect(ref.current!.id).toBe("reply");
});
