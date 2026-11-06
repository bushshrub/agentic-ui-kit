import { ChatTheme, CodeBlock, Markdown, type ChatMotion } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { useEffect, useState } from "react";

/** ChatTheme's `codeThemes` (any bundled Shiki theme) and `motion` ("system" | "reduce" | "full"). */
const meta: Meta = { title: "Primitives/Appearance", parameters: { layout: "centered" } };
export default meta;

const THEMES = [
  "github-light", "github-dark", "one-dark-pro", "dracula", "catppuccin-latte", "catppuccin-mocha",
  "nord", "solarized-light", "tokyo-night", "vitesse-light", "not-a-theme",
];

const reply = [
  "Here is the fix. The loop never ended because `done` was shadowed:",
  "",
  "```ts",
  "function drain(queue: string[]) {",
  "  let done = false;",
  "  while (!done) {",
  "    const next = queue.shift();",
  "    done = next === undefined;",
  "  }",
  "}",
  "```",
  "",
  "Rename the inner variable and the loop stops as soon as the queue is empty. Run the tests again to confirm it holds.",
].join("\n");

function Stream({ text }: { text: string }) {
  const [n, setN] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 6)), 40);
    return () => clearInterval(id);
  }, [text, run]);
  return (
    <div className="flex flex-col gap-3">
      <button className="self-start rounded border border-chat-border px-2 py-1 text-xs" onClick={() => setRun((r) => r + 1)}>
        Replay stream
      </button>
      <Markdown streaming={n < text.length}>{text.slice(0, n)}</Markdown>
    </div>
  );
}

interface Args {
  light: string;
  dark: string;
  background: "kit" | "theme";
  motion: ChatMotion;
  colorScheme: "light" | "dark";
}

/** ChatTheme's code themes and motion applied to a streaming reply and a code block. */
export const CodeThemesAndMotion: StoryObj<Args> = {
  name: "Code themes and motion",
  args: { light: "catppuccin-latte", dark: "dracula", background: "theme", motion: "system", colorScheme: "dark" },
  argTypes: {
    light: { control: "select", options: THEMES },
    dark: { control: "select", options: THEMES },
    background: { control: "inline-radio", options: ["kit", "theme"] },
    motion: { control: "inline-radio", options: ["system", "reduce", "full"] },
    colorScheme: { control: "inline-radio", options: ["light", "dark"] },
  },
  render: ({ light, dark, background, motion, colorScheme }) => (
    <div style={{ colorScheme }}>
      <ChatTheme codeThemes={{ light, dark, background }} motion={motion} className="w-[40rem] rounded-chat-md p-6">
        <Stream text={reply} />
        <CodeBlock variant="boxed" language="bash" code="pnpm install --frozen-lockfile && pnpm test" />
      </ChatTheme>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Replay stream" }));
    await expect(canvas.getByText(/pnpm install/)).toBeVisible();
  },
};
