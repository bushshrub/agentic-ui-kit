import type { Meta, StoryObj } from "@storybook/react-vite";
import { reduceEvents, type Message, type StreamEvent } from "agentic-ui-kit/core";
import { agentRun, fullThinkingRun, mathRun, researchRun } from "@agentic-ui-kit/core/fixtures";
import { AssistantMessage, UserMessage, type AssistantMessageProps } from "agentic-ui-kit";
import { expect, fn } from "storybook/test";
import { useReplay } from "../lib/replay";

const questions = {
  math: "I had a 200 mg coffee at 2 pm. Caffeine has a half-life of about 5 hours, right? So when is it mostly out of my system, say under 50 mg? Show me the formula too.",
  research: "Which Python versions still get security fixes?",
  agent: "Can we make CI faster?",
  thinking: "When does a 2 pm coffee wear off?",
};

type TurnArgs = AssistantMessageProps & {
  /** The user's message shown above the reply. */
  question: string;
  /** Replay speed while streaming. */
  eventsPerSecond?: number;
  onEdit?: () => void;
};

const finished = (events: StreamEvent[]) => reduceEvents(events)!;

const userMessage = (text: string): Message => ({
  id: "msg_u1",
  parentId: null,
  role: "user",
  status: "done",
  createdAt: "2026-11-04T18:00:00Z",
  parts: [{ type: "text", id: "u", text, status: "done" }],
});

function Turn({ question, eventsPerSecond: _speed, onEdit, ...reply }: TurnArgs) {
  return (
    <div className="mx-auto w-[48rem] space-y-6">
      <UserMessage message={userMessage(question)} onRetry={reply.onRetry} onEdit={onEdit} />
      <AssistantMessage {...reply} />
    </div>
  );
}

/** The run replayed event by event: paced text, fading words, live token counter. */
function StreamingTurn({ question, eventsPerSecond, onEdit, message: _done, ...reply }: TurnArgs & { events: StreamEvent[] }) {
  const message = useReplay(reply.events, { eventsPerSecond });
  return (
    <div className="mx-auto w-[48rem] space-y-6">
      <UserMessage message={userMessage(question)} onRetry={reply.onRetry} onEdit={onEdit} />
      {message && <AssistantMessage {...reply} message={message} />}
    </div>
  );
}

/** A user turn and the reply. The buttons log to Actions. */
const meta = {
  title: "Components/Messages",
  component: AssistantMessage,
  subcomponents: { UserMessage },
  render: (args) => <Turn {...args} />,
  parameters: { layout: "padded" },
  argTypes: {
    message: { control: false },
    renderPart: { control: false },
    actions: { control: false },
    className: { control: false },
    question: { description: "The user's message shown above the reply.", table: { category: "Story" } },
    onEdit: { description: "The user message's Edit button.", table: { category: "Events" } },
  },
  args: { message: finished(mathRun), question: questions.math, onRetry: fn(), onEdit: fn(), onFeedback: fn(), onReadAloud: fn() },
} satisfies Meta<TurnArgs>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Markdown, KaTeX and code, with memory in the activity group. */
export const MarkdownAndMath: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Good response" }));
    await expect(args.onFeedback).toHaveBeenCalledWith("good");
    await userEvent.click(canvas.getAllByRole("button", { name: "Retry" }).at(-1)!);
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

/** Web searches, then the answer. */
export const WebResearch: Story = { args: { message: finished(researchRun), question: questions.research } };

/** Thinking, commands and searches. */
export const AgentRun: Story = { args: { message: finished(agentRun), question: questions.agent } };

/** Long reasoning before the answer. */
export const LongThinking: Story = { args: { message: finished(fullThinkingRun), question: questions.thinking } };

/** The agent run streaming: thinking, a reply, a command and a search, then the answer. */
export const Streaming: Story = {
  tags: ["!test"],
  render: (args) => <StreamingTurn {...args} events={agentRun} />,
  argTypes: {
    eventsPerSecond: {
      description: "Replay speed, in stream events per second.",
      control: { type: "range", min: 5, max: 120, step: 5 },
      table: { category: "Story" },
    },
  },
  args: { question: questions.agent, eventsPerSecond: 35 },
};
