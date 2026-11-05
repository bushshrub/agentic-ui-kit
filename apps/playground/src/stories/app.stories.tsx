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

function App() {
  const [active, setActive] = useState<string | undefined>("ci");
  return (
    <AppShell
      sidebar={
        <Sidebar
          brand="Chat"
          nav={
            <>
              <SidebarItem icon={<MessageSquarePlus />} label="New chat" active={!active} onPress={() => setActive(undefined)} />
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
            onSelect={setActive}
            rowMenu={() => <ChatTitleMenu onPin={() => {}} onRename={() => {}} onShare={() => {}} onDelete={() => {}} />}
          />
        </Sidebar>
      }
    >
      <DemoChat key={active ?? "new"} start={active ? history : []} title={titles.get(active ?? "") ?? "New chat"} />
    </AppShell>
  );
}

const meta: Meta = { title: "Views/App", parameters: { layout: "fullscreen" } };
export default meta;

/** Sidebar, chat list and chat together. Collapse the sidebar from its top button; on phones it becomes a drawer. */
export const Full: StoryObj = { render: () => <App /> };

export const Phone: StoryObj = { render: () => <App />, globals: { viewport: { value: "phonePortrait" } } };

export const Tablet: StoryObj = { render: () => <App />, globals: { viewport: { value: "tabletPortrait" } } };
