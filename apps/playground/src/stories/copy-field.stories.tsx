import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, CopyField, Modal } from "agentic-ui-kit";
import { useState } from "react";
import { expect, fn, within } from "storybook/test";

/** A read-only, selectable field with a Copy button. The button reads "Copied" for about 2 seconds. Without a clipboard it selects the text instead. */
const meta = {
  title: "Components/CopyField",
  component: CopyField,
  decorators: [(Story) => <div className="w-[28rem]"><Story /></div>],
  args: { value: "https://chat.example.com/s/8f3k2m9xq", onCopy: fn() },
  argTypes: {
    value: { control: "text", description: "The text shown and copied, e.g. a share link." },
    "aria-label": { control: "text", description: "Accessible name of the input. Default: the `copyFieldLabel` label." },
    onCopy: { description: "Called after the text reached the clipboard." },
  },
  parameters: { controls: { include: ["value", "aria-label", "onCopy"] } },
} satisfies Meta<typeof CopyField>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Click Copy to see the "Copied" state. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Link" })).toHaveAttribute("readonly");
    await expect(canvas.getByRole("button", { name: "Copy" })).toBeVisible();
  },
};

/** Inside a Modal, as the body of a share dialog. */
export const InShareDialog: Story = {
  decorators: [],
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="subtle" onPress={() => setOpen(true)}>
          Share
        </Button>
        <Modal isOpen={open} onOpenChange={setOpen} title="Share chat" className="max-w-md">
          <div className="space-y-3 px-5">
            <p className="text-(length:--chat-ui-font-size) text-chat-muted">Anyone with the link can read a snapshot of this chat.</p>
            <CopyField {...args} />
          </div>
          <div className="flex justify-end px-5 py-4">
            <Button variant="subtle" onPress={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </Modal>
      </>
    );
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Share" }));
    const dialog = await within(document.body).findByRole("dialog", { name: "Share chat" });
    await expect(within(dialog).getByRole("textbox", { name: "Link" })).toBeInTheDocument();
  },
};
