import type { Meta, StoryObj } from "@storybook/react-vite";
import { EffortSlider } from "agentic-ui-kit";
import { useState } from "react";
import { expect, fn } from "storybook/test";

const efforts = [
  { id: "low", label: "Low", description: "Quick answers" },
  { id: "medium", label: "Medium", description: "Balanced; the default", recommended: true },
  { id: "high", label: "High", description: "More thorough, takes longer" },
  { id: "max", label: "Max", description: "Most thorough", warning: "Slower" },
];

/** Effort as a slider, one stop per level. Drag, click a spot, or use the arrow keys. The story keeps `value` in state. */
const meta = {
  title: "Primitives/EffortSlider",
  component: EffortSlider,
  decorators: [(Story) => <div className="w-72 rounded-chat-popover border border-chat-popover-border bg-chat-popover p-3"><Story /></div>],
  args: { efforts, value: "medium", onChange: fn() },
  argTypes: {
    efforts: { control: "object", description: "The levels, in order: `id`, `label`, `description`, and optionally `recommended` or a `warning`." },
    value: { control: "select", options: efforts.map((e) => e.id), description: "The selected level's id (the story keeps it in state after the first change)." },
    label: { control: "text", description: "Heading above the slider." },
    onChange: { description: "Called with the id of the level the user picked." },
  },
  parameters: { controls: { include: ["efforts", "value", "label", "onChange"] } },
  render: ({ value: initial, onChange, ...args }) => {
    const [picked, setPicked] = useState<string | null>(null);
    return (
      <EffortSlider
        {...args}
        value={picked ?? initial}
        onChange={(id) => {
          setPicked(id);
          onChange(id);
        }}
      />
    );
  },
} satisfies Meta<typeof EffortSlider>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Starts on Medium; the arrow keys move one stop. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("slider"));
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onChange).toHaveBeenCalledWith("high");
  },
};

/** Starts on the highest level. */
export const Max: Story = { args: { value: "max" } };
