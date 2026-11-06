import type { Meta, StoryObj } from "@storybook/react-vite";
import { reduceEvents, type Message, type StreamEvent } from "agentic-ui-kit/core";
import { agentRun, fullThinkingRun, mathRun, researchRun } from "@agentic-ui-kit/core/fixtures";
import { AssistantMessage, UserMessage, type Feedback } from "agentic-ui-kit";
import { useMemo } from "react";
import { expect, fn } from "storybook/test";
import { useReplay } from "../lib/replay";

/** The recorded runs to pick from, each with the question that started it. */
const runs = {
  math: {
    question: "I had a 200 mg coffee at 2 pm. Caffeine has a half-life of about 5 hours, right? So when is it mostly out of my system, say under 50 mg? Show me the formula too.",
    events: mathRun,
  },
  research: { question: "Which Python versions still get security fixes?", events: researchRun },
  agent: { question: "Can we make CI faster?", events: agentRun },
  thinking: { question: "When does a 2 pm coffee wear off?", events: fullThinkingRun },
} satisfies Record<string, { question: string; events: StreamEvent[] }>;

interface TurnArgs {
  /** math: markdown, KaTeX and code. research: web searches. agent: thinking, commands, searches. thinking: long reasoning. */
  run: keyof typeof runs;
  /** Replay the run event by event (paced text, fading words, live token counter), or show it finished. */
  streaming: boolean;
  eventsPerSecond: number;
  onRetry: () => void;
  onEdit: () => void;
  onFeedback: (feedback: Feedback) => void;
  onReadAloud: () => void;
}

type ReplyActions = Pick<TurnArgs, "onRetry" | "onFeedback" | "onReadAloud">;

const userMessage = (text: string): Message => ({
  id: "msg_u1",
  parentId: null,
  role: "user",
  status: "done",
  createdAt: "2026-11-04T18:00:00Z",
  parts: [{ type: "text", id: "u", text, status: "done" }],
});

function Live({ events, eventsPerSecond, ...actions }: { events: StreamEvent[]; eventsPerSecond: number } & ReplyActions) {
  const message = useReplay(events, { eventsPerSecond });
  return message ? <AssistantMessage message={message} {...actions} /> : null;
}

function Turn({ run, streaming, eventsPerSecond, onEdit, ...actions }: TurnArgs) {
  const { question, events } = runs[run];
  const finished = useMemo(() => reduceEvents(events), [events]);
  return (
    <div className="mx-auto w-[48rem] space-y-6">
      <UserMessage message={userMessage(question)} onRetry={actions.onRetry} onEdit={onEdit} />
      {streaming ? (
        // Keyed so another run or speed restarts the replay.
        <Live key={`${run}-${eventsPerSecond}`} events={events} eventsPerSecond={eventsPerSecond} {...actions} />
      ) : (
        finished && <AssistantMessage message={finished} {...actions} />
      )}
    </div>
  );
}

/** A user turn and the reply. Pick the run and whether it streams in Controls; the buttons log to Actions. */
const meta = {
  title: "Components/Messages",
  component: Turn,
  subcomponents: { UserMessage, AssistantMessage },
  parameters: { layout: "padded" },
  argTypes: {
    run: { control: "inline-radio", options: Object.keys(runs) },
    eventsPerSecond: { control: { type: "range", min: 5, max: 120, step: 5 }, if: { arg: "streaming" } },
  },
  args: { run: "math", streaming: false, eventsPerSecond: 40, onRetry: fn(), onEdit: fn(), onFeedback: fn(), onReadAloud: fn() },
} satisfies Meta<typeof Turn>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Turns: Story = {
  name: "Message turn",
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Good response" }));
    await expect(args.onFeedback).toHaveBeenCalledWith("good");
    await userEvent.click(canvas.getAllByRole("button", { name: "Retry" }).at(-1)!);
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

/** The agent run streaming: thinking, a reply, a command and a search, then the answer. */
export const Streaming: Story = { args: { run: "agent", streaming: true, eventsPerSecond: 35 }, tags: ["!test"] };
