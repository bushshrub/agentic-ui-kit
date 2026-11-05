import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useSmoothText } from "./smooth-text";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
});
afterEach(() => vi.useRealTimers());

const full = "The quick brown fox jumps over the lazy dog and keeps running far away from here.";

it("reveals text gradually at word ends while deltas keep arriving", () => {
  const { result, rerender } = renderHook(({ text, streaming }) => useSmoothText(text, streaming), {
    initialProps: { text: "", streaming: true },
  });
  const seen: string[] = [];
  // A delta every 20ms, faster than frames, the case that used to stall the reveal.
  for (let i = 4; i <= full.length; i += 4) {
    rerender({ text: full.slice(0, i), streaming: true });
    act(() => vi.advanceTimersByTime(20));
    seen.push(result.current);
  }
  const partial = seen.filter((s) => s.length > 0 && s.length < full.length);
  expect(partial.length).toBeGreaterThan(3);
  for (const s of partial) {
    expect(full.startsWith(s)).toBe(true);
    // Each partial reveal ends at a word end of the text it was cut from.
    expect(s.endsWith(" ") || /\S$/.test(s)).toBe(true);
  }
  rerender({ text: full, streaming: false });
  act(() => vi.advanceTimersByTime(500));
  expect(result.current).toBe(full);
});

it("shows replaced text at once", () => {
  const { result, rerender } = renderHook(({ text }) => useSmoothText(text, false), { initialProps: { text: "first answer" } });
  rerender({ text: "an edited answer" });
  expect(result.current).toBe("an edited answer");
});
