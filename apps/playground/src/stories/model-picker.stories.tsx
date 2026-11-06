import { ModelPicker } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";
import { models } from "../lib/demo-chat";

interface PickerArgs {
  /** Starting model. Models without `efforts` show no Effort submenu. */
  model: string;
  onModelChange: (id: string) => void;
  onEffortChange: (id: string) => void;
}

function PickerDemo({ model: initial, onModelChange, onEffortChange }: PickerArgs) {
  const [model, setModel] = useState(initial);
  const [effort, setEffort] = useState("medium");
  return (
    <ModelPicker
      models={models}
      model={model}
      onModelChange={(id) => (setModel(id), onModelChange(id))}
      effort={effort}
      onEffortChange={(id) => (setEffort(id), onEffortChange(id))}
    />
  );
}

/** Effort levels come from the model (`efforts`); models without them show no Effort submenu. */
const meta = {
  title: "Components/ModelPicker",
  component: PickerDemo,
  subcomponents: { ModelPicker },
  argTypes: { model: { control: "select", options: models.map((m) => m.id) } },
  args: { model: models[0]!.id, onModelChange: fn(), onEffortChange: fn() },
} satisfies Meta<typeof PickerDemo>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    // The menu renders in a portal.
    const menu = within(document.body);
    await userEvent.click(await menu.findByText("Claude Sonnet 5.5"));
    await expect(args.onModelChange).toHaveBeenCalledWith("claude-sonnet-5-5");
  },
};
