import { Panel } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A titled region that fills its container and scrolls its body: a dock panel, an agent pane, a settings card. */
const meta = {
  title: "Components/Panel",
  component: Panel,
  decorators: [(Story) => <div className="h-64 w-96"><Story /></div>],
  argTypes: {
    title: { control: "text", description: "Header text; the header is left out when neither `title` nor `actions` is set." },
    actions: { control: false, description: "Right side of the header, e.g. expand and close buttons." },
    footer: { control: false, description: "Pinned under the body." },
    children: { control: false, description: "The body." },
  },
  args: { title: "Settings", children: <p className="m-0">Body text without any padding of its own.</p> },
} satisfies Meta<typeof Panel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `padded` adds body padding for plain content; leave it off for a `ChatView` or list that runs edge to edge. */
export const Padded: Story = { args: { padded: true } };

/** "flush" has no frame, for a pane that fills a column. */
export const Flush: Story = { args: { variant: "flush", padded: true } };
