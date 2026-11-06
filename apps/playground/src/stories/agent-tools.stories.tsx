import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { CalendarExample } from "../examples/calendar";
import { CodingExample } from "../examples/coding";
import { JobApplicationExample } from "../examples/job-application";

interface ExampleArgs {
  example: "job application" | "calendar" | "coding";
  layout: "panel" | "inline";
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
    example: { table: { disable: true } },
    layout: { table: { disable: true } },
    fail: {
      name: "Break the stream",
      description: "Break the stream mid-proposal (calendar) or mid-edit (coding).",
      table: { category: "Story" },
      if: { arg: "example", neq: "job application" },
    },
  },
  args: { example: "job application", layout: "panel", fail: false },
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A client tool fills the form, a server tool reads the résumé, submitting asks first. */
export const JobApplication: Story = { name: "Job application" };

/** The same job application with the chat inline in the form instead of docked beside it. */
export const JobApplicationInline: Story = { name: "Job application, inline chat", args: { layout: "inline" } };

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
