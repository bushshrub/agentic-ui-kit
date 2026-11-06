import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { CalendarExample } from "../examples/calendar";
import { CodingExample } from "../examples/coding";
import { JobApplicationExample } from "../examples/job-application";

interface ExampleArgs {
  /** job application: a client tool fills the form. calendar: proposed events wait for approval. coding: server edits stream into the open file. */
  example: "job application" | "calendar" | "coding";
  /** Job application: the chat docked beside the form, or inline in it. */
  layout: "panel" | "inline";
  /** Calendar and coding: break the stream mid-proposal / mid-edit. */
  fail: boolean;
}

function Example({ example, layout, fail }: ExampleArgs) {
  if (example === "job application") return <JobApplicationExample layout={layout} />;
  return example === "calendar" ? <CalendarExample fail={fail} /> : <CodingExample fail={fail} />;
}

/**
 * Agents changing the page through tools. Each example registers its tools from the page component
 * (`useChatTool`), shares page state (`useAgentContext`), and the chat stays generic (lib/agent-chat.tsx).
 * Click the suggestion in the chat to start.
 */
const meta = {
  title: "Examples/Agent tools", tags: ["!autodocs"],
  component: Example,
  parameters: { layout: "fullscreen" },
  argTypes: {
    example: { control: "inline-radio", options: ["job application", "calendar", "coding"] },
    layout: { control: "inline-radio", options: ["panel", "inline"], if: { arg: "example", eq: "job application" } },
    fail: { name: "Break the stream", if: { arg: "example", neq: "job application" } },
  },
  args: { example: "job application", layout: "panel", fail: false },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A client tool fills the form, a server tool reads the résumé, submitting asks first. */
export const JobApplication: Story = { name: "Job application" };

/** Proposed events draw as the model writes them, wait for approval, then the server creates them. */
export const Calendar: Story = {
  args: { example: "calendar" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Plan my launch prep this week" }));
    await expect(await canvas.findByText("Plan my launch prep this week", { selector: "p, div, span" })).toBeInTheDocument();
  },
};

/** Server-side edits stream into the open file as pending changes, then apply; tests run after. */
export const Coding: Story = { args: { example: "coding" } };
