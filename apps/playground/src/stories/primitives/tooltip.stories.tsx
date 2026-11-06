import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Tooltip } from "agentic-ui-kit";
import { expect, within } from "storybook/test";

/** A short label on hover or focus. */
const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  decorators: [(Story) => <div className="p-16"><Story /></div>],
  args: { content: "Tooltip text", placement: "top", delay: 0, children: <span /> },
  argTypes: {
    content: { control: "text", description: "The label shown." },
    children: { control: false, description: "The element that triggers the tooltip; must be focusable. The story supplies a button." },
    placement: { control: "inline-radio", options: ["top", "bottom", "start", "end"], description: "Which side of the trigger it appears on." },
    delay: { control: { type: "range", min: 0, max: 1500, step: 100 }, description: "Milliseconds before it shows." },
  },
  parameters: { controls: { include: ["content", "children", "placement", "delay"] } },
  render: ({ children: _children, ...args }) => (
    <Tooltip {...args}>
      <Button variant="subtle">Hover me</Button>
    </Tooltip>
  ),
} satisfies Meta<typeof Tooltip>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Shows above the trigger on hover. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.tab();
    await expect(await within(document.body).findByRole("tooltip")).toHaveTextContent(String(args.content));
  },
};

/** Shows below the trigger. */
export const Bottom: Story = { args: { placement: "bottom" } };

/** Waits 600 ms (the kit default) before showing. */
export const Delayed: Story = { args: { delay: 600 } };
