import type { ActivityPart } from "@agentic-ui-kit/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ChatTheme } from "../primitives/chat-theme";
import { ActivityGroup } from "./activity-group";

afterEach(cleanup);

const part = (status: "streaming" | "done"): ActivityPart[] => [{ type: "thinking", id: "t", text: "Hmm", status } as ActivityPart];

it("shows icons.activity while working and icons.activityDone after", () => {
  const icons = { activity: <i data-testid="busy" />, activityDone: <i data-testid="rest" /> };
  const { queryByTestId, rerender } = render(<ChatTheme icons={icons}><ActivityGroup parts={part("streaming")} /></ChatTheme>);
  expect(queryByTestId("busy")).toBeTruthy();
  rerender(<ChatTheme icons={icons}><ActivityGroup parts={part("done")} /></ChatTheme>);
  expect(queryByTestId("rest")).toBeTruthy();
  expect(queryByTestId("busy")).toBeNull();
});

it("shows no icon by default", () => {
  const { container } = render(<ActivityGroup parts={part("streaming")} />);
  expect(container.querySelector(".chat-activity-icon")).toBeNull();
});

const thought = (extra: object): ActivityPart[] => [{ type: "thinking", id: "t", text: "", status: "done", visibility: "hidden", ...extra } as ActivityPart];

it("shows a finished thought with a title but no body as a plain line, not a disclosure", () => {
  const { container, getByText } = render(<ActivityGroup parts={thought({ title: "Planning the search" })} />);
  expect(getByText("Planning the search")).toBeTruthy();
  expect(container.querySelector("button, [aria-expanded]")).toBeNull();
});

it("drops a finished thought with no body and no title", () => {
  const { container } = render(<ActivityGroup parts={thought({})} />);
  expect(container.textContent).toBe("");
});

it("keeps a still-streaming hidden thought expandable", () => {
  const { container } = render(<ActivityGroup parts={thought({ status: "streaming" })} />);
  expect(container.querySelector("button")).toBeTruthy();
});

it("shows a bare thought among other steps as a row without a disclosure", () => {
  const parts = [...thought({ title: "Just thinking" }), { type: "tool_call", id: "c", name: "search", status: "done", inputJson: "{}", title: "Searched" } as ActivityPart];
  const { container, getByText } = render(<ActivityGroup parts={parts} defaultExpanded />);
  expect(getByText("Just thinking").closest("button")).toBeNull();
  expect(getByText("Searched").closest("button")).toBeTruthy();
  expect(container.querySelectorAll("button").length).toBe(2);
});

it("shows no token count for a tiny running step, and one once it grows", () => {
  const { container, rerender } = render(<ActivityGroup parts={part("streaming")} />);
  expect(container.textContent).not.toMatch(/tokens?\)/);
  const long = [{ type: "thinking", id: "t", text: "x".repeat(400), status: "streaming" } as ActivityPart];
  rerender(<ActivityGroup parts={long} />);
  expect(container.textContent).toMatch(/\(\d+ tokens\)/);
});
