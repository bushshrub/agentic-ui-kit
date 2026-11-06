import { Badge, ChatHeader, ChatList, ChatTheme, IconButton, Panel, type ChatListSection } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Hash, Maximize2, X } from "lucide-react";
import { useState } from "react";
import { DemoChat, history } from "../lib/demo-chat";

/**
 * The kit inside each host, themed only through --chat-* (see src/themes.css). Each story is what that
 * app's page would look like with the chat dropped in.
 */
const meta: Meta = { title: "Examples/In host apps", parameters: { layout: "fullscreen" } };
export default meta;

const jobSections: ChatListSection[] = [
  {
    id: "recent",
    title: "Recent",
    items: [
      { id: "dock", title: "Merging the two chat views", running: true },
      { id: "form", title: "Invoice form helper" },
      { id: "plex", title: "Settings page layout pass", unread: true },
    ],
  },
];

/** Job board: warm light page, its own sidebar, the main chat, and the docked assistant panel on the right. */
function JobBoard() {
  const [active, setActive] = useState("dock");
  const [dock, setDock] = useState(true);
  return (
    <ChatTheme theme="warm" className="flex h-dvh">
      <aside className="flex w-60 shrink-0 flex-col gap-3 border-r border-chat-border bg-chat-sidebar p-3 max-md:hidden">
        <div className="px-2 pt-1 text-[15px] font-semibold">Jobs</div>
        <ChatList sections={jobSections} activeId={active} onSelect={setActive} />
      </aside>
      <main className="min-w-0 flex-1">
        <DemoChat start={history} title="Merging the two chat views" greeting="Morning, Alex" />
      </main>
      {dock && (
        <aside className="flex w-[26rem] shrink-0 flex-col border-l border-chat-border bg-chat-surface max-lg:hidden">
          <DemoChat
            start={[]}
            density="panel"
            title="Assistant"
            greeting="Ask about this page"
            header={
              <ChatHeader
                title="Assistant"
                actions={
                  <>
                    <IconButton label="Expand" size="sm">
                      <Maximize2 />
                    </IconButton>
                    <IconButton label="Close assistant" size="sm" onPress={() => setDock(false)}>
                      <X />
                    </IconButton>
                  </>
                }
              />
            }
          />
        </aside>
      )}
    </ChatTheme>
  );
}

/** The job board's inline form helper: a small chat inside a card in a form. */
function JobBoardInline() {
  return (
    <ChatTheme theme="warm" className="flex min-h-dvh justify-center p-8">
      <div className="flex w-full max-w-xl flex-col gap-4">
        <h2 className="m-0 text-lg font-semibold">New invoice</h2>
        <label className="flex flex-col gap-1 text-sm text-chat-muted">
          Customer
          <input className="h-9 rounded-chat-sm border border-chat-border bg-chat-surface px-3 text-chat-fg" defaultValue="Acme GmbH" />
        </label>
        <div className="h-96 overflow-hidden rounded-chat-md border border-chat-border bg-chat-surface">
          <DemoChat start={[]} density="inline" title="Form helper" header={null} disclaimer={null} />
        </div>
      </div>
    </ChatTheme>
  );
}

/** Console: a dark team-chat bot, sans message text, a channel header. */
function Console() {
  return (
    <ChatTheme theme="console" className="h-dvh">
      <DemoChat
        start={history}
        title="#general"
        greeting="What should the bot do?"
        header={
          <ChatHeader
            leading={<Hash aria-hidden className="ml-2 size-4 text-chat-muted" />}
            title="general"
            actions={<Badge tone="outline">3 online</Badge>}
          />
        }
        disclaimer="The bot answers in #general too."
      />
    </ChatTheme>
  );
}

type Layout = "grid" | "columns" | "rows";

const agents = [
  { name: "planner", task: "Plan the CI speed-up", prompt: "Why is CI slow?", speed: 40 },
  { name: "coder-1", task: "Cache the pnpm store", prompt: "Add a dependency cache to CI", speed: 25 },
  { name: "researcher", task: "Find prior benchmarks", prompt: "Find CI timing benchmarks", speed: 55 },
  { name: "reviewer", task: "Review coder-1's branch", prompt: "Review the CI cache change", speed: 18 },
];

/**
 * Agent dashboard: several agent sessions at once, each its own ChatView with its own transport, scroll and
 * stick-to-bottom. Panes size from their container, so they work side by side, stacked or in a grid.
 */
function Dashboard({ layout, dark, panes }: { layout: Layout; dark: boolean; panes: number }) {
  const grid = layout === "grid" ? "grid-cols-2 grid-rows-2" : layout === "columns" ? "grid-flow-col auto-cols-fr" : "grid-flow-row auto-rows-fr";
  return (
    <ChatTheme theme={dark ? "dashboard-dark" : "dashboard-light"} className="flex h-dvh flex-col gap-3 p-3">
      <div className="flex items-center gap-2 border-b border-chat-border pb-3 text-sm">
        <strong>Dashboard</strong>
        <span className="text-chat-muted">· Agents</span>
        <span className="ml-auto rounded-chat-sm border border-dashed border-chat-border px-2.5 py-1 text-chat-muted">connected</span>
      </div>
      <div className={`grid min-h-0 flex-1 gap-3 ${grid}`}>
        {agents.slice(0, panes).map((a) => (
          <Panel key={a.name} aria-label={a.name}>
            <DemoChat
              start={[]}
              density="panel"
              title={a.name}
              autoSend={a.prompt}
              eventsPerSecond={a.speed}
              disclaimer={null}
              header={<ChatHeader title={a.name} actions={<span className="truncate text-xs text-chat-muted">{a.task}</span>} />}
            />
          </Panel>
        ))}
      </div>
    </ChatTheme>
  );
}

export const JobBoardHost: StoryObj = { name: "Job board", render: () => <JobBoard /> };
export const JobBoardInlineHost: StoryObj = { name: "Job board inline", render: () => <JobBoardInline /> };
export const ConsoleDark: StoryObj = { name: "Console", render: () => <Console /> };

export const DashboardPanes: StoryObj<{ layout: Layout; dark: boolean; panes: number }> = {
  name: "Agent dashboard",
  args: { layout: "grid", dark: false, panes: 4 },
  argTypes: {
    layout: { control: "inline-radio", options: ["grid", "columns", "rows"] },
    panes: { control: { type: "range", min: 1, max: 4 } },
  },
  render: (args) => <Dashboard {...args} />,
};
