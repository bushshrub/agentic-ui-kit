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
