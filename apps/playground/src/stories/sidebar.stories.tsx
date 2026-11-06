import { Menu, MenuItem, Sidebar, SidebarItem, SidebarList, SidebarUser, IconButton } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox, MessageSquarePlus, MoreHorizontal, Search, Settings } from "lucide-react";
import { expect, fn, within } from "storybook/test";

/** The sidebar frame: header, nav items, a scrolling middle and a user footer. Collapsing needs `AppShell`. */
const meta = {
  title: "Views/Sidebar",
  component: Sidebar,
  decorators: [(Story) => <div className="h-[28rem] w-72 border border-chat-divider bg-chat-sidebar"><Story /></div>],
  argTypes: {
    brandIcon: { control: false },
    headerActions: { control: false },
    railActions: { control: false },
    nav: { control: false },
    children: { control: false },
    footer: { control: false },
  },
  args: {
    brand: "Acme",
    nav: (
      <>
        <SidebarItem icon={<MessageSquarePlus />} label="New chat" active />
        <SidebarItem icon={<Search />} label="Search" shortcut="⌘K" />
      </>
    ),
    footer: <SidebarUser name="Ada Lovelace" detail="Pro plan" />,
  },
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `badge` always shows (an unread count); `description` is a second line; `shortcut` shows on hover. */
export const BadgeAndDescription: Story = {
  args: {
    nav: (
      <>
        <SidebarItem icon={<Inbox />} label="Inbox" badge={3} />
        <SidebarItem icon={<Search />} label="Search" description="Across all chats" shortcut="⌘K" />
      </>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("3")).toBeVisible();
    await expect(canvas.getByText("Across all chats")).toBeVisible();
  },
};

/** `trailing` holds row actions, shown on hover or focus. A long label gets a tooltip once it is cut off. */
export const TrailingActions: Story = {
  args: {
    nav: (
      <SidebarItem
        icon={<Settings />}
        label="A label that is much too long to fit this narrow sidebar"
        trailing={<IconButton label="More" size="sm" onPress={fn()}><MoreHorizontal /></IconButton>}
      />
    ),
  },
};

/** Icons are 1rem; set `--chat-sidebar-icon-size` (here 18px) to change them. */
export const IconSize: Story = {
  decorators: [(Story) => <div style={{ "--chat-sidebar-icon-size": "18px" } as React.CSSProperties}><Story /></div>],
};

/** `SidebarItem` is a list item: outside the `nav` slot, wrap it in `SidebarList` so no bullet shows. */
export const InsideChildren: Story = {
  args: {
    nav: undefined,
    children: (
      <SidebarList>
        <SidebarItem icon={<Inbox />} label="Inbox" badge={12} />
        <SidebarItem icon={<Search />} label="Search" />
      </SidebarList>
    ),
  },
};

/** `popoverProps` goes to the account menu's popover, e.g. `width: "trigger"` makes it as wide as the row. */
export const UserMenuMatchingWidth: Story = {
  args: {
    footer: (
      <SidebarUser
        name="Ada Lovelace"
        detail="Pro plan"
        popoverProps={{ width: "trigger" }}
        menu={
          <Menu aria-label="Account">
            <MenuItem>Settings</MenuItem>
            <MenuItem>Log out</MenuItem>
          </Menu>
        }
      />
    ),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Ada Lovelace/ }));
    await expect(await within(document.body).findByRole("menuitem", { name: "Log out" })).toBeTruthy();
  },
};
