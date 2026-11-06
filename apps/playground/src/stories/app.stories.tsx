import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AppShell,
  Badge,
  ChatList,
  ChatTitleMenu,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Sidebar,
  SidebarItem,
  SidebarUser,
  type ChatListSection,
} from "agentic-ui-kit";
import { FolderOpen, ListFilter, LogOut, MessageSquarePlus, Search, Settings } from "lucide-react";
import { useState } from "react";
import { expect, fn } from "storybook/test";
import { DemoChat, history } from "../lib/demo-chat";

const sections: ChatListSection[] = [
  {
    id: "pinned",
    title: "Pinned",
    items: [
      { id: "ci", title: "Speeding up CI" },
      { id: "wiki", title: "Self-hosting a team wiki" },
    ],
  },
  {
    id: "projects",
    title: "Projects",
    items: [
      {
        type: "project",
        id: "website",
        name: "website",
        chats: [
          { id: "redesign", title: "Landing page redesign", running: true },
          { id: "blog", title: "Blog RSS feed" },
        ],
      },
      { type: "project", id: "jobs", name: "job-board", chats: [{ id: "dock", title: "Merging the two chat views", unread: true }] },
    ],
  },
  {
    id: "recents",
    title: "Chats and tasks",
    badge: <Badge>10 new</Badge>,
    action: (
      <IconButton label="Filter chats" size="sm" className="size-6 [&_svg]:size-3.5">
        <ListFilter />
      </IconButton>
    ),
    items: [
      { id: "caffeine", title: "When does coffee wear off?", unread: true },
      { id: "lighthouse", title: "A short history of lighthouses" },
      { id: "python", title: "Python versions with security fixes" },
      { id: "fresnel", title: "How Fresnel lenses focus light" },
      { id: "shiki", title: "Shiki themes for dark mode" },
      { id: "katex", title: "KaTeX version mismatch" },
    ],
    onViewAll: () => {},
  },
];

const titles = new Map(sections.flatMap((s) => s.items.flatMap((i) => ("type" in i ? i.chats : [i]))).map((c) => [c.id, c.title]));

interface AppArgs {
  /** The open chat; "new" is the empty chat. */
  chat: "new" | "ci" | "wiki" | "redesign" | "blog" | "dock" | "caffeine" | "lighthouse" | "python";
  /** Start with the sidebar folded to its icon rail. */
  collapsed: boolean;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onSend: (text: string) => void;
  onShare: () => void;
  onFeedback: (messageId: string, feedback: "good" | "bad") => void;
  onModelChange: (model: string) => void;
}

function App({ chat, collapsed, onNewChat, onSelectChat, ...on }: AppArgs) {
  const [active, setActive] = useState<string | undefined>(chat === "new" ? undefined : chat);
  return (
    <AppShell
      defaultCollapsed={collapsed}
      sidebar={
        <Sidebar
          brand="Chat"
          nav={
            <>
              <SidebarItem icon={<MessageSquarePlus />} label="New chat" active={!active} onPress={() => (onNewChat(), setActive(undefined))} />
              <SidebarItem icon={<Search />} label="Search" shortcut="⌘K" />
              <SidebarItem icon={<FolderOpen />} label="Projects" />
            </>
          }
          footer={
            <SidebarUser
              name="Alex"
              detail="Pro plan"
              menu={
                <Menu aria-label="Account">
                  <MenuItem id="settings" icon={<Settings />}>
                    Settings
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem id="logout" icon={<LogOut />}>
                    Log out
                  </MenuItem>
                </Menu>
              }
            />
          }
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
      <DemoChat key={active ?? "new"} start={active ? history : []} title={titles.get(active ?? "") ?? "New chat"} on={on} />
    </AppShell>
  );
}

const ev = (description: string) => ({ description, table: { category: "Events" } });
const hidden = { table: { disable: true } };

/** Sidebar, chat list and chat together. Pick a chat in the sidebar; its actions log to Actions. */
const meta = {
  title: "Views/App", tags: ["!autodocs"],
  parameters: { layout: "fullscreen" },
  // Keyed so the controls apply again when changed.
  render: (args) => <App key={`${args.chat}-${args.collapsed}`} {...args} />,
  argTypes: {
    chat: hidden,
    collapsed: hidden,
    onNewChat: ev("Called when the user starts a new chat from the sidebar."),
    onSelectChat: ev("Called with the chat id when the user picks a chat in the list."),
    onSend: ev("Called with the text when the user sends a message."),
    onShare: ev("Called when the user presses Share."),
    onFeedback: ev("Called with the message id and \"good\" or \"bad\" when the user rates a reply."),
    onModelChange: ev("Called with the model id when the user picks another model."),
  },
  args: { chat: "ci", collapsed: false, onNewChat: fn(), onSelectChat: fn(), onSend: fn(), onShare: fn(), onFeedback: fn(), onModelChange: fn() },
} satisfies Meta<AppArgs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox"), "Thanks, and what about caching?{Enter}");
    await expect(await canvas.findByText("Thanks, and what about caching?")).toBeVisible();
    await userEvent.click(canvas.getByText("A short history of lighthouses"));
    await expect(args.onSelectChat).toHaveBeenCalledWith("lighthouse");
    await userEvent.click(canvas.getByRole("button", { name: /New chat/ }));
    await expect(args.onNewChat).toHaveBeenCalled();
  },
};

/** On phones the sidebar becomes a drawer. */
export const Phone: Story = { globals: { viewport: { value: "phonePortrait" } } };

/** A new chat: the greeting over the centered composer. */
export const NewChat: Story = { args: { chat: "new" } };

/** The sidebar folded to its icon rail. */
export const Collapsed: Story = { args: { collapsed: true } };
