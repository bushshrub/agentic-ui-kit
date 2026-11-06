import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatTranscript, ChatView, ToolViewsProvider, userMessage, type WidgetAllow } from "agentic-ui-kit";
import { parsePartialJson, visualizeTool, type Message, type Part } from "agentic-ui-kit/core";
import { useEffect, useState } from "react";
import { visualViews } from "../lib/visual-views";
import calendarHtml from "../widgets/calendar.html?raw";
import mapHtml from "../widgets/map.html?raw";
import workoutHtml from "../widgets/workout.html?raw";

const meta: Meta = { title: "Inline visuals/Sandboxed HTML", parameters: { layout: "fullscreen" } };
export default meta;

/**
 * Model-written HTML in a sandboxed frame, like claude.ai's visualize tool. Each widget below is what a model
 * would send as `widget_code` to the `show_widget` tool (the kit's visualize preset). Buttons inside call
 * sendPrompt(text), which posts a message as the user.
 */
interface Demo {
  ask: string;
  intro: string;
  html: string;
  title: string;
  loading: string[];
  allow?: WidgetAllow;
  outro?: string;
}

const demos = {
  map: {
    ask: "Plan a Saturday in Lisbon for me, on foot mostly.",
    intro: "Here's a walkable day from Belém to Alfama. Pick a stop to see it on the map.",
    html: mapHtml,
    title: "lisbon_saturday",
    loading: ["Plotting the route", "Finding the custard tarts", "Placing the stops"],
    // The map needs Leaflet and map tiles; everything else stays blocked.
    allow: { resourceDomains: ["https://unpkg.com", "https://tile.openstreetmap.org"] },
    outro: "The route is about 9 km. Take tram 15 from Belém to LX Factory if your feet complain.",
  },
  calendar: {
    ask: "Fit three gym sessions into next week around my meetings.",
    intro: "I've proposed three sessions (dashed). The Friday one clashes with your 1:1; click it to move it.",
    html: calendarHtml,
    title: "gym_week",
    loading: ["Reading your week", "Finding free slots"],
  },
  workout: {
    ask: "Build me a workout plan I can tweak, with a timer for the sessions.",
    intro: "Here's a plan you can adjust live. Start any day to run its interval timer.",
    html: workoutHtml,
    title: "workout_planner",
    loading: ["Picking exercises", "Balancing the week", "Winding up the timer"],
  },
} satisfies Record<string, Demo>;

/** The model's reply: a show_widget call whose input streams in, as the kit's reducer would build it. */
function assistant(parent: string, demo: Demo, html: string, streaming: boolean): Message {
  const input = { title: demo.title, loading_messages: demo.loading, widget_code: html };
  // While streaming, the raw JSON is cut mid-string, as it arrives from the model.
  const inputJson = streaming ? JSON.stringify(input).slice(0, -2) : JSON.stringify(input);
  const call: Part = streaming
    ? { type: "tool_call", id: "w", name: visualizeTool.name, status: "input", inputJson, partialInput: parsePartialJson(inputJson) }
    : { type: "tool_call", id: "w", name: visualizeTool.name, status: "done", inputJson, input, result: "shown" };
  const parts: Part[] = [{ type: "text", id: "intro", text: demo.intro, status: "done" }, call];
  if (!streaming && demo.outro) parts.push({ type: "text", id: "outro", text: demo.outro, status: "done" });
  return { id: "a1", parentId: parent, role: "assistant", status: streaming ? "streaming" : "done", createdAt: new Date().toISOString(), parts };
}

/** Streams the widget's markup in chunks, as the model would write it, unless `instant`. */
function VisualChat({ demo, instant = false, readOnly = false }: { demo: Demo; instant?: boolean; readOnly?: boolean }) {
  const [ask] = useState(() => userMessage(demo.ask, null));
  const [shown, setShown] = useState(instant ? demo.html.length : 0);
  const [extra, setExtra] = useState<Message[]>([]);
  useEffect(() => {
    if (instant) return;
    const id = setInterval(() => setShown((n) => (n >= demo.html.length ? (clearInterval(id), n) : n + 90)), 40);
    return () => clearInterval(id);
  }, [demo.html.length, instant]);
  const streaming = shown < demo.html.length;
  const messages = [ask, assistant(ask.id, demo, demo.html.slice(0, shown), streaming), ...extra];
  const prompt = (text: string) => {
    const u = userMessage(text, null);
    const reply: Message = {
      id: u.id + "-r", parentId: u.id, role: "assistant", status: "done", createdAt: new Date().toISOString(),
      parts: [{ type: "text", id: "t", status: "done", text: "_(Prototype: in the app this message goes to the model.)_" }],
    };
    setExtra((m) => [...m, u, reply]);
  };
  return (
    <div className="h-dvh">
      <ToolViewsProvider tools={visualViews}>
        <ChatView
          messages={messages}
          busy={streaming}
          onSend={prompt}
          widgets={{ ...(demo.allow && { allow: demo.allow }), ...(readOnly && { onPrompt: undefined }) }}
        />
      </ToolViewsProvider>
    </div>
  );
}

