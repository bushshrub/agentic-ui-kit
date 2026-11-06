import type { Message } from "agentic-ui-kit/core";
import { ChatTheme, ChatView } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { AgentChat } from "../lib/agent-chat";
import { scriptedAgent } from "../lib/scripted-agent";

const questions = [
  { question: "Which database should the app use?", kind: "single", options: ["Postgres", "SQLite", "MySQL"] },
  { question: "Which features do you need on day one?", kind: "multiple", options: ["Sign in", "Search", "Billing", "Admin dashboard"] },
  { question: "Rank what matters most", kind: "rank", options: ["Fast to ship", "Cheap to run", "Easy to change"] },
];

/** The ask_user call runs in the page (`runsOn: "client"`): the scripted backend ends the run awaiting, then reads the result. */
const transport = () =>
  scriptedAgent(async function* ({ last, text, thinking, call }) {
    if (!last) {
      yield* thinking("Planning the storage", "The right choice depends on a few things I don't know yet. Better to ask than guess.");
      yield* text("Before I set this up, a few questions:");
      yield* call("ask_user", { questions }, { runsOn: "client", chunk: 24 });
    } else if (last.status === "error") {
      yield* text("No problem. I'll start with SQLite and keep it easy to swap later.");
    } else {
      yield* text("Thanks, that settles it. I'll scaffold the project with your answers.");
    }
  });

/**
 * A chat where the model asks questions. The prompt appears over the composer, the composer says "Or reply
 * directly…", and once answered the questions and answers stay in the message. Start with the suggestion.
 */
const meta = {
  title: "Examples/Ask user",
  component: ChatView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <ChatTheme>
        <div className="h-screen">
          <Story />
        </div>
      </ChatTheme>
    ),
  ],
  args: { messages: [], onSend: () => {} },
  tags: ["!autodocs"],
} satisfies Meta<typeof ChatView>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Answer the questions with the keyboard, or type a reply to decline them. */
export const Conversation: Story = {
  render: () => <AgentChat transport={transport} title="Project setup" density="full" suggestions={["Set up storage for my app"]} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Set up storage for my app" }));
    await canvas.findByRole("dialog", { name: "Question for you" }, { timeout: 10000 });
    await userEvent.keyboard("2"); // SQLite
    await userEvent.keyboard("13{Enter}"); // Sign in, Billing
    await userEvent.keyboard("{Enter}"); // keep the ranking
    await waitFor(() => expect(canvas.getByRole("log").textContent).toContain("scaffold the project"), { timeout: 10000 });
    await expect(canvas.getByLabelText("Your answers")).toBeInTheDocument();
  },
};

const asked = (result: unknown, status: "done" | "error" = "done"): Message[] => [
  { id: "u1", parentId: null, role: "user", status: "done", createdAt: "2026-11-05T09:00:00Z", parts: [{ type: "text", id: "ut", text: "Set up storage for my app", status: "done" }] },
  {
    id: "a1",
    parentId: "u1",
    role: "assistant",
    status: "done",
    createdAt: "2026-11-05T09:00:05Z",
    parts: [
      { type: "text", id: "t1", text: "Before I set this up, a few questions:", status: "done" },
      { type: "tool_call", id: "c1", name: "ask_user", status, inputJson: "", input: { questions }, runsOn: "client", ...(status === "done" ? { result } : { error: "Declined by the user" }) },
      { type: "text", id: "t2", text: "Thanks, that settles it.", status: "done" },
    ],
  },
];

/** The answers card kept in the message: each question with the answer, "Ranked: 1. …", or "Skipped". */
export const Answered: Story = {
  args: {
    messages: asked({
        answers: [
          { question: questions[0]!.question, kind: "single", answer: "SQLite" },
          { question: questions[1]!.question, kind: "multiple", answer: ["Sign in", "Search"] },
          { question: questions[2]!.question, kind: "rank", answer: ["Easy to change", "Fast to ship", "Cheap to run"] },
        ],
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Ranked: 1. Easy to change 2. Fast to ship 3. Cheap to run")).toBeInTheDocument();
  },
};

/** The user closed the questions or replied instead. */
export const Declined: Story = {
  args: { messages: asked(undefined, "error") },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("You declined to answer")).toBeInTheDocument();
  },
};
