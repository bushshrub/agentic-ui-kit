import type { ToolCallPart } from "agentic-ui-kit/core";
import { AskUserPrompt, ChatTheme } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

const call = (questions: unknown[]): ToolCallPart => ({
  type: "tool_call",
  id: "ask1",
  name: "ask_user",
  status: "awaiting",
  runsOn: "client",
  inputJson: "",
  input: { questions },
});

const database = { question: "Which database should the app use?", kind: "single", options: ["Postgres", "SQLite", "MySQL"] };
const features = { question: "Which features do you need on day one?", kind: "multiple", options: ["Sign in", "Search", "Billing", "Admin dashboard"] };
const priorities = { question: "Rank what matters most", kind: "rank", options: ["Fast to ship", "Cheap to run", "Easy to change", "Pleasant to use"] };

/**
 * The model's questions, shown over the composer while the `ask_user` tool call waits for the user (the
 * tool view's `Prompt`). `onSubmit` gets the tool result, `{ answers }`; the close button and Escape call
 * `onDecline`. Use the number keys, arrows and Enter.
 */
const meta = {
  title: "Components/AskUserPrompt",
  component: AskUserPrompt,
  decorators: [
    (Story) => (
      <ChatTheme>
        <div className="w-[40rem] max-w-full p-6">
          <Story />
        </div>
      </ChatTheme>
    ),
  ],
  argTypes: {
    part: { description: "The awaiting `ask_user` call; `input.questions` holds the questions.", control: "object" },
    onSubmit: { description: "The answers, as the tool call's result.", table: { category: "Events" } },
    onDecline: { description: "The user closed the prompt (close button or Escape).", table: { category: "Events" } },
  },
  args: { part: call([database]), onSubmit: fn(), onDecline: fn() },
} satisfies Meta<typeof AskUserPrompt>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Pick one: numbered rows, a number key picks and moves on. Here it was the last question, so it submits. */
export const SingleChoice: Story = {
  play: async ({ args, userEvent }) => {
    await userEvent.keyboard("2");
    await expect(args.onSubmit).toHaveBeenCalledWith({ answers: [{ question: database.question, kind: "single", answer: "SQLite" }] });
  },
};

/** Pick any number: checkboxes, a count, and an arrow to go on (Enter does too). */
export const MultipleChoice: Story = {
  args: { part: call([features]) },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.keyboard("13");
    await expect(canvas.getByText("2 selected")).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith({ answers: [{ question: features.question, kind: "multiple", answer: ["Sign in", "Billing"] }] });
  },
};

/** Put the options in order: drag the handles, or Alt with the arrow keys. */
export const Rank: Story = {
  args: { part: call([priorities]) },
  play: async ({ args, userEvent }) => {
    await userEvent.keyboard("{ArrowDown}{Alt>}{ArrowUp}{/Alt}{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith({
      answers: [{ question: priorities.question, kind: "rank", answer: ["Cheap to run", "Fast to ship", "Easy to change", "Pleasant to use"] }],
    });
  },
};

/** Several questions: a pager ("1 of 3") to go back, and Skip to leave one out. */
export const SeveralQuestions: Story = {
  args: { part: call([database, features, priorities]) },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("1 of 3")).toBeInTheDocument();
    await userEvent.keyboard("1");
    await expect(canvas.getByText("2 of 3")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Skip" }));
    await userEvent.keyboard("{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith({
      answers: [
        { question: database.question, kind: "single", answer: "Postgres" },
        { question: features.question, kind: "multiple", skipped: true },
        { question: priorities.question, kind: "rank", answer: priorities.options },
      ],
    });
  },
};

/** Escape or the close button declines all the questions. */
export const Decline: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Close and decline" }));
    await expect(args.onDecline).toHaveBeenCalled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
