import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AppShell,
  Button,
  ChatHeader,
  ChatList,
  ChatTheme,
  ChatView,
  EmptyState,
  IconButton,
  Sidebar,
  SidebarItem,
  SidebarToggle,
  SidebarUser,
  useChat,
  type ChatListSection,
} from "agentic-ui-kit";
import type { Message } from "agentic-ui-kit/core";
import { Atom, ChevronDown, CircleDashed, Clock, Compass, Images, Library, Mic, Plus, Puzzle, Search, SquarePen, Sparkle } from "lucide-react";
import { useMemo, useState } from "react";
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

function Chat({ start }: { start: Message[] }) {
  const transport = useMemo(() => fixtureTransport(), []);
  const chat = useChat({ transport, initialMessages: start });
  const [think, setThink] = useState(false);
  return (
    <ChatView
      messages={chat.messages}
      busy={chat.busy}
      onSend={(text) => chat.send(text)}
      onStop={chat.stop}
      onRetry={(id) => chat.retry(id)}
      onFeedback={() => {}}
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
        leading: (
          <IconButton label="Add files and more">
            <Plus />
          </IconButton>
        ),
        trailing: (
          <>
            <Button variant="ghost" size="sm" className={think ? "text-chat-accent" : "text-chat-muted"} onPress={() => setThink(!think)} aria-pressed={think}>
              <Atom className="size-4" /> Think
            </Button>
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

function App({ theme, open }: { theme: string; open?: string }) {
  const [active, setActive] = useState<string | undefined>(open);
  return (
    <ChatTheme theme={theme} className="h-dvh">
      <AppShell
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
                <SidebarItem icon={<SquarePen />} label="New chat" active={!active} onPress={() => setActive(undefined)} />
                <SidebarItem icon={<Images />} label="Images" />
                <SidebarItem icon={<Clock />} label="Scheduled" />
                <SidebarItem icon={<Library />} label="Library" />
                <SidebarItem icon={<Puzzle />} label="Plugins" />
                <SidebarItem icon={<Compass />} label="Explore" />
              </>
            }
            footer={<SidebarUser name="Alex" detail="Free" />}
          >
            <ChatList sections={sections} {...(active && { activeId: active })} onSelect={setActive} />
          </Sidebar>
        }
      >
        <Chat key={active ?? "new"} start={active ? history : []} />
      </AppShell>
    </ChatTheme>
  );
}

const meta: Meta = { title: "Examples/ChatGPT", parameters: { layout: "fullscreen" } };
export default meta;

/** chatgpt.com built from the kit: its sidebar items, a pill composer with Think and dictation, the model-free header. */
export const Dark: StoryObj = { render: () => <App theme="chatgpt" /> };

/** The same, with the light theme: white page, black send button. */
export const Light: StoryObj = { render: () => <App theme="chatgpt-light" /> };

/** A conversation in progress: the pill composer docks under the messages. */
export const Conversation: StoryObj = { render: () => <App theme="chatgpt" open="ci" /> };
