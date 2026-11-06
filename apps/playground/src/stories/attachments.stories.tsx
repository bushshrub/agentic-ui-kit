import { AttachmentCard, AttachmentRow } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

/** A square card in the composer's attachment row. */
const meta = {
  title: "Components/Attachments",
  component: AttachmentCard,
  subcomponents: { AttachmentRow },
  decorators: [(Story) => <div className="p-2"><Story /></div>],
  argTypes: { size: { control: "inline-radio", options: ["md", "sm"] } },
  args: {
    attachment: { name: "Pasted text", mime: "text/plain", text: "[factory]\nenable_template = true\n".repeat(8) },
    size: "md",
    onRemove: fn(),
    onOpen: fn(),
  },
} satisfies Meta<typeof AttachmentCard>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Pasted text: a preview with a PASTED badge. */
export const PastedText: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /remove/i }));
    await expect(args.onRemove).toHaveBeenCalled();
  },
};

/** A file, with its type. */
export const PlainFile: Story = { args: { attachment: { name: "boot-trace.log", mime: "text/plain" } } };

/** An upload in progress. */
export const Uploading: Story = { args: { attachment: { name: "benchmarks.pdf", mime: "application/pdf", status: "uploading" } } };

/** A failed upload. */
export const Failed: Story = { args: { attachment: { name: "huge.iso", mime: "application/octet-stream", status: "error", error: "Too large" } } };
