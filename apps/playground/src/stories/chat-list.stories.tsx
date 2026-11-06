import { ChatList } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";

interface ListArgs {
  /** The highlighted chat. Clicking a row moves it. */
  activeId: string;
  onSelect: (chatId: string) => void;
}

function List({ activeId: initial, onSelect }: ListArgs) {
  const [activeId, setActiveId] = useState(initial);
  return (
    <div className="w-72">
      <ChatList
        activeId={activeId}
        onSelect={(id) => (setActiveId(id), onSelect(id))}
        sections={[
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
        ]}
      />
    </div>
  );
}

/** Sections of chats and projects with running and unread markers. */
const meta = {
  title: "Components/ChatList",
  component: List,
  subcomponents: { ChatList },
  argTypes: { activeId: { control: "select", options: ["ci", "ui", "caffeine", "light"] } },
  args: { activeId: "ci", onSelect: fn() },
} satisfies Meta<typeof List>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("A short history of lighthouses"));
    await expect(args.onSelect).toHaveBeenCalledWith("light");
  },
};
