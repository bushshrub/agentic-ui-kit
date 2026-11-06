import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton, Panel } from "agentic-ui-kit";
import { Maximize2, X } from "lucide-react";
import { expect, fn } from "storybook/test";

type Args = Parameters<typeof Panel>[0] & {
  /** Show the expand and close buttons in the header. */
  showActions: boolean;
  /** Show the footer. */
  showFooter: boolean;
  onClose: () => void;
};

/** A framed region with a header that fills its container; an assistant dock, or one agent pane in a dashboard. */
const meta = {
  title: "Primitives/Panel",
  component: Panel,
  decorators: [(Story) => <div className="h-80 w-[22rem]"><Story /></div>],
  args: { title: "Assistant", variant: "card", "aria-label": "Panel", showActions: true, showFooter: true, onClose: fn(), children: null },
  argTypes: {
    title: { control: "text", description: "Header text; empty leaves the header out (unless there are actions)." },
    variant: { control: "inline-radio", options: ["card", "flush"], description: "Framed card, or flush with no frame." },
    "aria-label": { control: "text", description: "Accessible name of the region." },
    actions: { control: false, description: "Controls on the right of the header. The story fills them from `showActions`." },
    footer: { control: false, description: "Content under the body. The story fills it from `showFooter`." },
    children: { control: false, description: "The scrolling body. The story supplies filler text." },
    showActions: { control: "boolean", description: "Show the expand and close buttons.", table: { category: "Story" } },
    showFooter: { control: "boolean", description: "Show a footer.", table: { category: "Story" } },
    onClose: { description: "Called when the close button is pressed.", table: { category: "Events" } },
  },
  parameters: { controls: { include: ["title", "variant", "showActions", "showFooter", "onClose"] } },
  render: ({ showActions, showFooter, onClose, ...args }) => (
    <Panel
      {...args}
      title={args.title || undefined}
      actions={
        showActions ? (
          <>
            <IconButton label="Expand" size="sm">
              <Maximize2 />
            </IconButton>
            <IconButton label="Close" size="sm" onPress={onClose}>
              <X />
            </IconButton>
          </>
        ) : undefined
      }
      footer={showFooter ? <span className="text-xs text-chat-muted">Footer</span> : undefined}
    >
      <p className="m-0 p-3 text-sm">{"Scrolling body. ".repeat(60)}</p>
    </Panel>
  ),
} satisfies Meta<Args>;
export default meta;

type Story = StoryObj<typeof meta>;

/** A card with a title, header actions and a footer. Pressing Close calls `onClose`. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** No frame, for a pane that sits flush in its container. */
export const Flush: Story = { args: { variant: "flush" } };

/** Just a body: no header actions, no footer. */
export const Minimal: Story = { args: { showActions: false, showFooter: false } };
