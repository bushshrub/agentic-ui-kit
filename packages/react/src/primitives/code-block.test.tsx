/// <reference types="node" />
import { Blob as NodeBlob } from "node:buffer";
import { render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ChatTheme } from "./chat-theme";
import { CodeBlock } from "./code-block";

// jsdom's Blob has no stream(), which Shiki's inlined wasm loader needs.
vi.stubGlobal("Blob", NodeBlob);

afterEach(() => vi.restoreAllMocks());

const code = "const x = 1;";
const colors = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLElement>(".chat-code-token")].map((t) => t.style.getPropertyValue("--shiki-dark"));

it("re-highlights with the new themes when codeThemes changes", async () => {
  const view = (dark: string) => (
    <ChatTheme codeThemes={{ light: "catppuccin-latte", dark }}>
      <CodeBlock language="ts" code={code} />
    </ChatTheme>
  );
  const { container, rerender } = render(view("dracula"));
  await waitFor(() => expect(colors(container).length).toBeGreaterThan(0));
  const dracula = colors(container);
  rerender(view("github-dark"));
  await waitFor(() => expect(colors(container)).not.toEqual(dracula));
});

it("falls back to the default theme and warns once for an unknown theme id", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { container } = render(
    <ChatTheme codeThemes={{ dark: "no-such-theme" }}>
      <CodeBlock language="ts" code={code} />
      <CodeBlock language="ts" code={"let y = 2;"} />
    </ChatTheme>,
  );
  await waitFor(() => expect(container.querySelectorAll(".chat-code-token").length).toBeGreaterThan(2));
  expect(warn).toHaveBeenCalledTimes(1);
});

it("takes the theme's own background only when codeThemes.background is \"theme\"", async () => {
  const block = (background?: "theme") => (
    <ChatTheme codeThemes={{ dark: "dracula", ...(background && { background }) }}>
      <CodeBlock variant="boxed" language="ts" code={code} />
    </ChatTheme>
  );
  const kit = render(block());
  await waitFor(() => expect(kit.container.querySelector(".chat-code-token")).not.toBeNull());
  expect(kit.container.querySelector("[data-chat-code-bg]")).toBeNull();
  kit.unmount();

  const themed = render(block("theme"));
  await waitFor(() => expect(themed.container.querySelector("[data-chat-code-bg=theme]")).not.toBeNull());
  const box = themed.container.querySelector<HTMLElement>("[data-chat-code-block]")!;
  expect(box.style.getPropertyValue("--shiki-dark-bg").toLowerCase()).toBe("#282a36");
});
