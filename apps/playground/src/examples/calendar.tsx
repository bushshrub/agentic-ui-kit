import { AgentProvider, ChatTheme, Panel, useAgentContext, useChatTool } from "@llm-chat/react";
import { clsx } from "clsx";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { AgentChat } from "../lib/agent-chat";
import { scriptedAgent } from "../lib/scripted-agent";
import { useFlash } from "./flash";

/*
 * A calendar where the model proposes events. `propose_events` runs on the server and needs approval.
 * While the model writes the call, the page draws each event as soon as its day and time are in
 * (`onCall` + `partialInput`); while the user decides they stay as dashed proposals; on approval the
 * server creates them and they turn solid (`onResult`). A failed or declined call removes them.
 */

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const FIRST = 8;
const LAST = 18;

interface CalendarEvent {
  id: string;
  title: string;
  day: string;
  start: string;
  end: string;
}

const initial: CalendarEvent[] = [
  { id: "e1", title: "Team stand-up", day: "Mon", start: "09:30", end: "09:45" },
  { id: "e2", title: "1:1 with Mira", day: "Mon", start: "11:00", end: "11:30" },
  { id: "e3", title: "Sprint planning", day: "Tue", start: "10:00", end: "11:30" },
  { id: "e4", title: "Lunch with Sam", day: "Wed", start: "12:30", end: "13:30" },
  { id: "e5", title: "Customer call: Kestrel", day: "Thu", start: "10:00", end: "11:00" },
  { id: "e6", title: "Team stand-up", day: "Wed", start: "09:30", end: "09:45" },
  { id: "e7", title: "Demo day", day: "Fri", start: "15:00", end: "16:30" },
];

const proposal = {
  events: [
    { title: "Launch: write release notes", day: "Tue", start: "14:00", end: "15:30" },
    { title: "Launch: QA pass on staging", day: "Wed", start: "14:00", end: "16:00" },
    { title: "Launch: go / no-go", day: "Thu", start: "13:00", end: "13:30" },
    { title: "Launch: ship it", day: "Thu", start: "15:00", end: "16:00" },
  ],
};

const transport = (fail: boolean) => () =>
  scriptedAgent(async function* ({ last, text, thinking, call, finish }) {
    if (!last) {
      yield* thinking("Checking your week", "Launch is Friday. Release notes, a QA pass, a go / no-go and the release itself. I need the free afternoons first.");
      yield* call("find_free_time", { week: "2026-11-09", minMinutes: 30 }, {
        takes: 700,
        result: { free: [{ day: "Tue", from: "13:00", to: "17:00" }, { day: "Wed", from: "14:00", to: "17:00" }, { day: "Thu", from: "12:00", to: "17:00" }] },
      });
      yield* text("Tuesday to Thursday afternoons are open. Here's a plan for the launch:");
      yield* call("propose_events", proposal, { needsApproval: true, chunk: 5, delay: 30, ...(fail && { failAfter: 210 }) });
    } else if (last.name === "propose_events") {
      if (last.approval === "granted") {
        yield* finish(last, { created: proposal.events.length }, 900);
        yield* text("Added all four to your calendar. I'll move the go / no-go if the QA pass runs late.");
      } else yield* text("No changes made. Want a different split, e.g. everything on Thursday?");
    }
  });

const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const complete = (e: Partial<CalendarEvent>): e is Omit<CalendarEvent, "id"> =>
  days.includes(e.day as never) && /^\d\d:\d\d$/.test(e.start ?? "") && /^\d\d:\d\d$/.test(e.end ?? "");

type Ghost = Omit<CalendarEvent, "id"> & { writing: boolean };

