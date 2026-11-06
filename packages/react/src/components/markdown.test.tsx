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

const jobs = "Matches:\n\n- [Engineer](https://jobs.example/jobs/7)\n- [Designer](https://jobs.example/jobs/9)\n";

it("lets the host replace a list whose items are all links, keeping the inline markup", () => {
  const { container } = render(
    <MarkdownLinksProvider
      renderLinkList={({ links }) => (
        <div data-cards>
          {links.map((l) => (
            <section key={l.href} data-card={l.href}>{l.children}</section>
          ))}
        </div>
      )}
    >
      <Markdown>{jobs.replace("Engineer", "**Engineer**")}</Markdown>
    </MarkdownLinksProvider>,
  );
  expect([...container.querySelectorAll("[data-card]")].map((n) => n.getAttribute("data-card"))).toEqual(["https://jobs.example/jobs/7", "https://jobs.example/jobs/9"]);
  expect(container.querySelector("[data-card] :is(strong, [data-streamdown='strong'])")?.textContent).toBe("Engineer");
  expect(container.querySelector("ul")).toBeNull();
});

it("keeps a list that has anything but links, and handles loose lists", () => {
  const render_ = (md: string) =>
    render(
      <MarkdownLinksProvider renderLinkList={() => <div data-cards />}>
        <Markdown>{md}</Markdown>
      </MarkdownLinksProvider>,
    ).container;
  const mixed = render_("- [Engineer](https://jobs.example/jobs/7)\n- plain item\n");
  expect(mixed.querySelector("[data-cards]")).toBeNull();
  expect(mixed.querySelectorAll("li")).toHaveLength(2);
  expect(render_("- [A](https://a.example)\n\n- [B](https://b.example)\n").querySelector("[data-cards]")).not.toBeNull();
  expect(render_("1. [A](https://a.example)\n2. [B](https://b.example)\n").querySelector("[data-cards]")).not.toBeNull();
});
