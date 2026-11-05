import type { Meta, StoryObj } from "@storybook/react-vite";
import { reduceEvents, toBlocks, type ActivityPart, type StreamEvent } from "agentic-ui-kit/core";
import { mathRun, researchRun, stoppedRun } from "@agentic-ui-kit/core/fixtures";
import { ActivityGroup } from "agentic-ui-kit";

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