function CalendarPage() {
  const [events, setEvents] = useState(initial);
  // Proposals per tool call, redrawn on every change of the call.
  const [ghosts, setGhosts] = useState<Record<string, { events: Ghost[]; awaiting: boolean }>>({});
  const [failure, setFailure] = useState<string>();
  const [free, setFree] = useState<{ day: string; from: string; to: string }[]>([]);
  const [flashing, flash] = useFlash(2200);

  useAgentContext("calendar", { week: "2026-11-09", events });

  useChatTool<{ week: string }, { free: { day: string; from: string; to: string }[] }>({
    name: "find_free_time",
    view: { label: (p) => (p.status === "done" ? "Found free time" : "Finding free time"), summary: () => "found free time" },
    onResult: (part) => {
      if (part.status !== "done" || !part.result) return;
      setFree(part.result.free);
      setTimeout(() => setFree([]), 2500);
    },
  });

  useChatTool<{ events: Partial<CalendarEvent>[] }, { created: number }>({
    name: "propose_events",
    view: {
      label: (p) => (p.status === "done" ? `Added ${(p.input as { events: unknown[] }).events.length} events` : p.status === "error" ? "Proposed events" : "Proposing events"),
      summary: () => "added events",
      ask: (p) => `Add ${((p.input as { events?: unknown[] })?.events ?? []).length} events to your calendar?`,
      Detail: ({ part }) => (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
          {(((part.input ?? part.partialInput) as { events?: Partial<CalendarEvent>[] })?.events ?? []).map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-24 shrink-0 text-chat-muted tabular-nums">
                {e.day} {e.start}
                {e.end && `–${e.end}`}
              </span>
              <span>{e.title}</span>
            </li>
          ))}
        </ul>
      ),
    },
    onCall: (part) => {
      const list = ((part.input ?? part.partialInput) as { events?: Partial<CalendarEvent>[] } | undefined)?.events ?? [];
      if (part.status === "error") {
        setGhosts(({ [part.id]: _, ...rest }) => rest);
        if (part.approval !== "denied") setFailure(part.error ?? "The proposal failed");
        return;
      }
      if (part.status === "done") return;
      setFailure(undefined);
      const streaming = part.status === "input";
      setGhosts((g) => ({
        ...g,
        [part.id]: {
          awaiting: part.status === "awaiting",
          // Draw an event once its day and times are in; the title fills in as it streams.
          events: list.filter(complete).map((e, i, all) => ({ ...e, title: e.title ?? "", writing: streaming && i === all.length - 1 })),
        },
      }));
    },
    onResult: (part) => {
      setGhosts(({ [part.id]: _, ...rest }) => rest);
      if (part.status !== "done") return;
      const added = part.input.events.filter(complete).map((e, i) => ({ ...e, id: `${part.id}_${i}` }));
      setEvents((list) => [...list, ...added]);
      flash(added.map((e) => e.id));
    },
  });

  const proposed = useMemo(() => Object.values(ghosts).flatMap((g) => g.events.map((e) => ({ ...e, awaiting: g.awaiting }))), [ghosts]);
  const hour = 48; // px per hour
  const place = (e: { start: string; end: string }) => ({
    top: ((minutes(e.start) - FIRST * 60) / 60) * hour,
    height: Math.max(((minutes(e.end) - minutes(e.start)) / 60) * hour - 2, 16),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-chat-border px-4 text-sm">
        <strong className="text-base font-medium">November 9 – 13, 2026</strong>
        {proposed.length > 0 && <span className="text-chat-muted">{proposed.length} proposed</span>}
        {failure && (
          <span role="status" className="ml-auto flex items-center gap-1.5 text-chat-danger">
            <AlertTriangle className="size-4" />
            Proposal failed: {failure}
          </span>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_repeat(5,1fr)]">
          <div />
          {days.map((d, i) => (
            <div key={d} className="sticky top-0 z-10 border-b border-l border-chat-border bg-chat-bg py-2 text-center text-xs text-chat-muted">
              {d} {9 + i}
            </div>
          ))}
          <div className="relative" style={{ height: (LAST - FIRST) * hour }}>
            {Array.from({ length: LAST - FIRST }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 text-[0.6875rem] text-chat-subtle tabular-nums" style={{ top: i * hour }}>
                {i > 0 && `${FIRST + i}:00`}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className="relative border-l border-chat-border" style={{ height: (LAST - FIRST) * hour, backgroundImage: `repeating-linear-gradient(to bottom, var(--chat-divider) 0 1px, transparent 1px ${hour}px)` }}>
              {free
                .filter((f) => f.day === d)
                .map((f) => (
                  <div key={f.from} className="absolute inset-x-0 animate-pulse bg-chat-check/10" style={place({ start: f.from, end: f.to })} />
                ))}
              {events
                .filter((e) => e.day === d)
                .map((e) => (
                  <div
                    key={e.id}
                    className={clsx(
                      "absolute inset-x-1 overflow-hidden rounded-chat-sm border-l-2 border-chat-accent bg-chat-hover px-1.5 py-0.5 text-xs transition-shadow duration-700",
                      flashing.has(e.id) && "shadow-[0_0_0_2px_var(--chat-accent)]",
                    )}
                    style={place(e)}
                  >
                    <div className="truncate font-medium">{e.title}</div>
                    <div className="text-chat-muted tabular-nums">{e.start}</div>
                  </div>
                ))}
              {proposed
                .filter((e) => e.day === d)
                .map((e, i) => (
                  <div
                    key={`${e.start}${i}`}
                    className={clsx("absolute inset-x-1 overflow-hidden rounded-chat-sm border border-dashed border-chat-accent bg-chat-bg/80 px-1.5 py-0.5 text-xs", e.writing && "chat-shimmer-surface")}
                    style={place(e)}
                  >
                    <div className="truncate font-medium text-chat-accent">{e.title || "…"}</div>
                    <div className="text-chat-muted tabular-nums">{e.awaiting ? "Proposed · waiting for you" : e.writing ? "Writing…" : e.start}</div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CalendarExample({ fail }: { fail: boolean }) {
  const make = useMemo(() => transport(fail), [fail]);
  return (
    <AgentProvider>
      <ChatTheme className="flex h-dvh">
        <CalendarPage />
        <Panel variant="flush" aria-label="Assistant" className="w-[24rem] shrink-0 border-l border-chat-border">
          <AgentChat key={String(fail)} transport={make} title="Calendar assistant" suggestions={["Plan my launch prep this week"]} />
        </Panel>
      </ChatTheme>
    </AgentProvider>
  );
}
