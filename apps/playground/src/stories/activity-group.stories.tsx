import type { Meta, StoryObj } from "@storybook/react-vite";
import { reduceEvents, toBlocks, type ActivityPart, type StreamEvent } from "agentic-ui-kit/core";
import { mathRun, researchRun, stoppedRun } from "@agentic-ui-kit/core/fixtures";
import { ActivityGroup, ChatTheme } from "agentic-ui-kit";
import { expect } from "storybook/test";

function activityOf(events: StreamEvent[]): ActivityPart[] {
  const block = toBlocks(reduceEvents(events)!.parts).find((b) => b.kind === "activity");
  return block?.kind === "activity" ? block.parts : [];
}

/** A four-petal mark, standing in for a host's logo. */
function Logo({ spinning }: { spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={spinning ? "animate-spin [animation-duration:1.6s]" : undefined}>
      {[0, 90, 180, 270].map((r) => (
        <ellipse key={r} cx="12" cy="6.5" rx="3.2" ry="5.5" transform={`rotate(${r} 12 12)`} fill={r === 0 ? "var(--chat-accent)" : "var(--chat-fg)"} />
      ))}
    </svg>
  );
}

const thinking: ActivityPart[] = [{ type: "thinking", id: "t1", text: "Working out which dates are free...", status: "streaming" }];

/** The collapsible summary of what the model did: thinking, tool calls, memory. */
const meta = {
  title: "Components/ActivityGroup",
  component: ActivityGroup,
  // Keyed so `defaultExpanded` applies again when the control changes.
  render: (args) => <ActivityGroup key={String(args.defaultExpanded)} {...args} />,
  decorators: [(Story) => <div className="w-[52rem]"><Story /></div>],
  argTypes: { className: { control: false } },
  args: { parts: activityOf(researchRun), defaultExpanded: false },
} satisfies Meta<typeof ActivityGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A command and a web search. Click the summary to open it. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const summary = canvas.getAllByRole("button", { expanded: false })[0]!;
    await userEvent.click(summary);
    await expect(summary).toHaveAttribute("aria-expanded", "true");
  },
};

/** A memory lookup, from the math run. */
export const Memory: Story = { args: { parts: activityOf(mathRun) } };

/** One step: the heading is the step's own label and the box holds its detail. */
export const SingleSearch: Story = {
  args: { parts: activityOf(researchRun).filter((p) => p.type === "tool_call" && p.name === "web_search") },
};

/** A tool call cut short by Stop. */
export const StoppedToolCall: Story = { args: { parts: activityOf(stoppedRun) } };

/** The model is still thinking. */
export const StillThinking: Story = { args: { parts: thinking } };

/**
 * The host's logo left of the summary: `icons.activity` while the model works (here spinning),
 * `icons.activityDone` once done. Set on ChatTheme; by default there is none.
 */
export const WithLogo: Story = {
  args: { parts: thinking },
  decorators: [(Story) => <ChatTheme icons={{ activity: <Logo spinning />, activityDone: <Logo /> }}><Story /></ChatTheme>],
};
