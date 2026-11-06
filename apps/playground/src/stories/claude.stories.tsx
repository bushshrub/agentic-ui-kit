import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AppShell,
  AttachButton,
  ChatHeader,
  ChatList,
  ChatTitleMenu,
  ChatView,
  EmptyState,
  IconButton,
  Menu,
  SegmentedControl,
  MenuItem,
  MenuSeparator,
  ModelPicker,
  Sidebar,
  SidebarItem,
  SidebarToggle,
  SidebarUser,
  useChat,
  type ChatListSection,
} from "agentic-ui-kit";
import type { Message, ModelInfo } from "agentic-ui-kit/core";
import { AudioLines, Camera, Clock, Code, FolderClosed, Ghost, Globe, MessagesSquare, Mic, Paperclip, Plus, Search, Shapes, SlidersHorizontal, Telescope } from "lucide-react";
import { useMemo, useState } from "react";
import { efforts, history } from "../lib/demo-chat";
import { fixtureTransport } from "../lib/fixture-transport";

const models: ModelInfo[] = [
  { id: "opus", label: "Opus 5.5", description: "Most capable for ambitious work", efforts, defaultEffort: "low" },
  { id: "sonnet", label: "Sonnet 5.5", description: "Smart, efficient model for everyday use", efforts, defaultEffort: "low" },
  { id: "haiku", label: "Haiku 5.5", description: "Fastest for quick answers", secondary: true },
];

const sections: ChatListSection[] = [
  {
    id: "pinned",
    title: "Pinned",
    items: [
      { type: "project", id: "lina", name: "LINA01 Professor", chats: [] },
      { type: "project", id: "asl", name: "ASL Webcam Transcriber", chats: [] },
      {
        type: "project",
        id: "stab",
        name: "stab57",
        defaultExpanded: true,
        chats: [
          { id: "power", title: "Power of a normal mean test" },
          { id: "ci", title: "Confidence interval for variance" },
          { id: "midterm", title: "Midterm exam review: MLE and formula sheet" },
          { id: "midpoint", title: "Using midpoint formula" },
        ],
      },
      { type: "project", id: "resume", name: "Resume Improver", chats: [] },
    ],
  },
  {
    id: "recents",
    title: "Chats and tasks",
    action: (
      <IconButton label="Filter chats" size="sm" className="size-6 [&_svg]:size-3.5">
        <SlidersHorizontal />
      </IconButton>
    ),
    items: [
      { id: "graphs", title: "Graph algorithms in Python" },
      { id: "mcp", title: "Visualize MCP server tool schema" },
      { id: "router", title: "TP-Link router no Wi-Fi after reset" },
    ],
    onViewAll: () => {},
  },
];

/** claude.ai's Chat / Cowork switch, in the composer's toolbar. */
function ModeSwitch() {
  const [mode, setMode] = useState<"chat" | "cowork">("chat");
  return (
    <SegmentedControl
      label="Mode"
      value={mode}
      onChange={setMode}
      options={[
        { id: "chat", label: "Chat" },
        { id: "cowork", label: "Cowork" },
      ]}
    />
  );
}

/** The sidebar's Chat / Code switch. */
function AppSwitch() {
  const [app, setApp] = useState<"chat" | "code">("chat");
  return (
    <SegmentedControl
      label="App"
      value={app}
      onChange={setApp}
      options={[
        { id: "chat", label: "Chat", icon: <MessagesSquare />, iconOnly: true },
        { id: "code", label: "Code", icon: <Code />, iconOnly: true },
      ]}
    />
  );
}

const plusMenu = (
  <AttachButton>
    <Menu aria-label="Add">
      <MenuItem id="upload" icon={<Paperclip />}>
        Add files or photos
      </MenuItem>
      <MenuItem id="screenshot" icon={<Camera />}>
        Take a screenshot
      </MenuItem>
      <MenuItem id="project" icon={<FolderClosed />}>
        Add to project
      </MenuItem>
      <MenuSeparator />
      <MenuItem id="research" icon={<Telescope />}>
        Research
      </MenuItem>
      <MenuItem id="web" icon={<Globe />}>
        Web search
      </MenuItem>
    </Menu>
  </AttachButton>
);

