import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleContext } from "@agentic-ui-kit/core/fixtures";
import { ContextPanel } from "agentic-ui-kit";

/** What fills the model's context window, by category. Edit `usage` in Controls to try other numbers. */
const meta = {
  title: "Components/ContextPanel",
  component: ContextPanel,
  decorators: [(Story) => <div className="w-[19rem]"><Story /></div>],
  args: { usage: sampleContext, title: "Context", defaultExpanded: true },
} satisfies Meta<typeof ContextPanel>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
