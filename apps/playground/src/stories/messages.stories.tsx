import type { Meta, StoryObj } from "@storybook/react-vite";
import { reduceEvents, type Message, type StreamEvent } from "agentic-ui-kit/core";
import { agentRun, fullThinkingRun, mathRun, researchRun } from "@agentic-ui-kit/core/fixtures";
import { AssistantMessage, MarkdownLinksProvider, UserMessage, type AssistantMessageProps } from "agentic-ui-kit";
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

const jobsReply: Message = {
  id: "msg_jobs",
  parentId: "msg_u1",
  role: "assistant",
  status: "done",
  createdAt: "2026-11-04T18:00:05Z",
  parts: [
    {
      type: "text",
      id: "t",
      status: "done",
      text: "Three roles match, with the **salary** at about $120k ($E = mc^2$ is not a job):\n\n- [Staff engineer, Berlin](https://jobs.example/jobs/7)\n- [Product designer, Remote](https://jobs.example/jobs/9)\n- [Data analyst, Lisbon](https://jobs.example/jobs/12)\n\nSee also [the careers page](https://jobs.example).",
    },
  ],
};

/** `MarkdownLinksProvider renderLinkList`: a list in which every item is a link is drawn as cards. Other lists and lone links stay as they are. */
export const LinkListAsCards: Story = {
  args: { message: jobsReply, question: "Any jobs for me?" },
  decorators: [
    (Story) => (
      <MarkdownLinksProvider
        renderLinkList={({ links }) => (
          <div className="grid gap-2">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="rounded-chat-md border border-chat-border p-3 font-chat-sans text-sm hover:bg-chat-surface">
                {l.children}
              </a>
            ))}
          </div>
        )}
      >
        <Story />
      </MarkdownLinksProvider>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Staff engineer, Berlin" })).toBeVisible();
    await expect(canvas.queryByRole("list")).toBeNull();
  },
};

const imageReply: Message = {
  id: "msg_img",
  parentId: "msg_u1",
  role: "assistant",
  status: "done",
  createdAt: "2026-11-04T18:00:05Z",
  parts: [
    {
      type: "text",
      id: "t_img",
      status: "done",
      text: "Here is the chart: ![Sales by month](https://images.example/chart.png)\n\nAnd one with no alt text: ![](https://tracker.example/pixel?d=profile)",
    },
  ],
};

/** The default: a remote image in a reply is not loaded. It shows as a link (alt text, or the host name) that only loads when the reader opens it. */
export const ImagesAsLinks: Story = {
  args: { message: imageReply, question: "Show me the chart." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Sales by month" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "tracker.example" })).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

/** `MarkdownLinksProvider imageOrigins`: images from the listed origins load; any other stays a link. */
export const ImagesFromAllowedOrigins: Story = {
  args: { message: imageReply, question: "Show me the chart." },
  decorators: [
    (Story) => (
      <MarkdownLinksProvider imageOrigins={["https://images.example"]}>
        <Story />
      </MarkdownLinksProvider>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(1);
    await expect(canvas.getByRole("link", { name: "tracker.example" })).toBeVisible();
  },
};

/** `MarkdownLinksProvider renderImage`: the host draws every image, here as a captioned placeholder with no request. */
export const ImagesDrawnByTheHost: Story = {
  args: { message: imageReply, question: "Show me the chart." },
  decorators: [
    (Story) => (
      <MarkdownLinksProvider
        renderImage={({ alt }) => (
          <span className="inline-block rounded-chat-md border border-chat-border px-2 py-1 font-chat-sans text-sm">Image: {alt || "untitled"}</span>
        )}
      >
        <Story />
      </MarkdownLinksProvider>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Image: Sales by month")).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

/** Web searches, then the answer. */
export const WebResearch: Story = { args: { message: finished(researchRun), question: questions.research } };

/** Thinking, commands and searches. */
export const AgentRun: Story = { args: { message: finished(agentRun), question: questions.agent } };

/** Long reasoning before the answer. */
export const LongThinking: Story = { args: { message: finished(fullThinkingRun), question: questions.thinking } };

/** Hidden reasoning that finished with only a title: a plain line, not an expandable one with nothing inside. */
export const HiddenThinkingTitleOnly: Story = {
  args: {
    message: {
      id: "msg_h",
      parentId: "msg_u1",
      role: "assistant",
      status: "done",
      createdAt: "2026-11-04T18:00:05Z",
      parts: [
        { type: "thinking", id: "h_t", text: "", status: "done", visibility: "hidden", title: "Weighing the options" },
        { type: "text", id: "h_x", status: "done", text: "A 2 pm coffee is mostly gone by about 9 pm." },
      ],
    },
    question: questions.thinking,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Weighing the options")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /Weighing the options/ })).toBeNull();
  },
};

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
