import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatTheme } from "../primitives/chat-theme";
import { useSmoothText } from "./smooth-text";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.chatMotion;
});

const full = "The quick brown fox jumps over the lazy dog and keeps running far away from here.";

const withMotion = (motion: "system" | "reduce" | "full") =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <ChatTheme motion={motion}>{children}</ChatTheme>;
  };

const osReducedMotion = (reduced: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduced && query.includes("reduced-motion") }));

function shownAfterFirstFrames(wrapper?: ReturnType<typeof withMotion>) {
  const { result } = renderHook(() => useSmoothText(full, true), wrapper && { wrapper });
  act(() => vi.advanceTimersByTime(20));
  return result.current;
}

it("shows streamed text at once under motion=\"reduce\", even without the OS setting", () => {
  osReducedMotion(false);
  expect(shownAfterFirstFrames(withMotion("reduce"))).toBe(full);
});

it("still paces streamed text under motion=\"full\" with the OS setting on", () => {
  osReducedMotion(true);
  expect(shownAfterFirstFrames(withMotion("full")).length).toBeLessThan(full.length);
});

it("follows the OS setting under motion=\"system\"", () => {
  osReducedMotion(true);
  expect(shownAfterFirstFrames(withMotion("system"))).toBe(full);
});

it("honors data-chat-motion on <html> when there is no ChatTheme", () => {
  osReducedMotion(false);
  document.documentElement.dataset.chatMotion = "reduce";
  expect(shownAfterFirstFrames()).toBe(full);
});

it("puts data-chat-motion on the ChatTheme element for the CSS to key on", () => {
  const { container } = render(<ChatTheme motion="reduce">x</ChatTheme>);
  expect(container.querySelector("[data-chat-motion=reduce]")).not.toBeNull();
});
