import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
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
