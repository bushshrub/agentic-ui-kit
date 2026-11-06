import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Badge,
  Button,
  IconButton,
  Menu,
  MenuItem,
  MenuNote,
  MenuSearch,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
  Popover,
  SubmenuTrigger,
} from "agentic-ui-kit";
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ExternalLink,
  FolderPlus,
  GitBranch,
  Globe,
  Palette,
  Paperclip,
  Pencil,
  Pin,
  Plug,
  Plus,
  Puzzle,
  Search,
  Share,
  Trash2,
  Wand2,
} from "lucide-react";
import { useState, type ComponentProps } from "react";
import type { Key, Selection } from "react-aria-components";
import { expect, fn, within } from "storybook/test";

type Args = Omit<ComponentProps<typeof Menu>, "onAction"> & {
  onAction: (key: Key) => void;
  /** Open on first render. */
  defaultOpen: boolean;
};

/** A popup list of actions or choices. Each story below builds a menu from `Menu` and `MenuItem` plus the menu parts (`MenuTrigger`, `Popover`, `SubmenuTrigger`, ...). */
const meta = {
  title: "Primitives/Menu",
  component: Menu,
  subcomponents: { MenuItem },
  args: { defaultOpen: true, onAction: fn() },
  argTypes: {
    defaultOpen: { control: "boolean", description: "Open on first render.", table: { category: "Story" } },
    onAction: { description: "Called with the key of the item the user chose (on the root menu)." },
  },
  parameters: { controls: { include: ["defaultOpen", "onAction"] } },
} satisfies Meta<Args>;
export default meta;

type Story = StoryObj<Args>;

function AttachMenu({ defaultOpen, onAction }: Args) {
  const [toggles, setToggles] = useState<Selection>(new Set(["web"]));
  return (
    <div className="h-[28rem] pt-[22rem]">
      <MenuTrigger defaultOpen={defaultOpen}>
        <IconButton label="Add files and more">
          <Plus />
        </IconButton>
        <Popover placement="top start">
          <Menu aria-label="Add" onAction={(key) => onAction(key)}>
            <MenuItem id="upload" icon={<Paperclip />} shortcut="⌘U">
              Upload or add files
            </MenuItem>
            <MenuItem id="screenshot" icon={<Camera />}>
              Take a screenshot
            </MenuItem>
            <SubmenuTrigger>
              <MenuItem id="project" icon={<FolderPlus />}>
                Add to project
              </MenuItem>
              <Popover placement="end top">
                <Menu aria-label="Projects">
                  <MenuItem id="stab57">stab57</MenuItem>
                  <MenuItem id="c34">c34</MenuItem>
                </Menu>
              </Popover>
            </SubmenuTrigger>
            <MenuItem id="github" icon={<GitBranch />}>
              Add from GitHub
            </MenuItem>
            <MenuSeparator />
            {(["Skills", "Connectors"] as const).map((name) => (
              <SubmenuTrigger key={name}>
                <MenuItem id={name} icon={name === "Skills" ? <Wand2 /> : <Plug />}>
                  {name}
                </MenuItem>
                <Popover placement="end top">
                  <Menu aria-label={name}>
                    <MenuItem id="manage">Manage {name.toLowerCase()}</MenuItem>
                  </Menu>
                </Popover>
              </SubmenuTrigger>
            ))}
            <SubmenuTrigger>
              <MenuItem id="design" icon={<Palette />}>
                Design system
              </MenuItem>
              <Popover placement="end top">
                <Menu aria-label="Design system">
                  <MenuItem id="manage" icon={<ExternalLink />}>
                    Manage design systems
                  </MenuItem>
                  <SubmenuTrigger>
                    <MenuItem id="new" icon={<Plus />}>
                      New design system
                    </MenuItem>
                    <Popover placement="end top">
                      <Menu aria-label="New design system">
                        <MenuItem id="blank">Blank</MenuItem>
                      </Menu>
                    </Popover>
                  </SubmenuTrigger>
                </Menu>
              </Popover>
            </SubmenuTrigger>
            <MenuItem id="plugins" icon={<Puzzle />}>
              Add plugins
            </MenuItem>
            <MenuSeparator />
            {/* Only the toggles hold a selection; the items above are actions. */}
            <MenuSection selectionMode="multiple" selectedKeys={toggles} onSelectionChange={setToggles}>
              <MenuItem id="research" icon={<Search />}>
                Research
              </MenuItem>
              <MenuItem id="web" icon={<Globe />}>
                Web search
              </MenuItem>
            </MenuSection>
          </Menu>
        </Popover>
      </MenuTrigger>
    </div>
  );
}

