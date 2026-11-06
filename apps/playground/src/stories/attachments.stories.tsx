import { AttachmentCard, type AttachmentCardProps, AttachmentRow } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

/** The attachments to pick from. */
const attachments = {
  "pasted text": { name: "Pasted text", mime: "text/plain", text: "[factory]\nenable_template = true\n".repeat(8) },
  file: { name: "boot-trace.log", mime: "text/plain" },
  uploading: { name: "benchmarks.pdf", mime: "application/pdf", status: "uploading" },
  error: { name: "huge.iso", mime: "application/octet-stream", status: "error", error: "Too large" },
} satisfies Record<string, AttachmentCardProps["attachment"]>;

interface CardArgs {
  /** What the card shows: a pasted-text preview, a file, an upload in progress, or a failed upload. */
  attachment: keyof typeof attachments;
  size: "md" | "sm";
  /** Shows the remove button (on hover and focus; always on touch). */
  onRemove: () => void;
  /** Pasted text: opens it to view or edit. */
  onOpen: () => void;
}

function Card({ attachment, size, onRemove, onOpen }: CardArgs) {
  return (
    <div className="p-2">
      <AttachmentCard attachment={attachments[attachment]} size={size} onRemove={onRemove} onOpen={onOpen} />
    </div>
  );
}

/** A square card in the composer's attachment row. */
const meta = {
  title: "Components/Attachments",
  component: Card,
  subcomponents: { AttachmentCard, AttachmentRow },
  argTypes: {
    attachment: { control: "select", options: Object.keys(attachments) },
    size: { control: "inline-radio", options: ["md", "sm"] },
  },
  args: { attachment: "pasted text", size: "md", onRemove: fn(), onOpen: fn() },
} satisfies Meta<typeof Card>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /remove/i }));
    await expect(args.onRemove).toHaveBeenCalled();
  },
};
