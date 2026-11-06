import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "agentic-ui-kit";
import { Plus } from "lucide-react";
import { expect, fn } from "storybook/test";

/** Text button in every variant and size. The icon, if any, comes before the label. */
const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Save", variant: "outline", size: "md", isDisabled: false, onPress: fn() },
  argTypes: {
    children: { control: "text", description: "The label. Icons go before it." },
    variant: { control: "select", options: ["ghost", "subtle", "outline", "primary", "danger"], description: "Visual weight and intent." },
    size: { control: "inline-radio", options: ["sm", "md", "lg"], description: "Height and padding." },
    isDisabled: { control: "boolean", description: "Blocks presses and dims the button." },
    onPress: { description: "Called when the button is pressed (click, tap, Enter or Space)." },
  },
  parameters: { controls: { include: ["children", "variant", "size", "isDisabled", "onPress"] } },
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The default outlined button. Pressing it calls `onPress`. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

/** A quiet filled button for secondary actions such as Cancel. */
export const Subtle: Story = { args: { variant: "subtle", children: "Cancel" } };

/** The main action: filled with the accent color. */
export const Primary: Story = { args: { variant: "primary" } };

/** A destructive action. */
export const Danger: Story = { args: { variant: "danger", children: "Delete" } };

/** The compact size. */
export const Small: Story = { args: { size: "sm" } };

/** The large size. */
export const Large: Story = { args: { size: "lg" } };

/** A label with an icon before it. */
export const WithIcon: Story = {
  args: { children: <><Plus /> New chat</> },
  argTypes: { children: { control: false } },
};

/** Disabled: no hover, no presses. */
export const Disabled: Story = { args: { isDisabled: true } };
