import { ChatHeader, ChatTitleMenu, IconButton } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Share } from "lucide-react";
import { fn } from "storybook/test";

const titleMenu = (
  <ChatTitleMenu onPin={fn()} onRename={fn()} projects={[{ id: "p1", name: "website" }]} onAddToProject={fn()} onShare={fn()} onDelete={fn()} />
);

const shareButton = (
  <IconButton label="Share" onPress={fn()}>
    <Share />
  </IconButton>
);

/** The title bar over a chat, with a title menu and actions. */
const meta = {
  title: "Components/ChatHeader",
  component: ChatHeader,
  subcomponents: { ChatTitleMenu },
  parameters: { layout: "fullscreen" },
  argTypes: {
    menu: { control: false },
    leading: { control: false },
    actions: { control: false },
  },
  args: { title: "Speeding up CI", menu: titleMenu, actions: shareButton },
} satisfies Meta<typeof ChatHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The title with its "…" menu and a Share button. */
export const Default: Story = {};

/** Without a menu the title is plain text. */
export const PlainTitle: Story = { args: { menu: undefined, actions: undefined } };
