import type { Meta, StoryObj } from "@storybook/react-vite";
import { SegmentedControl } from "agentic-ui-kit";
import { LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { expect, fn } from "storybook/test";

const textOptions = [{ id: "a", label: "Chat" }, { id: "b", label: "Cowork" }];
const iconOptions = [
  { id: "a", label: "List", icon: <List />, iconOnly: true },
  { id: "b", label: "Grid", icon: <LayoutGrid />, iconOnly: true },
];

/** One of a few options on a track, like the Chat / Cowork switch. The story keeps `value` in state, so clicking switches. */
const meta = {
  title: "Primitives/SegmentedControl",
  component: SegmentedControl,
  args: { label: "Mode", options: textOptions, value: "a", onChange: fn() },
  argTypes: {
    label: { control: "text", description: "Accessible name of the group." },
    options: { control: "object", description: "The choices: `id`, `label`, and optionally `icon` and `iconOnly` (then the label is only the accessible name)." },
    value: { control: false, description: "The selected option's id. Held in state by the story." },
    clearable: { control: "boolean", description: "Pressing the selected option clears the selection: `value` may be null and `onChange` gets null." },
    isDisabled: { control: "boolean", description: "Disable the whole control. An option can also set `isDisabled`." },
    size: { control: "inline-radio", options: ["sm", "md"], description: "Height of the buttons: sm 24px (default), md 32px." },
    onChange: { description: "Called with the id of the option the user picked." },
  },
  parameters: { controls: { include: ["label", "options", "clearable", "isDisabled", "size", "onChange"] } },
  render: ({ value: initial, onChange, ...args }) => {
    const [value, setValue] = useState<string | null>(initial);
    return (
      <div className="inline-flex rounded-chat-lg bg-chat-surface p-2">
        <SegmentedControl
          {...args}
          clearable
          value={args.clearable ? value : (value ?? "a")}
          onChange={(v: string | null) => {
            setValue(v);
            (onChange as (v: string | null) => void)(v);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof SegmentedControl>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Text options. Clicking the second one reports its id. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("radio")[1]!);
    await expect(args.onChange).toHaveBeenCalledWith("b");
  },
};

/** Icons only; the labels become the accessible names. */
export const IconOnly: Story = { args: { label: "View", options: iconOptions } };

/** Clearable: pressing the selected option again reports null. */
export const Clearable: Story = {
  args: { clearable: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("radio")[0]!);
    await expect(args.onChange).toHaveBeenCalledWith(null);
  },
};

/** The taller size. */
export const Medium: Story = { args: { size: "md" } };

/** Disabled as a whole. */
export const Disabled: Story = { args: { isDisabled: true } };