function Chat({ start, title }: { start: Message[]; title: string }) {
  const transport = useMemo(() => fixtureTransport(), []);
  const chat = useChat({ transport, initialMessages: start });
  const [model, setModel] = useState(models[0]!.id);
  const [effort, setEffort] = useState("low");
  return (
    <ChatView
      messages={chat.messages}
      busy={chat.busy}
      onSend={(text) => chat.send(text, { model, effort })}
      onStop={chat.stop}
      onRetry={(id) => chat.retry(id, { model, effort })}
      onFeedback={() => {}}
      header={
        <ChatHeader
          leading={<SidebarToggle drawerOnly />}
          title={chat.messages.length ? title : ""}
          {...(chat.messages.length > 0 && { menu: <ChatTitleMenu onPin={() => {}} onRename={() => {}} onShare={() => {}} onDelete={() => {}} /> })}
          actions={
            <IconButton label="Incognito chat">
              <Ghost />
            </IconButton>
          }
        />
      }
      composer={{
        placeholder: chat.messages.length ? "Reply to Claude…" : "How can I help you today?",
        leading: (
          <>
            {plusMenu}
            <ModeSwitch />
          </>
        ),
        trailing: (
          <>
            <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />
            <IconButton label="Dictate">
              <Mic />
            </IconButton>
            <IconButton label="Voice mode">
              <AudioLines />
            </IconButton>
          </>
        ),
      }}
      emptyState={(composer) => (
        <EmptyState greeting="Evening, Alex" icon={<ClaudeSpark />}>
          {composer}
        </EmptyState>
      )}
      disclaimer="Claude can make mistakes. Please double-check responses."
    />
  );
}

/** A stand-in for claude.ai's spark: twelve rays. */
function ClaudeSpark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="11.1" y="1.5" width="1.8" height="9.5" rx="0.9" transform={`rotate(${i * 30} 12 12)`} />
      ))}
    </svg>
  );
}

const titles: Record<string, string> = { midpoint: "Using midpoint formula", graphs: "Graph algorithms in Python" };

function App({ open }: { open?: string }) {
  const [active, setActive] = useState<string | undefined>(open);
  return (
    <AppShell
      sidebar={
        <Sidebar
          brand="Claude"
          headerActions={<AppSwitch />}
          nav={
            <>
              <SidebarItem icon={<Plus />} label="New" active={!active} onPress={() => setActive(undefined)} />
              <SidebarItem icon={<Search />} label="Search" />
              <SidebarItem icon={<FolderClosed />} label="Projects" />
              <SidebarItem icon={<Shapes />} label="Artifacts" />
              <SidebarItem icon={<Clock />} label="Scheduled" />
              <SidebarItem icon={<SlidersHorizontal />} label="Customize" />
            </>
          }
          footer={<SidebarUser name="Alex" detail="Pro" />}
        >
          <ChatList
            sections={sections}
            {...(active && { activeId: active })}
            onSelect={setActive}
            rowMenu={() => <ChatTitleMenu onPin={() => {}} onRename={() => {}} onShare={() => {}} onDelete={() => {}} />}
          />
        </Sidebar>
      }
    >
      <Chat key={active ?? "new"} start={active ? history : []} title={(active && titles[active]) ?? "Speeding up CI"} />
    </AppShell>
  );
}

const meta: Meta = { title: "Examples/Claude", parameters: { layout: "fullscreen" } };
export default meta;

/** claude.ai built from the kit, on its default theme: sidebar with pinned projects, Chat / Cowork, model and effort. */
export const NewChat: StoryObj = { render: () => <App /> };

/** A conversation in a project. */
export const Conversation: StoryObj = { render: () => <App open="midpoint" /> };
