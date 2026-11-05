import type { Meta, StoryObj } from "@storybook/react-vite";
import { reduceEvents, type Message, type StreamEvent } from "@llm-chat/core";
import { agentRun, fullThinkingRun, mathRun, researchRun } from "@llm-chat/core/fixtures";
import { AssistantMessage, UserMessage } from "@llm-chat/react";
import { useReplay } from "../lib/replay";

const question =
  "I had a 200 mg coffee at 2 pm. Caffeine has a half-life of about 5 hours, right? So when is it mostly out of my system, say under 50 mg? Show me the formula too.";

const userMessage = (text: string, createdAt: string): Message => ({
  id: "msg_u1",
  parentId: null,
  role: "user",
  status: "done",
  createdAt,
  parts: [{ type: "text", id: "u", text, status: "done" }],
});

const noop = () => {};

function Turn({ text, assistant }: { text: string; assistant: Message | undefined }) {
  return (
    <div className="mx-auto w-[48rem] space-y-6">
      <UserMessage message={userMessage(text, "2026-11-04T18:00:00Z")} onRetry={noop} onEdit={noop} />
      {assistant && <AssistantMessage message={assistant} onRetry={noop} onFeedback={noop} onReadAloud={noop} />}
    </div>
  );
}

function LiveTurn({ text, events, eventsPerSecond = 40 }: { text: string; events: StreamEvent[]; eventsPerSecond?: number }) {
  return <Turn text={text} assistant={useReplay(events, { eventsPerSecond })} />;
}

const meta: Meta = { title: "Components/Messages", parameters: { layout: "padded" } };
export default meta;

/** The finished turn: math, lists and a highlighted code block. */
export const Finished: StoryObj = { render: () => <Turn text={question} assistant={reduceEvents(mathRun)} /> };

/** The same turn streaming: paced text, words fading in, live token counter. */
export const Streaming: StoryObj<typeof LiveTurn> = {
  render: (args) => <LiveTurn {...args} />,
  args: { text: question, events: mathRun, eventsPerSecond: 45 },
};

export const FullThinking: StoryObj<typeof LiveTurn> = {
  render: (args) => <LiveTurn {...args} />,
  args: { text: "When does a 2 pm coffee wear off?", events: fullThinkingRun, eventsPerSecond: 30 },
};

export const WithTools: StoryObj = {
  render: () => <Turn text="Which Python versions still get security fixes?" assistant={reduceEvents(researchRun)} />,
};

/** Thinking, a reply to the user, more thinking, a command and a search, more thinking, the final answer. */
export const AgentTurn: StoryObj<typeof LiveTurn> = {
  render: (args) => <LiveTurn {...args} />,
  args: { text: "Can we make CI faster?", events: agentRun, eventsPerSecond: 35 },
};

export const AgentTurnFinished: StoryObj = {
  render: () => <Turn text="Can we make CI faster?" assistant={reduceEvents(agentRun)} />,
};
