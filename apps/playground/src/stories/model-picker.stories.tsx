import { ModelPicker } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { expect, fn, within } from "storybook/test";
import { models } from "../lib/demo-chat";

/** Effort levels come from the model (`efforts`); models without them show no Effort submenu. */
const meta = {
  title: "Components/ModelPicker",
  component: ModelPicker,
  // Picking a model or effort in the menu updates the controls.
  render: (args) => {
    const [, updateArgs] = useArgs();
    return (
      <ModelPicker
        {...args}
        onModelChange={(id) => (args.onModelChange(id), updateArgs({ model: id }))}
        onEffortChange={(id) => (args.onEffortChange?.(id), updateArgs({ effort: id }))}
      />
    );
  },
  argTypes: {
    models: { control: false },
    model: { control: "select", options: models.map((m) => m.id) },
    effort: { control: "inline-radio", options: ["low", "medium", "high"] },
    effortNote: { control: false },
    footnote: { control: false },
  },
  args: { models, model: models[0]!.id, effort: "medium", onModelChange: fn(), onEffortChange: fn() },
} satisfies Meta<typeof ModelPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    // The menu renders in a portal.
    const menu = within(document.body);
    await userEvent.click(await menu.findByText("Claude Sonnet 5.5"));
    await expect(args.onModelChange).toHaveBeenCalledWith("claude-sonnet-5-5");
  },
};

const logo = (color: string) => (
  <svg viewBox="0 0 16 16" aria-hidden><circle cx="8" cy="8" r="7" fill={color} /></svg>
);

/** `icon` on a model (a provider logo) shows before its name in the menu and on the button. */
export const WithIcons: Story = {
  args: { models: models.map((m, i) => ({ ...m, icon: logo(["#d97757", "#41826a", "#6b7fd7"][i % 3]!) })) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(await within(document.body).findAllByRole("menuitemradio")).not.toHaveLength(0);
  },
};

/** A model without `efforts` shows no Effort submenu. */
export const WithoutEffort: Story = { args: { model: "gpt-6-astra-mini" } };
