import type { Meta, StoryObj } from "@storybook/react-vite";
import { reduceEvents, toBlocks, type ActivityPart, type StreamEvent } from "agentic-ui-kit/core";
import { mathRun, researchRun, stoppedRun } from "@agentic-ui-kit/core/fixtures";
import { ActivityGroup, ChatTheme } from "agentic-ui-kit";
import { expect } from "storybook/test";

function activityOf(events: StreamEvent[]): ActivityPart[] {
  const block = toBlocks(reduceEvents(events)!.parts).find((b) => b.kind === "activity");
  return block?.kind === "activity" ? block.parts : [];
}

/** The activity to show, from recorded runs. */
const activities = {
  memory: activityOf(mathRun),
  "command and search": activityOf(researchRun),
  "single search": activityOf(researchRun).filter((p) => p.type === "tool_call" && p.name === "web_search"),
  "stopped tool call": activityOf(stoppedRun),
  "still thinking": [{ type: "thinking", id: "t1", text: "Working out which dates are free...", status: "streaming" }] as ActivityPart[],
};

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

interface GroupArgs {
  activity: keyof typeof activities;
  /** Open on first render. */
  defaultExpanded: boolean;
  /**
   * The host's logo left of the summary: `icons.activity` while the model works (here spinning),
   * `icons.activityDone` once done. Set on ChatTheme; by default there is none.
   */
  logo: boolean;
}

function Group({ activity, defaultExpanded, logo }: GroupArgs) {
  // Keyed so `defaultExpanded` applies again when a control changes.
  const group = <ActivityGroup key={`${activity}-${defaultExpanded}`} parts={activities[activity]} defaultExpanded={defaultExpanded} />;
  return logo ? <ChatTheme icons={{ activity: <Logo spinning />, activityDone: <Logo /> }}>{group}</ChatTheme> : group;
}

/** The collapsible summary of what the model did: thinking, tool calls, memory. */
const meta = {
  title: "Components/ActivityGroup",
  component: Group,
  subcomponents: { ActivityGroup },
  decorators: [(Story) => <div className="w-[52rem]"><Story /></div>],
  argTypes: { activity: { control: "select", options: Object.keys(activities) } },
  args: { activity: "command and search", defaultExpanded: false, logo: false },
} satisfies Meta<typeof Group>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Activity: Story = {
  name: "ActivityGroup",
  play: async ({ canvas, userEvent }) => {
    const summary = canvas.getAllByRole("button", { expanded: false })[0]!;
    await userEvent.click(summary);
    await expect(summary).toHaveAttribute("aria-expanded", "true");
  },
};

export const WithLogo: Story = { args: { activity: "still thinking", logo: true } };
