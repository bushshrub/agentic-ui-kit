import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ContextMeter } from "./context-meter";

afterEach(cleanup);

const usage = (tokens: number) => ({ limit: 200_000, categories: [{ id: "m", label: "Messages", tokens }] });

it("is named by the numbers and opens the context panel on click", () => {
  render(<ContextMeter usage={usage(13_800)} />);
  const button = screen.getByRole("button", { name: "Context: 13.8k / 200k (7%)" });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(button);
  const dialog = screen.getByRole("dialog", { name: "Context" });
  expect(dialog.textContent).toContain("13.8k / 200k");
});

it("does not open while loading", () => {
  render(<ContextMeter usage={usage(0)} isLoading />);
  fireEvent.click(screen.getByRole("button", { name: "Context: loading" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("turns warning then danger as the window fills", () => {
  const ring = () => document.querySelectorAll("circle")[1]!.getAttribute("class") ?? "";
  const { rerender } = render(<ContextMeter usage={usage(20_000)} />);
  expect(ring()).toContain("text-chat-accent");
  rerender(<ContextMeter usage={usage(160_000)} />);
  expect(ring()).toContain("text-chat-warning");
  rerender(<ContextMeter usage={usage(190_000)} />);
  expect(ring()).toContain("text-chat-danger");
});
