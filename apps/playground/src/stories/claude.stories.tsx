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
import { expect, fn } from "storybook/test";
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

interface Handlers {
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onSend: (text: string) => void;
  onShare: () => void;
  onModelChange: (model: string) => void;
}

function Chat({ start, title, model: initialModel, onSend, onShare, onModelChange }: Pick<Handlers, "onSend" | "onShare" | "onModelChange"> & { start: Message[]; title: string; model: string }) {
  const transport = useMemo(() => fixtureTransport(), []);
  const chat = useChat({ transport, initialMessages: start });
  const [model, setModel] = useState(initialModel);
  const [effort, setEffort] = useState("low");
  return (
    <ChatView
      messages={chat.messages}
      busy={chat.busy}
      onSend={(text) => (onSend(text), chat.send(text, { model, effort }))}
      onStop={chat.stop}
      onRetry={(id) => chat.retry(id, { model, effort })}
      onFeedback={() => {}}
      header={
        <ChatHeader
          leading={<SidebarToggle drawerOnly />}
          title={chat.messages.length ? title : ""}
          {...(chat.messages.length > 0 && { menu: <ChatTitleMenu onPin={() => {}} onRename={() => {}} onShare={onShare} onDelete={() => {}} /> })}
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
            <ModelPicker models={models} model={model} onModelChange={(id) => (onModelChange(id), setModel(id))} effort={effort} onEffortChange={setEffort} />
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

const chatIds = ["new", "power", "ci", "midterm", "midpoint", "graphs", "mcp", "router"] as const;
const titles = new Map(sections.flatMap((s) => s.items.flatMap((i) => ("type" in i ? i.chats : [i]))).map((c) => [c.id, c.title]));

interface AppArgs extends Handlers {
  /** The open chat; "new" is the empty chat. */
  chat: (typeof chatIds)[number];
  /** The model the picker starts on. */
  model: string;
  /** Start with the sidebar folded to its icon rail. */
  collapsed: boolean;
}

function App({ chat, model, collapsed, onNewChat, onSelectChat, ...handlers }: AppArgs) {
  const [active, setActive] = useState<string | undefined>(chat === "new" ? undefined : chat);
  return (
    <AppShell
      defaultCollapsed={collapsed}
      sidebar={
        <Sidebar
          brand="Claude"
          headerActions={<AppSwitch />}
          nav={
            <>
              <SidebarItem icon={<Plus />} label="New" active={!active} onPress={() => (onNewChat(), setActive(undefined))} />
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
            onSelect={(id) => (onSelectChat(id), setActive(id))}
            rowMenu={() => <ChatTitleMenu onPin={() => {}} onRename={() => {}} onShare={() => {}} onDelete={() => {}} />}
          />
        </Sidebar>
      }
    >
      <Chat key={active ?? "new"} start={active ? history : []} title={titles.get(active ?? "") ?? "Speeding up CI"} model={model} {...handlers} />
    </AppShell>
  );
}

const ev = (description: string) => ({ description, table: { category: "Events" } });
const hidden = { table: { disable: true } };

/** claude.ai built from the kit: sidebar with pinned projects, Chat / Cowork, model and effort. What a host would handle logs to Actions. */
const meta = {
  title: "Examples/Claude", tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  // Keyed so the controls apply again when changed.
  render: (args) => <App key={`${args.chat}-${args.model}-${args.collapsed}`} {...args} />,
  argTypes: {
    chat: hidden,
    collapsed: hidden,
    model: { description: "The model the picker starts on.", control: "inline-radio", options: models.map((m) => m.id), table: { category: "Story" } },
    onNewChat: ev("Called when the user starts a new chat from the sidebar."),
    onSelectChat: ev("Called with the chat id when the user picks a chat in the list."),
    onSend: ev("Called with the text when the user sends a message."),
    onShare: ev("Called when the user presses Share."),
    onModelChange: ev("Called with the model id when the user picks another model."),
  },
  args: { chat: "new", model: "opus", collapsed: false, onNewChat: fn(), onSelectChat: fn(), onSend: fn(), onShare: fn(), onModelChange: fn() },
} satisfies Meta<AppArgs>;
export default meta;
type Story = StoryObj<typeof meta>;

/** On its default theme, the empty chat. */
export const NewChat: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox"), "Explain the midpoint formula{Enter}");
    await expect(args.onSend).toHaveBeenCalledWith("Explain the midpoint formula");
    await expect(await canvas.findByText("Explain the midpoint formula")).toBeVisible();
    await userEvent.click(canvas.getByText("Graph algorithms in Python"));
    await expect(args.onSelectChat).toHaveBeenCalledWith("graphs");
  },
};

/** A conversation in a project. */
export const Conversation: Story = { args: { chat: "midpoint" } };

/** The sidebar folded to its icon rail. */
export const Collapsed: Story = { args: { collapsed: true } };
