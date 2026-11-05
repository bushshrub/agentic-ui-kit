import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleContext } from "@llm-chat/core/fixtures";
import { ContextPanel } from "@llm-chat/react";

const meta: Meta<typeof ContextPanel> = {
  title: "Components/ContextPanel",
  component: ContextPanel,
  decorators: [(Story) => <div className="w-[19rem]"><Story /></div>],
};
export default meta;

export const Default: StoryObj<typeof ContextPanel> = { args: { usage: sampleContext } };
