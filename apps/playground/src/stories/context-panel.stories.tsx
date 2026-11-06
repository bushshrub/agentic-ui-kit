import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleContext } from "@agentic-ui-kit/core/fixtures";
import { ContextPanel } from "agentic-ui-kit";

/** What fills the model's context window, by category. Edit `usage` in Controls to try other numbers. */
const meta = {
  title: "Components/ContextPanel",
  component: ContextPanel,
  decorators: [(Story) => <div className="w-[19rem]"><Story /></div>],
  args: { usage: sampleContext, title: "Context", defaultExpanded: true },
  argTypes: {
    usage: { control: "object", description: "The window size, the used total and the categories that fill it." },
    title: { control: "text", description: "Section title." },
    defaultExpanded: { control: "boolean", description: "Open the breakdown on first render." },
  },
  parameters: { controls: { include: ["usage", "title", "defaultExpanded"] } },
} satisfies Meta<typeof ContextPanel>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Expanded, with the sample usage. */
export const Default: Story = {};

/** Collapsed to its summary line. */
export const Collapsed: Story = { args: { defaultExpanded: false } };
