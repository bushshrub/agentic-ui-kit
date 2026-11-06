import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Drawer } from "agentic-ui-kit";
import { useEffect, useState } from "react";
import { expect, fn, waitFor, within } from "storybook/test";

/** A side drawer over a dimmed page. Escape and clicking outside close it. The story adds an "Open drawer" button and keeps `isOpen` in state. */
const meta = {
  title: "Primitives/Drawer",
  component: Drawer,
  args: { isOpen: false, side: "left", "aria-label": "Drawer", onOpenChange: fn(), children: null },
  argTypes: {
    isOpen: { control: "boolean", description: "Whether the drawer is showing." },
    side: { control: "inline-radio", options: ["left", "right"], description: "Which edge the drawer slides from." },
    "aria-label": { control: "text", description: "Accessible name of the drawer." },
    children: { control: false, description: "The drawer content. The story supplies a short paragraph." },
    onOpenChange: { description: "Called with `false` when the user dismisses it (Escape, outside click)." },
  },
  parameters: { controls: { include: ["isOpen", "side", "aria-label", "children", "onOpenChange"] } },
  render: ({ isOpen, onOpenChange, side, ...args }) => {
    const [open, setOpen] = useState(isOpen);
    useEffect(() => setOpen(isOpen), [isOpen]);
    const change = (value: boolean) => {
      setOpen(value);
      onOpenChange(value);
    };
    return (
      <>
        <Button variant="subtle" onPress={() => change(true)}>
          Open drawer
        </Button>
        <Drawer {...args} side={side} isOpen={open} onOpenChange={change}>
          <p className="p-4 text-sm">{side === "left" ? "The sidebar uses this on phones." : "E.g. a context or settings panel."}</p>
        </Drawer>
      </>
    );
  },
} satisfies Meta<typeof Drawer>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Slides in from the left, as the sidebar does on phones. Escape closes it. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Open/ }));
    const dialog = await within(document.body).findByRole("dialog");
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true);
    await userEvent.keyboard("{Escape}");
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

/** Slides in from the right, e.g. for a context or settings panel. */
export const Right: Story = { args: { side: "right" } };
