import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { MessageList } from "./message-list";

beforeEach(() => {
  Element.prototype.scrollTo = (() => {}) as typeof Element.prototype.scrollTo;
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
    unobserve() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

/** Scrolls the list away from the bottom: jsdom has no layout, so the sizes are set by hand. */
function scrollUp(log: HTMLElement) {
  const scroller = log.parentElement!.parentElement!;
  Object.defineProperty(scroller, "scrollHeight", { value: 2000, configurable: true });
  Object.defineProperty(scroller, "clientHeight", { value: 500, configurable: true });
  scroller.scrollTop = 0;
  fireEvent.scroll(scroller);
}

it("puts the scroll button on top of the footer, so a tall composer pushes it up", () => {
  render(<MessageList messages={[]} footer={<div data-testid="composer" />} />);
  scrollUp(screen.getByRole("log"));
  const button = screen.getByRole("button", { name: "Scroll to bottom" });
  expect(button.parentElement).toBe(screen.getByTestId("composer").parentElement);
  expect(button.className).toContain("bottom-full");
});

it("keeps the scroll button over the list when there is no footer", () => {
  render(<MessageList messages={[]} />);
  scrollUp(screen.getByRole("log"));
  expect(screen.getByRole("button", { name: "Scroll to bottom" }).className).toContain("bottom-[min(10rem,40%)]");
});
