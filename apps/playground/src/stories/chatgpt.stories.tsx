import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AppShell,
  AttachButton,
  Menu,
  MenuItem,
  Button,
  ChatHeader,
  ChatList,
  ChatTheme,
  ChatView,
  EffortButton,
  EmptyState,
  IconButton,
  Sidebar,
  SidebarItem,
  SidebarToggle,
  SidebarUser,
  useChat,
  type ChatListSection,
} from "agentic-ui-kit";
import type { EffortLevel, Message } from "agentic-ui-kit/core";
import { Ellipsis, Share, BookImage, Brain, GitBranch, Globe, Paperclip, PenTool, Telescope, TrendingUp, Atom, ChevronDown, CircleDashed, Clock, Compass, Images, Library, Mic, Plus, Puzzle, Search, SquarePen, Sparkle } from "lucide-react";
import { useMemo, useState } from "react";
import { expect, fn } from "storybook/test";
import { history } from "../lib/demo-chat";
import { fixtureTransport } from "../lib/fixture-transport";

const sections: ChatListSection[] = [
  { id: "projects", title: "Projects", items: [{ type: "project", id: "auger", name: "Auger", chats: [] }] },
  {
    id: "recents",
    title: "Recents",
    items: [
      { id: "ci", title: "Speeding up CI" },
      { id: "midterm", title: "Explain midterm results" },
      { id: "dram", title: "DRAM allocation economics" },
      { id: "caffeinate", title: "Keep Mac awake with caffeinate" },
      { id: "parametric", title: "Solve parametric equations" },
    ],
  },
];

/** chatgpt.com's `+`: a ringed circle opening a wide menu, each tool's description beside its name. */
const tools = [
  { id: "files", icon: <Paperclip />, label: "Add photos & files", description: "Upload from computer" },
  { id: "library", icon: <BookImage />, label: "Add from library", description: "Browse and search your files" },
  { id: "image", icon: <Images />, label: "Create image", description: "Visualize anything" },
  { id: "web", icon: <Globe />, label: "Web search", description: "Find real-time news and info" },
  { id: "research", icon: <Telescope />, label: "Deep research", description: "Get a detailed report" },
  { id: "sketch", icon: <PenTool />, label: "Sketch", description: "Draw and attach an image" },
  { id: "thinking", icon: <Brain />, label: "Thinking", description: "For detailed answers" },
  { id: "equity", icon: <TrendingUp />, label: "Public Equity Investing", description: "Public equity research" },
  { id: "github", icon: <GitBranch />, label: "GitHub", description: "Triage PRs, issues, CI, and publish flows" },
];

const plusMenu = (
  <AttachButton
    label="Add files and more"
    icon={<Plus />}
    className="rounded-full! border border-chat-border-strong"
    menuClassName="w-[min(48rem,calc(100vw-2rem))] max-h-80 overflow-y-auto"
  >
    <Menu aria-label="Add">
      {tools.map((t) => (
        <MenuItem key={t.id} id={t.id} icon={t.icon} description={t.description} descriptionPlacement="beside">
          {t.label}
        </MenuItem>
      ))}
    </Menu>
  </AttachButton>
);

/** Thinking levels, lowest first: the slider's stops. */
const thinking: EffortLevel[] = [
  { id: "instant", label: "Instant", description: "Answers right away, without thinking" },
  { id: "medium", label: "Medium", description: "Thinks briefly; the everyday default" },
  { id: "high", label: "High", description: "Thinks longer for harder questions" },
  { id: "xhigh", label: "Extra High", description: "Thinks the longest, for the hardest problems", warning: "Slower" },
];

interface Handlers {
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onSend: (text: string) => void;
  onThinkingChange: (level: string) => void;
}

