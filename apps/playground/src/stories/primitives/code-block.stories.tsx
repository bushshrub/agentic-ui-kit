import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeBlock } from "agentic-ui-kit";
import { expect } from "storybook/test";

/** Highlighted code; "boxed" adds a caption bar with a copy button. */
const meta = {
  title: "Primitives/CodeBlock",
  component: CodeBlock,
  decorators: [(Story) => <div className="w-[36rem]"><Story /></div>],
  args: {
    code: 'const chat = useChat({ transport });\nchat.send("Hello", { model: "gpt-6-astra" });',
    language: "ts",
    variant: "boxed",
  },
  argTypes: {
    code: { control: "text", description: "The source to show." },
    language: { control: "text", description: "Shiki language id, e.g. `ts` or `bash`." },
    label: { control: "text", description: "Caption in the boxed header; defaults to the language." },
    variant: { control: "inline-radio", options: ["plain", "boxed"], description: "Bare code, or a box with a caption bar." },
    copy: { control: "boolean", description: "Show the copy button; on by default for the boxed variant." },
  },
  parameters: { controls: { include: ["code", "language", "label", "variant", "copy"] } },
} satisfies Meta<typeof CodeBlock>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The boxed variant with a caption bar and copy button. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/useChat/)).toBeVisible();
  },
};

/** Bare highlighted code with no box. */
export const Plain: Story = { args: { variant: "plain" } };

/** A custom caption instead of the language name. */
export const WithLabel: Story = { args: { label: "src/chat.ts" } };
