import { ChatList, ChatTitleMenu, type ChatListSection } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { expect, fn } from "storybook/test";

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