function Chat({ start, onSend, onThinkingChange }: Pick<Handlers, "onSend" | "onThinkingChange"> & { start: Message[] }) {
  const transport = useMemo(() => fixtureTransport(), []);
  const chat = useChat({ transport, initialMessages: start });
  const [think, setThink] = useState("instant");
  return (
    <ChatView
      messages={chat.messages}
      busy={chat.busy}
      onSend={(text) => (onSend(text), chat.send(text))}
      onStop={chat.stop}
      onRetry={(id) => chat.retry(id)}
      onFeedback={() => {}}
      onReadAloud={() => {}}
      messageActions={{
        time: false,
        extra: (m) =>
          m.role === "assistant" && (
            <>
              <IconButton label="Share" size="sm">
                <Share />
              </IconButton>
              <IconButton label="More actions" size="sm">
                <Ellipsis />
              </IconButton>
            </>
          ),
      }}
      header={
        <ChatHeader
          leading={
            <>
              <SidebarToggle drawerOnly />
              <Button variant="ghost" className="text-lg">
                ChatGPT <ChevronDown className="size-4 text-chat-subtle" />
              </Button>
            </>
          }
          title=""
          actions={
            <>
              <Button variant="subtle" size="sm" className="rounded-full! bg-[#5b5bd6]/20! px-3 text-[#8f8ff5]!">
                <Sparkle className="size-3.5 fill-current" /> Upgrade to Go
              </Button>
              <IconButton label="Temporary chat">
                <CircleDashed />
              </IconButton>
            </>
          }
        />
      }
      composer={{
        variant: "compact",
        placeholder: chat.messages.length ? "Ask ChatGPT" : "Ask anything",
        leading: plusMenu,
        trailing: (
          <>
            <EffortButton efforts={thinking} value={think} onChange={(level) => (onThinkingChange(level), setThink(level))} icon={<Atom className="size-4" />}>
              {think === "instant" ? "Think" : thinking.find((t) => t.id === think)?.label}
            </EffortButton>
            <IconButton label="Dictate">
              <Mic />
            </IconButton>
          </>
        ),
      }}
      emptyState={(composer) => <EmptyState greeting="What are you working on?">{composer}</EmptyState>}
      disclaimer="ChatGPT can make mistakes. Check important info."
    />
  );
}

const chatIds = ["new", "ci", "midterm", "dram", "caffeinate", "parametric"] as const;

interface AppArgs extends Handlers {
  /** chatgpt: dark. chatgpt-light: white page, black send button. */
  theme: "chatgpt" | "chatgpt-light";
  /** The open chat; "new" is the empty chat. */
  chat: (typeof chatIds)[number];
  /** Start with the sidebar folded to its icon rail. */
  collapsed: boolean;
}

function App({ theme, chat, collapsed, onNewChat, onSelectChat, ...handlers }: AppArgs) {
  const [active, setActive] = useState<string | undefined>(chat === "new" ? undefined : chat);
  return (
    <ChatTheme theme={theme} className="h-dvh">
      <AppShell
        defaultCollapsed={collapsed}
        sidebar={
          <Sidebar
            brand={<span className="font-semibold">ChatGPT</span>}
            headerActions={
              <IconButton label="Search chats">
                <Search />
              </IconButton>
            }
            nav={
              <>
                <SidebarItem icon={<SquarePen />} label="New chat" active={!active} onPress={() => (onNewChat(), setActive(undefined))} />
                <SidebarItem icon={<Images />} label="Images" />
                <SidebarItem icon={<Clock />} label="Scheduled" />
                <SidebarItem icon={<Library />} label="Library" />
                <SidebarItem icon={<Puzzle />} label="Plugins" />
                <SidebarItem icon={<Compass />} label="Explore" />
              </>
            }
            footer={<SidebarUser name="Alex" detail="Free" />}
          >
            <ChatList sections={sections} {...(active && { activeId: active })} onSelect={(id) => (onSelectChat(id), setActive(id))} />
          </Sidebar>
        }
      >
        <Chat key={active ?? "new"} start={active ? history : []} {...handlers} />
      </AppShell>
    </ChatTheme>
  );
}

/** chatgpt.com built from the kit: its sidebar items, a pill composer with Think and dictation, the model-free header. Theme, chat and sidebar are Controls. */
const meta = {
  title: "Examples/ChatGPT", tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  // Keyed so the controls apply again when changed.
  render: (args) => <App key={`${args.chat}-${args.collapsed}`} {...args} />,
  argTypes: {
    theme: { control: "inline-radio", options: ["chatgpt", "chatgpt-light"] },
    chat: { control: "select", options: chatIds },
  },
  args: { theme: "chatgpt", chat: "new", collapsed: false, onNewChat: fn(), onSelectChat: fn(), onSend: fn(), onThinkingChange: fn() },
} satisfies Meta<AppArgs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Dark: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox"), "Why is my build slow?{Enter}");
    await expect(args.onSend).toHaveBeenCalledWith("Why is my build slow?");
    await expect(await canvas.findByText("Why is my build slow?")).toBeVisible();
    await userEvent.click(canvas.getByText("DRAM allocation economics"));
    await expect(args.onSelectChat).toHaveBeenCalledWith("dram");
  },
};

/** The light theme: white page, black send button. */
export const Light: Story = { args: { theme: "chatgpt-light" } };

/** A conversation in progress: the pill composer docks under the messages. */
export const Conversation: Story = { args: { chat: "ci" } };
