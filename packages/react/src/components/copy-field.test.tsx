import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CopyField } from "./copy-field";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const url = "https://example.com/s/abc123";

it("copies the value, says Copied for about 2 s, then reverts", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const onCopy = vi.fn();
  render(<CopyField value={url} onCopy={onCopy} />);
  expect((screen.getByLabelText("Link") as HTMLInputElement).readOnly).toBe(true);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy" })));
  expect(writeText).toHaveBeenCalledWith(url);
  expect(onCopy).toHaveBeenCalledOnce();
  expect(screen.getByRole("status").textContent).toBe("Copied");
  expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  act(() => void vi.advanceTimersByTime(2100));
  expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("");
});

it("selects the text when the clipboard is unavailable", async () => {
  vi.stubGlobal("navigator", {});
  render(<CopyField value={url} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy" })));
  const input = screen.getByLabelText("Link") as HTMLInputElement;
  expect(input.selectionStart).toBe(0);
  expect(input.selectionEnd).toBe(url.length);
  expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
});
