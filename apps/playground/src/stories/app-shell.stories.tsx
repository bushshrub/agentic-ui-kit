import { AppShell, ChatList, Sidebar, SidebarItem, SidebarToggle, IconButton, type ChatListSection } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, FolderOpen, MessageSquarePlus, Search } from "lucide-react";
import { useArgs } from "storybook/preview-api";
import { expect, fn } from "storybook/test";

const sections: ChatListSection[] = [
  { id: "recent", title: "Recents", items: [{ id: "ci", title: "Speeding up CI" }, { id: "coffee", title: "When does coffee wear off?" }] },
];

const frame = (
  <Sidebar
    brand="Acme"
    headerActions={<IconButton label="Notifications"><Bell /></IconButton>}
    railActions={<IconButton label="Notifications"><Bell /></IconButton>}
    nav={
      <>
        <SidebarItem icon={<MessageSquarePlus />} label="New chat" active />
        <SidebarItem icon={<Search />} label="Search" shortcut="⌘K" />
        <SidebarItem icon={<FolderOpen />} label="Projects" />
      </>
    }
  >
    <ChatList sections={sections} activeId="ci" />
  </Sidebar>
);

const page = (
  <div className="flex items-center gap-2 border-b border-chat-divider p-3">
    <SidebarToggle drawerOnly />
    <span>Page</span>
  </div>
);

/** A page with a collapsible sidebar. Cmd+B (Ctrl+B off Apple platforms) toggles it. */
const meta = {
  title: "Views/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  argTypes: {
    sidebar: { control: false, description: "The sidebar, usually a `Sidebar`." },
    children: { control: false, description: "The page." },
    onCollapsedChange: { description: "Called when the user collapses or expands the pinned sidebar.", table: { category: "Events" } },
    onWidthChange: { description: "Called with the width in px when a drag ends or a key changes it.", table: { category: "Events" } },
  },
  args: { sidebar: frame, children: page, defaultCollapsed: false, onCollapsedChange: fn(), onWidthChange: fn() },
} satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("button", { name: /Collapse sidebar/ })[0]!);
    await expect(args.onCollapsedChange).toHaveBeenCalledWith(true);
  },
};

/** The sidebar as an icon rail; `railActions` shows under the toggle. */
export const Rail: Story = { args: { defaultCollapsed: true } };

/** The page scrolls the window; the sidebar sticks to the top. */
export const WindowScroll: Story = {
  args: {
    scroll: "window",
    children: (
      <>
        {page}
        <div className="space-y-4 p-6">{Array.from({ length: 40 }, (_, i) => <p key={i}>Line {i + 1}</p>)}</div>
      </>
    ),
  },
};

/** Drag the sidebar's edge, or focus it and use the arrow keys, Home and End. The width is kept under `persistKey`. */
export const Resizable: Story = {
  args: { resizable: { min: 220, max: 420 }, defaultWidth: 288 },
  play: async ({ args, canvas, userEvent }) => {
    const handle = canvas.getByRole("separator");
    handle.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onWidthChange).toHaveBeenCalledWith(304);
  },
};

/** The parent owns `collapsed`; here the page's own button flips it. */
export const ControlledCollapsed: Story = {
  args: { collapsed: false },
  render: (args) => {
    const [, updateArgs] = useArgs();
    return (
      <AppShell {...args} onCollapsedChange={(c) => (args.onCollapsedChange?.(c), updateArgs({ collapsed: c }))} />
    );
  },
};
