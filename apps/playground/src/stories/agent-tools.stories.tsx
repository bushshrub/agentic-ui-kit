import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarExample } from "../examples/calendar";
import { CodingExample } from "../examples/coding";
import { JobApplicationExample } from "../examples/job-application";

/**
 * Agents changing the page through tools. Each example registers its tools from the page component
 * (`useChatTool`), shares page state (`useAgentContext`), and the chat stays generic (lib/agent-chat.tsx).
 * Click the suggestion in the chat to start.
 */
const meta: Meta = { title: "Examples/Agent tools", parameters: { layout: "fullscreen" } };
export default meta;

/** A client tool fills the form, a server tool reads the résumé, submitting asks first. */
export const JobApplication: StoryObj<{ layout: "panel" | "inline" }> = {
  name: "Job application",
  args: { layout: "panel" },
  argTypes: { layout: { control: "inline-radio", options: ["panel", "inline"] } },
  render: (args) => <JobApplicationExample {...args} />,
};

/** Proposed events draw as the model writes them, wait for approval, then the server creates them. */
export const Calendar: StoryObj<{ fail: boolean }> = {
  args: { fail: false },
  argTypes: { fail: { name: "Break the stream mid-proposal" } },
  render: (args) => <CalendarExample {...args} />,
};

/** Server-side edits stream into the open file as pending changes, then apply; tests run after. */
export const Coding: StoryObj<{ fail: boolean }> = {
  args: { fail: false },
  argTypes: { fail: { name: "Break the stream mid-edit" } },
  render: (args) => <CodingExample {...args} />,
};
