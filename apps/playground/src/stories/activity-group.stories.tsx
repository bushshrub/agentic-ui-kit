import type { Meta, StoryObj } from "@storybook/react-vite";
import { reduceEvents, toBlocks, type ActivityPart, type StreamEvent } from "agentic-ui-kit/core";
import { mathRun, researchRun, stoppedRun } from "@agentic-ui-kit/core/fixtures";
import { ActivityGroup, ChatTheme } from "agentic-ui-kit";

function activityOf(events: StreamEvent[]): ActivityPart[] {
  const block = toBlocks(reduceEvents(events)!.parts).find((b) => b.kind === "activity");
  return block?.kind === "activity" ? block.parts : [];
}

const meta: Meta<typeof ActivityGroup> = {
  title: "Components/ActivityGroup",
  component: ActivityGroup,
  decorators: [(Story) => <div className="w-[52rem]"><Story /></div>],
};
export default meta;

type Story = StoryObj<typeof ActivityGroup>;

export const Memory: Story = { args: { parts: activityOf(mathRun), defaultExpanded: true } };
export const CommandAndSearch: Story = { args: { parts: activityOf(researchRun), defaultExpanded: true } };
export const SingleSearch: Story = {
  args: { parts: activityOf(researchRun).filter((p) => p.type === "tool_call" && p.name === "web_search"), defaultExpanded: true },
};
export const Closed: Story = { args: { parts: activityOf(researchRun) } };
export const StoppedToolCall: Story = { args: { parts: activityOf(stoppedRun), defaultExpanded: true } };

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

/**
 * The host's logo left of the summary: `icons.activity` while the model works (here spinning),
 * `icons.activityDone` once it is done. Set them on ChatTheme; by default there is none.
 */
export const WithLogo: Story = {
  render: () => (
    <ChatTheme icons={{ activity: <Logo spinning />, activityDone: <Logo /> }}>
      <div className="flex flex-col gap-4">
        <ActivityGroup parts={thinking} />
        <ActivityGroup parts={activityOf(researchRun)} />
      </div>
    </ChatTheme>
  ),
};
