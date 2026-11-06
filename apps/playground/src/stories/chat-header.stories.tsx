import { ChatHeader, ChatTitleMenu, IconButton } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Share } from "lucide-react";
import { fn } from "storybook/test";

interface HeaderArgs {
  title: string;
  /** Shows the chat's "…" menu next to the title. */
  menu: boolean;
  /** Shows a Share button on the right. */
  share: boolean;
  onPin: () => void;
  onRename: () => void;
  onAddToProject: (projectId: string) => void;
  onShare: () => void;
  onDelete: () => void;
}

function Header({ title, menu, share, onPin, onRename, onAddToProject, onShare, onDelete }: HeaderArgs) {
  return (
    <ChatHeader
      title={title}
      menu={
        menu ? (
          <ChatTitleMenu onPin={onPin} onRename={onRename} projects={[{ id: "p1", name: "website" }]} onAddToProject={onAddToProject} onShare={onShare} onDelete={onDelete} />
        ) : undefined
      }
      actions={
        share ? (
          <IconButton label="Share" onPress={onShare}>
            <Share />
          </IconButton>
        ) : undefined
      }
    />
  );
}

/** The title bar over a chat, with a title menu and actions. */
const meta = {
  title: "Components/ChatHeader",
  component: Header,
  subcomponents: { ChatHeader, ChatTitleMenu },
  parameters: { layout: "fullscreen" },
  args: { title: "Speeding up CI", menu: true, share: true, onPin: fn(), onRename: fn(), onAddToProject: fn(), onShare: fn(), onDelete: fn() },
} satisfies Meta<typeof Header>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
