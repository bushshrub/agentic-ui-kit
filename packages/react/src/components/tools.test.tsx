import { reduceEvents, toBlocks, type ActivityPart, type StreamEvent } from "@agentic-ui-kit/core";
import { mathRun, researchRun } from "@agentic-ui-kit/core/fixtures";
import { expect, it } from "vitest";
import { activityHeading, defaultToolViews } from "./tools";

function activityOf(events: StreamEvent[]): ActivityPart[] {
  const block = toBlocks(reduceEvents(events)!.parts).find((b) => b.kind === "activity");
  return block?.kind === "activity" ? block.parts : [];
}

it("heads a finished group with what its tools did, skipping thinking", () => {
  expect(activityHeading(activityOf(researchRun), defaultToolViews)).toBe("Ran a command, searched the web");
  expect(activityHeading(activityOf(mathRun), defaultToolViews)).toBe("Recalled memory");
});

it("counts repeated tools and falls back for unknown ones", () => {
  const bash = activityOf(researchRun).find((p) => p.type === "tool_call" && p.name === "bash")!;
  const other = { ...bash, id: "x", name: "lookup_job" };
  expect(activityHeading([bash, { ...bash, id: "b2" }, other], defaultToolViews)).toBe("Ran 2 commands, used lookup_job");
});

it("follows the latest step while live", () => {
  const parts = activityOf(researchRun);
  const live = [...parts.slice(0, 2), { ...parts[2]!, status: "streaming" as const }];
  expect(activityHeading(live, defaultToolViews)).toBe("Checking whether 3.10 has reached end of life");
});
