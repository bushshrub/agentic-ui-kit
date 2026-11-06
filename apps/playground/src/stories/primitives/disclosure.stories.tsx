import type { Meta, StoryObj } from "@storybook/react-vite";
import { Disclosure } from "agentic-ui-kit";
import { Sparkles } from "lucide-react";
import { expect, fn } from "storybook/test";

/** A summary row that opens and closes its content. */
const meta = {
  title: "Primitives/Disclosure",
  component: Disclosure,
  decorators: [
    // Keyed so `defaultExpanded` applies again when it changes in Controls.
    (Story, { args }) => (
      <div key={String(args.defaultExpanded)} className="w-[32rem]">
        <Story />
      </div>
    ),
  ],
  args: {
    summary: "Recalled memory",
    defaultExpanded: false,
    indicator: "caret",
    onExpandedChange: fn(),
    children: <p className="mt-2 text-sm text-chat-muted">Prefers a worked example before the general formula.</p>,
  },
  argTypes: {
    summary: { control: "text", description: "The always-visible row." },
    children: { control: false, description: "The content shown when open." },
    defaultExpanded: { control: "boolean", description: "Open on first render." },
    indicator: { control: "inline-radio", options: ["caret", "chevron"], description: "The arrow style next to the summary." },
    onExpandedChange: { description: "Called with the new open state when the user toggles it." },
  },
  parameters: { controls: { include: ["summary", "children", "defaultExpanded", "indicator", "onExpandedChange"] } },
} satisfies Meta<typeof Disclosure>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Closed; clicking opens it. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onExpandedChange).toHaveBeenCalledWith(!args.defaultExpanded);
  },
};

/** Open on first render. */
export const Expanded: Story = { args: { defaultExpanded: true } };

/** A chevron instead of the caret. */
export const Chevron: Story = { args: { indicator: "chevron" } };

/** An icon before the summary text. */
export const WithIcon: Story = {
  args: { summary: <span className="flex items-center gap-1.5"><Sparkles className="size-4" /> Recalled memory</span> },
  argTypes: { summary: { control: false } },
};
