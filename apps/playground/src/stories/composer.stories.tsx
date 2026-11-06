import { Composer, ModelPicker, AttachButton, type ComposerProps } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { attachMenu, models } from "../lib/demo-chat";

type ComposerArgs = ComposerProps & {
  /** Shows the ModelPicker in the toolbar (not in the compact variant). */
  modelPicker?: boolean;
};

function ComposerDemo({ modelPicker, ...args }: ComposerArgs) {
  const [model, setModel] = useState(models[0]!.id);
  const [effort, setEffort] = useState("medium");
  return (
    <div className="w-[40rem]">
      <Composer
        leading={attachMenu()}
        {...(modelPicker && args.variant !== "compact" && {
          trailing: <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />,
        })}
        {...args}
      />
    </div>
  );
}

/** The message box. Submit, stop and dropped files log to Actions. */
const meta = {
  title: "Components/Composer",
  component: Composer,
  subcomponents: { AttachButton },
  render: (args) => <ComposerDemo {...args} />,
  parameters: { controls: { exclude: ["leading", "trailing", "above", "dictation", "value", "onChange", "className"] } },
  argTypes: {
    variant: { control: "inline-radio", options: ["docked", "centered", "compact"] },
    modelPicker: { description: "Shows the ModelPicker in the toolbar (not in the compact variant).", table: { category: "Story" } },
  },
  args: { variant: "docked", busy: false, isDisabled: false, placeholder: "Reply…", onSubmit: fn(), onStop: fn(), onFiles: fn(), modelPicker: true } as ComposerArgs,
} satisfies Meta<ComposerArgs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox"), "Hello there{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith("Hello there");
  },
};

/** The empty state of a new chat: taller, with a welcome prompt. */
export const Centered: Story = { args: { variant: "centered", placeholder: "How can I help you today?" } };

/** One row, no model picker, for panels and inline use. */
export const Compact: Story = { args: { variant: "compact" } };

/** While a reply streams the send button is a stop button. */
export const Busy: Story = {
  args: { busy: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /stop/i }));
    await expect(args.onStop).toHaveBeenCalled();
  },
};

/** The box and its buttons can't be used. */
export const Disabled: Story = { args: { isDisabled: true } };
