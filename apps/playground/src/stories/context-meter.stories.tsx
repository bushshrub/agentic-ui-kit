import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleContext } from "@agentic-ui-kit/core/fixtures";
import { Composer, ContextMeter, ModelPicker } from "agentic-ui-kit";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";
import { models } from "../lib/demo-chat";

const usageOf = (tokens: number) => ({
  limit: 200_000,
  categories: [
    { id: "system", label: "System prompt", tokens: 3_000, color: "#5aa588" },
    { id: "messages", label: "Messages", tokens: tokens - 3_000, color: "#c19319" },
  ],
});

/** A small ring for the composer toolbar, filled to the share of the context window in use. Hover for the numbers; click opens the ContextPanel above it. */
const meta = {
  title: "Components/ContextMeter",
  component: ContextMeter,
  args: { usage: usageOf(13_800), isLoading: false, warnAt: 0.75, dangerAt: 0.9, placement: "top end" },
  argTypes: {
    usage: { control: "object", description: "The same numbers ContextPanel takes. The ring fills to used/limit." },
    tooltip: { control: "text", description: "Replaces the tooltip text. The accessible name stays the summary." },
    tooltipNote: { control: "text", description: "An extra line under the tooltip text." },
    isLoading: { control: "boolean", description: "The numbers are not in yet: the ring spins and the panel does not open." },
    warnAt: { control: "number", description: "Fraction of the window from which the ring turns to the warning color." },
    dangerAt: { control: "number", description: "Fraction of the window from which the ring turns to the danger color." },
    placement: { control: "select", options: ["top", "top start", "top end", "bottom", "bottom start", "bottom end"], description: "Where the panel opens, relative to the ring." },
  },
  parameters: { controls: { include: ["usage", "tooltip", "tooltipNote", "isLoading", "warnAt", "dangerAt", "placement"] } },
  decorators: [(Story) => <div className="flex h-96 items-end justify-center"><Story /></div>],
} satisfies Meta<typeof ContextMeter>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 7% used; click opens the breakdown. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Context: 13.8k / 200k (7%)" }));
    const dialog = await within(document.body).findByRole("dialog", { name: "Context" });
    await expect(dialog).toBeInTheDocument();
  },
};

/** Past 75% the ring turns to the warning color. */
export const Warning: Story = { args: { usage: usageOf(160_000) } };

/** Past 90% it turns to the danger color. */
export const Danger: Story = { args: { usage: usageOf(190_000) } };

/** Waiting for the numbers. */
export const Loading: Story = { args: { isLoading: true } };

/** A tooltip override with an extra line. */
export const CustomTooltip: Story = {
  args: { tooltip: "13.8k of 200k tokens", tooltipNote: "Older messages are summarized at 90%" },
};

/** In a Composer's trailing slot, next to the ModelPicker. */
export const InComposer: Story = {
  decorators: [],
  parameters: { controls: { exclude: ["placement"] } },
  render: (args) => {
    const [model, setModel] = useState(models[0]!.id);
    const [effort, setEffort] = useState("medium");
    return (
      <div className="w-[40rem] pt-96">
        <Composer
          onSubmit={fn()}
          placeholder="Reply…"
          trailing={
            <>
              <ContextMeter {...args} usage={sampleContext} />
              <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />
            </>
          }
        />
      </div>
    );
  },
};