/** A day trip on a real map (Leaflet + OpenStreetMap tiles, the only domains this widget may load). Pick a stop, then ask. */
export const Map: StoryObj = { render: () => <VisualChat demo={demos.map} /> };

/** Proposed events in your week; click one to move it. "Add the 3 new events" sends a message. */
export const Calendar: StoryObj = { render: () => <VisualChat demo={demos.calendar} /> };

/** A live planner: change days, goal and minutes; tick exercises off; start a session's interval timer. */
export const WorkoutPlanner: StoryObj = { render: () => <VisualChat demo={demos.workout} /> };

/** The same planner, shown at once instead of streamed. */
export const WorkoutPlannerInstant: StoryObj = { render: () => <VisualChat demo={demos.workout} instant /> };

/**
 * A `widget` part (html sent as part deltas instead of a tool call) in a shared, read-only transcript: the
 * widget works, but "Add the 3 new events" does nothing, since a transcript passes no onPrompt.
 */
export const SharedTranscript: StoryObj = {
  render: () => {
    const ask = userMessage(demos.calendar.ask, null);
    const reply: Message = {
      id: "a1", parentId: ask.id, role: "assistant", status: "done", createdAt: new Date().toISOString(),
      parts: [
        { type: "text", id: "intro", text: demos.calendar.intro, status: "done" },
        { type: "widget", id: "w", title: demos.calendar.title, html: demos.calendar.html, status: "done" },
      ],
    };
    return (
      <div className="h-dvh">
        <ChatTranscript messages={[ask, reply]} />
      </div>
    );
  },
};

/** A small bell curve in one color, standing in for a model's widget. */
const curve = (stroke: string, note: string) => `<svg viewBox="0 0 320 120" width="100%" style="max-width:420px">
  <path d="M0 110 C 90 110 110 10 160 10 S 230 110 320 110" fill="none" stroke="${stroke}" stroke-width="3"/>
  <text x="0" y="12" fill="var(--chat-muted)" font-size="12">${note}</text>
</svg>`;

function draw(id: string, html: string, replaces?: string, status: "input" | "done" = "done"): Part {
  const input = { title: "normal_distribution", widget_code: html, ...(replaces && { replaces }) };
  const inputJson = JSON.stringify(input);
  return status === "done"
    ? { type: "tool_call", id, name: visualizeTool.name, status, inputJson, input, result: "Shown to the user." }
    : { type: "tool_call", id, name: visualizeTool.name, status, inputJson: inputJson.slice(0, -2), partialInput: parsePartialJson(inputJson.slice(0, -2)) };
}

/**
 * Updating a visual in place with `replaces`. Step 1: the model resends a fixed widget in the same reply;
 * the first stays (dimmed, "Updating…") until the fix is complete, then the fix takes its place. Step 3: the
 * user asks for a change in a later turn; the old widget folds into "Updated below ↓".
 */
export const UpdatedInPlace: StoryObj = {
  render: function Render() {
    const [step, setStep] = useState(0);
    const ask = userMessage("Interactive visualization of the normal distribution", null);
    const first: Part[] = [
      { type: "text", id: "t1", text: "Here is the standard normal curve.", status: "done" },
      draw("w1", curve("#3b82f6", "hard-coded color")),
      ...(step >= 1 ? [draw("w2", curve("var(--chat-accent)", "fixed: theme color"), "w1", step === 1 ? "input" : "done")] : []),
    ];
    const messages: Message[] = [
      ask,
      { id: "a1", parentId: ask.id, role: "assistant", status: "done", createdAt: new Date().toISOString(), parts: first },
    ];
    if (step >= 3) {
      const again = userMessage("Make the line thinner", "a1");
      messages.push(again, {
        id: "a2", parentId: again.id, role: "assistant", status: "done", createdAt: new Date().toISOString(),
        parts: [{ type: "text", id: "t2", text: "Done, the line is thinner now.", status: "done" }, draw("w3", curve("var(--chat-accent)", "thinner").replace(`stroke-width="3"`, `stroke-width="1.5"`), "w2")],
      });
    }
    const steps = ["Fix it in the same reply", "Finish the fix", "Ask for a change in a new turn", "Start over"];
    return (
      <div className="flex h-dvh flex-col">
        <button className="m-2 self-start rounded border border-chat-border px-2 py-1 text-sm text-chat-fg" onClick={() => setStep((step + 1) % 4)}>
          {steps[step]}
        </button>
        <ToolViewsProvider tools={visualViews}>
          <ChatTranscript messages={messages} />
        </ToolViewsProvider>
      </div>
    );
  },
};
