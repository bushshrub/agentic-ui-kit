import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "agentic-ui-kit";
import { ArrowUp, X } from "lucide-react";
import { expect, fn } from "storybook/test";

/** A square button holding only an icon; hover for its label. */
const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
  args: { label: "Send", children: <ArrowUp />, variant: "primary", size: "md", isDisabled: false, onPress: fn() },
  argTypes: {
    label: { control: "text", description: "Accessible name, also shown as the tooltip." },
    children: { control: false, description: "The icon." },
    variant: { control: "select", options: ["ghost", "subtle", "outline", "primary", "danger"], description: "Visual weight and intent." },
    size: { control: "inline-radio", options: ["sm", "md"], description: "Button size." },
    isDisabled: { control: "boolean", description: "Blocks presses and dims the button." },
    disabledReason: { control: "text", description: "Why the button is disabled. With `isDisabled` the button stays focusable, never fires `onPress`, and shows the reason as a tooltip and accessible description." },
    onPress: { description: "Called when the button is pressed." },
  },
  parameters: { controls: { include: ["label", "children", "variant", "size", "isDisabled", "disabledReason", "onPress"] } },
} satisfies Meta<typeof IconButton>;
export default meta;

type Story = StoryObj<typeof meta>;

/** The primary send button. Pressing it calls `onPress`. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: args.label }));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

/** The quiet default used for toolbar actions. */
export const Ghost: Story = { args: { label: "Close", children: <X />, variant: "ghost" } };

/** The compact size. */
export const Small: Story = { args: { size: "sm" } };

/** Disabled: no hover, no presses. */
export const Disabled: Story = { args: { isDisabled: true } };

/** Disabled with a reason: focusable, and the tooltip and description explain why. */
export const DisabledWithReason: Story = {
  args: { isDisabled: true, disabledReason: "Write a message first" },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};
