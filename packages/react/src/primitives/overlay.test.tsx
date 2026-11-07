import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Modal } from "./overlay";

afterEach(cleanup);

const panel = () => screen.getByRole("dialog").parentElement!;

it("size picks the width and a caller className overrides it without !", () => {
  render(<Modal isOpen onOpenChange={() => {}} title="T" size="sm">body</Modal>);
  expect(panel().className).toContain("max-w-sm");
  expect(panel().className).not.toContain("max-w-2xl");
  cleanup();
  render(<Modal isOpen onOpenChange={() => {}} title="T" className="max-w-[40rem]">body</Modal>);
  expect(panel().className).toContain("max-w-[40rem]");
  expect(panel().className).not.toContain("max-w-2xl");
});

it("placement top aligns the dialog to the top", () => {
  render(<Modal isOpen onOpenChange={() => {}} title="T" placement="top">body</Modal>);
  expect(panel().parentElement!.className).toContain("items-start");
});

it("isDismissable={false} keeps it open on an outside click; Escape and showClose still close it", async () => {
  const onOpenChange = vi.fn();
  render(<Modal isOpen onOpenChange={onOpenChange} title="T" isDismissable={false} showClose>body</Modal>);
  await userEvent.click(panel().parentElement!);
  expect(onOpenChange).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
  onOpenChange.mockClear();
  screen.getByRole("dialog").focus();
  await userEvent.keyboard("{Escape}");
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
});

it("an outside click closes it by default", async () => {
  const onOpenChange = vi.fn();
  render(<Modal isOpen onOpenChange={onOpenChange} title="T">body</Modal>);
  expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  await userEvent.click(panel().parentElement!);
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
});

it("padded wraps the content in padding", () => {
  render(<Modal isOpen onOpenChange={() => {}} title="T" padded><p>body</p></Modal>);
  expect(screen.getByText("body").parentElement!.className).toContain("px-5");
});
