import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContextMenu, Menu, MenuItem, MenuSeparator } from "agentic-ui-kit";
import { Copy, GitBranch, RefreshCw, Trash2 } from "lucide-react";
import type { ComponentProps } from "react";
import type { Key } from "react-aria-components";
import { expect, fn, within } from "storybook/test";

type Args = ComponentProps<typeof ContextMenu> & {
  onAction: (key: Key) => void;
};

/** Right-click (or the Menu key / Shift+F10 when focused) anywhere in the box. */
const meta = {
  title: "Primitives/ContextMenu",
  component: ContextMenu,
  args: { onAction: fn(), menu: null, children: null },
  argTypes: {
    menu: { control: false, description: "The `Menu` to open. The story supplies a message-actions menu." },
    children: { control: false, description: "The area that opens the menu on right-click. The story supplies a dashed box." },
    onAction: { description: "Called with the key of the chosen item (set on the `Menu`, not on ContextMenu).", table: { category: "Events" } },
  },
  parameters: { controls: { include: ["menu", "children", "onAction"] } },
  render: ({ onAction, ...args }) => (
    <ContextMenu
      {...args}
      menu={
        <Menu aria-label="Message actions" className="min-w-44" onAction={(key) => onAction(key)}>
          <MenuItem id="copy" icon={<Copy />}>
            Copy
          </MenuItem>
          <MenuItem id="branch" icon={<GitBranch />}>
            Branch from here
          </MenuItem>
          <MenuItem id="retry" icon={<RefreshCw />}>
            Retry
          </MenuItem>
          <MenuSeparator />
          <MenuItem id="delete" icon={<Trash2 />} tone="danger">
            Delete
          </MenuItem>
        </Menu>
      }
    >
      <div tabIndex={0} className="flex h-40 w-96 items-center justify-center rounded-chat-md border border-dashed border-chat-border-strong text-sm text-chat-muted outline-none focus-visible:ring-2 focus-visible:ring-chat-focus">
        Right-click here
      </div>
    </ContextMenu>
  ),
} satisfies Meta<Args>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Right-clicking the box opens the menu; choosing an item reports its key. */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.pointer({ keys: "[MouseRight]", target: canvas.getByText("Right-click here") });
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: /Branch from here/ }));
    await expect(args.onAction).toHaveBeenCalledWith("branch");
  },
};
