import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatView, htmlComponent, ToolViewsProvider, UiComponentsProvider, userMessage, type UiStateStore, UiTree } from "agentic-ui-kit";
import type { Message } from "agentic-ui-kit/core";
import { useMemo, useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { laptopCompare, skiPacking, skiPackingTool, weekendPlan, type VisualScript } from "../examples/visual-replies";
import { useReplay } from "../lib/replay";
import { visualViews } from "../lib/visual-views";
import { uiComponents } from "../lib/ui-components";
import { replyEvents } from "../lib/visual-reply";

// What the host registers: its components, plus the sandboxed-HTML escape hatch.
const components = [...uiComponents, htmlComponent];

// Widget state survives a remount of the story (a real app would keep it with the message).
const saved = new Map<string, Record<string, unknown>>();
const persist: UiStateStore = { load: (id) => saved.get(id), save: (id, state) => void saved.set(id, state) };

const scripts = { weekendPlan, laptopCompare, skiPackingTool, skiPacking } satisfies Record<string, VisualScript>;

interface ScriptedArgs {
  /**
   * weekendPlan: everything mixed. laptopCompare: host components only (render_ui). skiPackingTool: JSX from the
   * `show_ui` tool. skiPacking: JSX in a ```ui block of the reply.
   */
  script: keyof typeof scripts;
  /** A message posted as the user: the composer, or a button in the reply that sends (sendPrompt). */
  onSend: (text: string) => void;
}

/** Streams any script through the kit's reducer and draws it with the kit's views. Knows no widget. */
function ScriptedChat({ script: name, onSend: send }: ScriptedArgs) {
  const script: VisualScript = scripts[name];
  const [ask] = useState(() => userMessage(script.ask, null));
  const events = useMemo(() => replyEvents(script.steps, { parentId: ask.id }), [script, ask.id]);
  const reply = useReplay(events, { eventsPerSecond: 90, loop: false });
  const [extra, setExtra] = useState<Message[]>([]);
  const onSend = (text: string) => {
    send(text);
    const u = userMessage(text, null);
    const stub: Message = {
      id: u.id + "-r", parentId: u.id, role: "assistant", status: "done", createdAt: new Date().toISOString(),
      parts: [{ type: "text", id: "t", status: "done", text: "_(Scripted story: in the app this message goes to the model.)_" }],
    };
    setExtra((m) => [...m, u, stub]);
  };
  const messages = [ask, ...(reply ? [reply] : []), ...extra];
  return (
    <div className="h-dvh">
      <UiComponentsProvider components={components} persist={persist}>
        <ToolViewsProvider tools={visualViews}>
          <ChatView messages={messages} busy={reply?.status === "streaming"} onSend={onSend} {...(script.allow && { widgets: { allow: script.allow } })} />
        </ToolViewsProvider>
      </UiComponentsProvider>
    </div>
  );
}

/** A scripted reply streamed through the kit's reducer and drawn with the kit's views. Each story plays one script. */
const meta = {
  title: "Inline visuals/Replies",
  component: ScriptedChat,
  subcomponents: { ChatView, UiTree },
  parameters: { layout: "fullscreen" },
  argTypes: {
    script: { table: { disable: true } },
    onSend: { description: "Called with the text when the user sends a message: the composer, or a button in the reply that calls sendPrompt.", table: { category: "Events" } },
  },
  args: { script: "weekendPlan", onSend: fn() },
} satisfies Meta<typeof ScriptedChat>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One reply that mixes everything: host components (metrics, tabs with local state, a checklist, buttons that
 * send, set or copy), a sandboxed HTML map between them, and prose around them, all streamed.
 */
export const Combined: Story = {
  play: async ({ args, canvas, userEvent }) => {
    // Sending waits for the reply to finish streaming.
    await waitFor(() => expect(canvas.queryByRole("button", { name: /stop/i })).toBeNull(), { timeout: 15000 });
    await userEvent.type(canvas.getByRole("textbox"), "Make it cheaper{Enter}");
    await expect(args.onSend).toHaveBeenCalledWith("Make it cheaper");
  },
};

/** Host components only (render_ui): tabs switch in place; one button asks the model. */
export const HostComponents: Story = { args: { script: "laptopCompare" } };

/** UI from the suggested `show_ui` tool: JSX markup in a tool call, drawn element by element as it streams. */
export const MarkupTool: Story = { args: { script: "skiPackingTool" } };

/**
 * UI written as JSX in a ```ui block of the reply (see `uiMarkupGuide`), streamed after the model's thinking.
 * No tool call: the block draws element by element as the text arrives.
 */
export const MarkupInReply: Story = { args: { script: "skiPacking" } };
