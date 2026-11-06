import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Markdown, MarkdownLinksProvider } from "./markdown";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
});
afterEach(() => vi.useRealTimers());

const text = "Lighthouses were never meant to be beautiful. They were built to warn ships off coastlines that had sunk too many of them.";

it("keeps the word elements already shown while more text streams in, so their fade is not restarted", () => {
  const { container, rerender } = render(<Markdown streaming>{text.slice(0, 20)}</Markdown>);
  act(() => vi.advanceTimersByTime(500));
  const first = container.querySelector(".chat-word");
  expect(first?.textContent).toBe("Lighthouses");

  rerender(<Markdown streaming>{text.slice(0, 70)}</Markdown>);
  act(() => vi.advanceTimersByTime(500));
  rerender(<Markdown streaming={false}>{text}</Markdown>);
  act(() => vi.advanceTimersByTime(1000));

  expect(container.querySelector(".chat-word")).toBe(first);
  expect(container.querySelectorAll(".chat-word").length).toBe(text.split(/\s+/).length);
  expect(container.querySelector(".chat-markdown")?.className).toContain("chat-fade");
});

it("renders history without word spans", () => {
  const { container } = render(<Markdown>{text}</Markdown>);
  expect(container.querySelector(".chat-word")).toBeNull();
  expect(container.textContent).toBe(text);
});

it("lets the host draw some links its own way", () => {
  const { container } = render(
    <MarkdownLinksProvider renderLink={({ href }) => (href.includes("/jobs/") ? <span data-job={href}>job row</span> : undefined)}>
      <Markdown>{"See [Engineer](https://jobs.example/jobs/7) and [docs](https://example.com)."}</Markdown>
    </MarkdownLinksProvider>,
  );
  expect(container.querySelector("[data-job]")?.textContent).toBe("job row");
  expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com/");
});
