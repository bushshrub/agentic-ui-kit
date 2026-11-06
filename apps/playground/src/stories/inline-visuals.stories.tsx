import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatView, userMessage } from "agentic-ui-kit";
import type { Message, Part } from "agentic-ui-kit/core";
import { useEffect, useState } from "react";
import { WidgetFrame, type WidgetAllow } from "../lib/widget-frame";
import calendarHtml from "../widgets/calendar.html?raw";
import mapHtml from "../widgets/map.html?raw";
import workoutHtml from "../widgets/workout.html?raw";

const meta: Meta = { title: "Prototypes/Inline visuals", parameters: { layout: "fullscreen" } };
export default meta;

/**
 * Model-written HTML in a sandboxed frame, like claude.ai's visualize tool. Each widget below is what a model
 * would send as `widget_code`. Buttons inside call sendPrompt(text), which posts a message as the user.
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

function assistant(parent: string, demo: Demo, html: string, streaming: boolean): Message {
  const parts: Part[] = [
    { type: "text", id: "intro", text: demo.intro, status: "done" },
    { type: "widget", id: "w", title: demo.title, html, status: streaming ? "streaming" : "done" },
  ];
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
      <ChatView
        messages={messages}
        busy={streaming}
        onSend={prompt}
        renderPart={(part) =>
          part.type === "widget" ? (
            <WidgetFrame
              html={part.html ?? ""}
              streaming={part.status === "streaming"}
              title={part.title}
              loadingMessages={demo.loading}
              allow={demo.allow}
              {...(!readOnly && { onPrompt: prompt })}
            />
          ) : null
        }
      />
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
