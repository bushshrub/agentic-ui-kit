import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Modal } from "agentic-ui-kit";
import { useEffect, useState } from "react";
import { expect, fn, waitFor, within } from "storybook/test";

/** A centered dialog over a dimmed page. Escape and clicking outside close it. The story adds an "Open modal" button and keeps `isOpen` in state. */
const meta = {
  title: "Primitives/Modal",
  component: Modal,
  args: { isOpen: false, title: "Rename chat", size: "md", placement: "center", onOpenChange: fn(), children: null },
  argTypes: {
    isOpen: { control: "boolean", description: "Whether the dialog is showing." },
    title: { control: "text", description: "Heading of the dialog; also its accessible name." },
    size: { control: "select", options: ["sm", "md", "lg", "xl", "full"], description: "Width of the dialog (default lg)." },
    placement: { control: "inline-radio", options: ["center", "top"], description: "Vertical position: centered, or near the top (e.g. a command palette)." },
    className: { control: "text", description: "Classes for the dialog panel. Merged with tailwind-merge, so they win over the size without `!`." },
    children: { control: false, description: "The dialog body. The story supplies a rename form." },
    onOpenChange: { description: "Called with `false` when the user dismisses it (Escape, outside click), or with the new state from the story's buttons." },
  },
  parameters: { controls: { include: ["isOpen", "title", "size", "placement", "className", "children", "onOpenChange"] } },
  render: ({ isOpen, onOpenChange, ...args }) => {
    const [open, setOpen] = useState(isOpen);
    useEffect(() => setOpen(isOpen), [isOpen]);
    const change = (value: boolean) => {
      setOpen(value);
      onOpenChange(value);
    };
    return (
      <>
        <Button variant="subtle" onPress={() => change(true)}>
          Open modal
        </Button>
        <Modal {...args} isOpen={open} onOpenChange={change}>
          <input aria-label="Title" defaultValue="Speeding up CI" className="mx-5 h-10 rounded-chat-md border border-chat-border bg-chat-bg px-3 text-chat-fg outline-none focus:border-chat-border-strong" />
          <div className="flex justify-end gap-2 px-5 py-4">
            <Button variant="subtle" onPress={() => change(false)}>
              Cancel
            </Button>
            <Button variant="primary" onPress={() => change(false)}>
              Save
            </Button>
          </div>
        </Modal>
      </>
    );
  },
} satisfies Meta<typeof Modal>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Opens from a button and closes on Escape. */
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

/** Already open on first render. */
export const Open: Story = { args: { isOpen: true } };

/** Small dialog for a quick confirmation. */
export const Small: Story = { args: { isOpen: true, size: "sm" } };

/** Anchored near the top edge, like a command palette. */
export const Top: Story = { args: { isOpen: true, placement: "top" } };

/** Fills the page. */
export const Full: Story = { args: { isOpen: true, size: "full" } };

/** A caller class overrides the size, no `!` needed. */
export const CustomWidth: Story = { args: { isOpen: true, className: "max-w-[30rem]" } };
