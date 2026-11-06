import { ChatTheme, CodeBlock, Markdown } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { useEffect, useState } from "react";

/**
 * ChatTheme's `codeThemes` (any bundled Shiki theme) and `motion` ("system" | "reduce" | "full"), applied to a
 * streaming reply and a code block. Use the theme toolbar to switch light and dark.
 */
const meta = {
  title: "Primitives/ChatTheme",
  component: ChatTheme,
  parameters: { layout: "centered", controls: { include: ["codeThemes", "motion"] } },
  args: { codeThemes: { light: "catppuccin-latte", dark: "dracula", background: "theme" }, motion: "system", children: null },
  argTypes: {
    codeThemes: { control: "object", description: "Shiki themes for code blocks and Markdown fences: `light`, `dark`, and `background` (\"kit\" keeps the kit's surface, \"theme\" uses the Shiki theme's own)." },
    motion: { control: "inline-radio", options: ["system", "reduce", "full"], description: "\"system\" follows the OS reduced-motion setting; \"reduce\" and \"full\" force it." },
    children: { control: false, description: "The content to theme. The story supplies a streaming reply and a code block." },
  },
  render: ({ codeThemes, motion }, { globals }) => (
    <div style={{ colorScheme: globals.theme === "light" ? "light" : "dark" }}>
      <ChatTheme codeThemes={codeThemes} motion={motion} className="w-[40rem] rounded-chat-md p-6">
        <Stream text={reply} />
        <CodeBlock variant="boxed" language="bash" code="pnpm install --frozen-lockfile && pnpm test" />
      </ChatTheme>
    </div>
  ),
} satisfies Meta<typeof ChatTheme>;
export default meta;

type Story = StoryObj<typeof meta>;

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

/** Catppuccin Latte in light mode, Dracula in dark, with the Shiki theme's own background. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Replay stream" }));
    await expect(canvas.getByText(/pnpm install/)).toBeVisible();
  },
};

/** Code keeps the kit's surface color instead of the Shiki theme's background. */
export const KitBackground: Story = {
  args: { codeThemes: { light: "github-light", dark: "github-dark", background: "kit" } },
};

/** Reduced motion: the stream still fills in, without the animations. */
export const ReducedMotion: Story = { args: { motion: "reduce" } };

/** An unknown theme name falls back to plain code instead of breaking. */
export const UnknownTheme: Story = {
  args: { codeThemes: { light: "not-a-theme", dark: "not-a-theme", background: "theme" } },
};
