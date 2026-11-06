import type { ToolCallPart } from "@agentic-ui-kit/core";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ApprovalCard } from "./approval-card";
import { ToolViewsProvider } from "./tools";

const part = (name: string): ToolCallPart => ({ type: "tool_call", id: "c", name, status: "awaiting", input: { command: "ls" }, inputJson: "{}", runsOn: "client" }) as ToolCallPart;
const card = (name: string) => <ApprovalCard approval={{ messageId: "m", part: part(name) }} onRespond={() => {}} />;

it("asks the built-in command tool in the present tense", () => {
  render(card("bash"));
  expect(screen.getByText("Run this command?")).toBeTruthy();
});

it("builds the default question from askLabel, else the row label", () => {
  const { unmount } = render(
    <ToolViewsProvider tools={{ add: { label: () => "Added events", askLabel: () => "add these events" } }}>{card("add")}</ToolViewsProvider>,
  );
  expect(screen.getByText("Allow add these events?")).toBeTruthy();
  unmount();
  render(<ToolViewsProvider tools={{ add: { label: () => "Added events" } }}>{card("add")}</ToolViewsProvider>);
  expect(screen.getByText("Allow Added events?")).toBeTruthy();
});
