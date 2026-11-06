import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatView, htmlComponent, ToolViewsProvider, UiComponentsProvider, userMessage, type UiStateStore } from "agentic-ui-kit";
import type { Message } from "agentic-ui-kit/core";
import { useMemo, useState } from "react";
import { laptopCompare, weekendPlan, type VisualScript } from "../examples/visual-replies";
import { useReplay } from "../lib/replay";
import { visualViews } from "../lib/visual-views";
import { uiComponents } from "../lib/ui-components";
import { replyEvents } from "../lib/visual-reply";

const meta: Meta = { title: "Inline visuals/Replies", parameters: { layout: "fullscreen" } };
export default meta;

// What the host registers: its components, plus the sandboxed-HTML escape hatch.
const components = [...uiComponents, htmlComponent];

// Widget state survives a remount of the story (a real app would keep it with the message).
const saved = new Map<string, Record<string, unknown>>();
const persist: UiStateStore = { load: (id) => saved.get(id), save: (id, state) => void saved.set(id, state) };

/** Streams any script through the kit's reducer and draws it with the kit's views. Knows no widget. */
function ScriptedChat({ script }: { script: VisualScript }) {
  const [ask] = useState(() => userMessage(script.ask, null));
  const events = useMemo(() => replyEvents(script.steps, { parentId: ask.id }), [script, ask.id]);
  const reply = useReplay(events, { eventsPerSecond: 90, loop: false });
  const [extra, setExtra] = useState<Message[]>([]);
  const onSend = (text: string) => {
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

/**
 * One reply that mixes everything: host components (metrics, tabs with local state, a checklist, buttons that
 * send, set or copy), a sandboxed HTML map between them, and prose around them, all streamed.
 */
export const Combined: StoryObj = { render: () => <ScriptedChat script={weekendPlan} /> };

/** Host components only (render_ui): tabs switch in place; one button asks the model. */
export const HostComponents: StoryObj = { render: () => <ScriptedChat script={laptopCompare} /> };
