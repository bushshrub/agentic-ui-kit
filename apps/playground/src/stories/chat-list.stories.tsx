import { AppShell, ChatList, ChatListRailButton, ChatTitleMenu, Sidebar, type ChatListSection } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { expect, fn, within } from "storybook/test";

const sections: ChatListSection[] = [
  { id: "pinned", title: "Pinned", items: [{ id: "ci", title: "Speeding up CI" }] },
  {
    id: "recent",
    title: "Recents",
    items: [
      { type: "project", id: "p", name: "website", chats: [{ id: "ui", title: "Landing page redesign", running: true }] },
      { id: "caffeine", title: "When does coffee wear off?", unread: true },
      { id: "light", title: "A short history of lighthouses" },
    ],
  },
];

/** Sections of chats and projects with running and unread markers. */
const meta = {
  title: "Components/ChatList",
  component: ChatList,
  decorators: [(Story) => <div className="w-72"><Story /></div>],
  // Clicking a row moves the highlight.
  render: (args) => {
    const [, updateArgs] = useArgs();
    return <ChatList {...args} onSelect={(id) => (args.onSelect?.(id), updateArgs({ activeId: id }))} />;
  },
  argTypes: {
    activeId: { control: "select", options: ["ci", "ui", "caffeine", "light"] },
    sections: { control: false },
    rowMenu: { control: false },
  },
  args: { sections, activeId: "ci", onSelect: fn() },
} satisfies Meta<typeof ChatList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("A short history of lighthouses"));
    await expect(args.onSelect).toHaveBeenCalledWith("light");
  },
};

/** A "…" button on each row opens a menu for that chat. */
export const RowMenu: Story = {
  args: { rowMenu: () => <ChatTitleMenu onPin={fn()} onRename={fn()} onShare={fn()} onDelete={fn()} /> },
};

/** `detail` is quiet text at the right of a row, e.g. a relative time. `muted` dims a row, e.g. a channel with notifications off. */
export const DetailAndMuted: Story = {
  args: {
    sections: [
      {
        id: "chan",
        title: "Channels",
        items: [
          { id: "ci", title: "Speeding up CI", detail: "2h" },
          { id: "off", title: "random (off)", detail: "3d", muted: true, unread: true },
          { id: "light", title: "A short history of lighthouses", detail: "1w" },
        ],
      },
    ],
  },
};

/**
 * On the collapsed sidebar rail the list is hidden. `ChatListRailButton` goes in `Sidebar`'s `railActions`
 * and opens the same list in a popover; picking a chat closes it.
 */
export const OnCollapsedRail: Story = {
  decorators: [(Story) => <div className="h-[24rem] w-auto"><Story /></div>],
  render: (args) => (
    <AppShell
      collapsed
      sidebar={<Sidebar brand="Acme" railActions={<ChatListRailButton sections={args.sections} activeId={args.activeId} onSelect={args.onSelect} />}>{null}</Sidebar>}
    >
      <div className="p-4 text-chat-muted">Click the chats icon on the rail.</div>
    </AppShell>
  ),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Chats" }));
    await userEvent.click(await within(document.body).findByText("A short history of lighthouses"));
    await expect(args.onSelect).toHaveBeenCalledWith("light");
  },
};