/** The composer's "+" menu: actions, nested submenus, and two toggles that hold a selection. */
export const Default: Story = {
  render: (args) => <AttachMenu {...args} />,
  play: async ({ args, userEvent }) => {
    const menu = within(document.body);
    await userEvent.click(await menu.findByRole("menuitem", { name: /Upload or add files/ }));
    await expect(args.onAction).toHaveBeenCalledWith("upload");
  },
};

function NoteMenu({ defaultOpen, onAction }: Args) {
  return (
    <MenuTrigger defaultOpen={defaultOpen}>
      <Button>Effort</Button>
      <Popover placement="bottom start" className="w-80">
        <MenuNote>Higher effort means more thorough responses, but takes longer and uses your limits faster.</MenuNote>
        <Menu aria-label="Effort" selectionMode="single" defaultSelectedKeys={["medium"]} onSelectionChange={(keys) => onAction([...keys][0]!)}>
          <MenuItem id="low">Low</MenuItem>
          <MenuItem id="medium" textValue="Medium">
            <span className="flex items-center gap-2">
              Medium <Badge>Recommended</Badge>
            </span>
          </MenuItem>
          <MenuItem id="high">High</MenuItem>
          <MenuItem id="max" textValue="Max">
            <span className="flex items-center gap-2">
              Max
              <Badge tone="warning" icon={<AlertTriangle />}>
                5.5× or more usage
              </Badge>
            </span>
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

/** A menu with an explanatory note above single-select items that carry badges. */
export const WithNote: Story = {
  render: (args) => <NoteMenu {...args} />,
  play: async ({ args, userEvent }) => {
    const menu = within(document.body);
    await expect(await menu.findByText(/Higher effort means/)).toBeInTheDocument();
    await userEvent.click(menu.getByRole("menuitemradio", { name: /High/ }));
    await expect(args.onAction).toHaveBeenCalledWith("high");
  },
};

const projects = ["CSCD01 Professor", "stab57", "c34", "matc15", "CSCC43 Project", "Resume Improver", "LINA01 Professor", "ASL Webcam Transcriber"];

function SubmenuMenu({ defaultOpen, onAction }: Args) {
  return (
    <MenuTrigger defaultOpen={defaultOpen}>
      <Button>
        Self-hosting a team wiki <ChevronDown className="size-4" />
      </Button>
      <Popover placement="bottom start">
        <Menu aria-label="Chat actions" className="min-w-44" onAction={(key) => onAction(key)}>
          <MenuItem id="pin" icon={<Pin />} shortcut="P">
            Pin
          </MenuItem>
          <MenuItem id="rename" icon={<Pencil />} shortcut="R">
            Rename
          </MenuItem>
          <SubmenuTrigger>
            <MenuItem id="project" icon={<FolderPlus />}>
              Add to project
            </MenuItem>
            <Popover placement="end top" className="w-60">
              <MenuSearch placeholder="Search or create a project">
                <Menu aria-label="Projects" className="max-h-72">
                  <MenuItem id="new" icon={<Plus />}>
                    New project
                  </MenuItem>
                  {projects.map((name) => (
                    <MenuItem key={name} id={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Menu>
              </MenuSearch>
            </Popover>
          </SubmenuTrigger>
          <MenuItem id="share" icon={<Share />}>
            Share chat
          </MenuItem>
          <MenuSeparator />
          <MenuItem id="delete" icon={<Trash2 />} shortcut="D" tone="danger">
            Delete
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

/** Submenu with search, built only from primitives (the real one is Components/ChatHeader). */
export const WithSubmenu: Story = {
  render: (args) => <SubmenuMenu {...args} />,
  play: async ({ args, userEvent }) => {
    const menu = within(document.body);
    await userEvent.click(await menu.findByRole("menuitem", { name: /Rename/ }));
    await expect(args.onAction).toHaveBeenCalledWith("rename");
  },
};
