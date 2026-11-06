import { Composer, ModelPicker, AttachButton } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { attachMenu, models } from "../lib/demo-chat";

interface ComposerArgs {
  /** docked: under a chat in progress. centered: the empty state, taller. compact: one row, no model picker. */
  variant: "docked" | "centered" | "compact";
  /** A reply is streaming: send becomes stop, and Enter does not send. */
  busy: boolean;
  isDisabled: boolean;
  /** Shows the ModelPicker in the toolbar. */
  modelPicker: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
  onFiles: (files: File[]) => void;
}

function ComposerDemo({ variant, busy, isDisabled, modelPicker, onSubmit, onStop, onFiles }: ComposerArgs) {
  const [model, setModel] = useState(models[0]!.id);
  const [effort, setEffort] = useState("medium");
  return (
    <div className="w-[40rem]">
      <Composer
        variant={variant}
        busy={busy}
        isDisabled={isDisabled}
        onSubmit={onSubmit}
        onStop={onStop}
        onFiles={onFiles}
        placeholder={variant === "centered" ? "How can I help you today?" : "Reply…"}
        leading={attachMenu()}
        {...(modelPicker && variant !== "compact" && {
          trailing: <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />,
        })}
      />
    </div>
  );
}

/** The message box. Pick the variant and state in Controls; submit, stop and dropped files log to Actions. */
const meta = {
  title: "Components/Composer",
  component: ComposerDemo,
  subcomponents: { Composer, AttachButton },
  argTypes: {
    variant: { control: "inline-radio", options: ["docked", "centered", "compact"] },
    modelPicker: { if: { arg: "variant", neq: "compact" } },
  },
  args: { variant: "docked", busy: false, isDisabled: false, modelPicker: true, onSubmit: fn(), onStop: fn(), onFiles: fn() },
} satisfies Meta<typeof ComposerDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox"), "Hello there{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith("Hello there");
  },
};

/** While a reply streams the send button is a stop button. */
export const Busy: Story = {
  args: { busy: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /stop/i }));
    await expect(args.onStop).toHaveBeenCalled();
  },
};
