import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  SegmentedControl,
  Badge,
  CodeBlock,
  ContextMenu,
  Drawer,
  Modal,
  Panel,
  Tooltip,
  Button,
  Disclosure,
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
  Copy,
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
  RefreshCw,
  Search,
  Share,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  Wand2,
} from "lucide-react";
import { ArrowUp, Check, LayoutGrid, List, Maximize2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Selection } from "react-aria-components";

const meta: Meta = { title: "Primitives" };
export default meta;

/** One labeled row of the sheet. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <div className="pt-1.5 font-chat-sans text-(length:--chat-ui-font-size-sm) text-chat-subtle">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </>
  );
}

/** Buttons, icon buttons, the segmented control and badges, in every variant, size and state. */
export const Buttons: StoryObj = {
  render: function Render() {
    const [mode, setMode] = useState<"chat" | "cowork">("chat");
    const [view, setView] = useState<"list" | "grid">("list");
    return (
      <div className="grid max-w-2xl grid-cols-[7rem_1fr] gap-x-6 gap-y-5">
        <Row label="Variants">
          <Button variant="ghost">Ghost</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="primary">Primary</Button>
          <Button variant="danger">Delete</Button>
        </Row>
        <Row label="Sizes">
          <Button variant="outline" size="sm">
            Small
          </Button>
          <Button variant="outline">Medium</Button>
          <Button variant="outline" size="lg">
            Large
          </Button>
        </Row>
        <Row label="With icon">
          <Button>
            <Plus /> New chat
          </Button>
          <Button variant="outline">
            <Share /> Share
          </Button>
          <Button variant="primary">
            <Check /> Save
          </Button>
        </Row>
        <Row label="Disabled">
          <Button variant="outline" isDisabled>
            Outline
          </Button>
          <Button variant="primary" isDisabled>
            Primary
          </Button>
        </Row>
        <Row label="A dialog's actions">
          <Button variant="outline">Cancel</Button>
          <Button variant="danger">Delete chat</Button>
        </Row>
        <Row label="Icon buttons">
          <div className="flex items-center gap-0.5">
            <IconButton label="Copy" size="sm">
              <Copy />
            </IconButton>
            <IconButton label="Read aloud" size="sm">
              <Volume2 />
            </IconButton>
            <IconButton label="Good response" size="sm">
              <ThumbsUp />
            </IconButton>
            <IconButton label="Bad response" size="sm">
              <ThumbsDown />
            </IconButton>
            <IconButton label="Retry" size="sm">
              <RefreshCw />
            </IconButton>
          </div>
          <IconButton label="Attach" variant="outline">
            <Plus />
          </IconButton>
          <IconButton label="Send" variant="primary">
            <ArrowUp />
          </IconButton>
        </Row>
        <Row label="Segmented (on the composer)">
          <div className="flex items-center gap-3 rounded-chat-lg bg-chat-surface p-2">
          <SegmentedControl label="Mode" value={mode} onChange={setMode} options={[{ id: "chat", label: "Chat" }, { id: "cowork", label: "Cowork" }]} />
          <SegmentedControl
            label="View"
            value={view}
            onChange={setView}
            options={[
              { id: "list", label: "List", icon: <List />, iconOnly: true },
              { id: "grid", label: "Grid", icon: <LayoutGrid />, iconOnly: true },
            ]}
          />
          </div>
        </Row>
        <Row label="Badges">
          <Badge>Recommended</Badge>
          <Badge tone="warning" icon={<AlertTriangle />}>
            5.5× or more usage
          </Badge>
        </Row>
      </div>
    );
  },
};

export const AttachMenu: StoryObj = {
  render: function Render() {
    const [toggles, setToggles] = useState<Selection>(new Set(["web"]));
    return (
      <MenuTrigger defaultOpen>
        <IconButton label="Add files and more">
          <Plus />
        </IconButton>
        <Popover placement="top start">
          <Menu aria-label="Add">
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
    );
  },
};

export const MenuWithNote: StoryObj = {
  render: () => (
    <MenuTrigger defaultOpen>
      <Button>Effort</Button>
      <Popover placement="bottom start" className="w-80">
        <MenuNote>Higher effort means more thorough responses, but takes longer and uses your limits faster.</MenuNote>
        <Menu aria-label="Effort" selectionMode="single" defaultSelectedKeys={["medium"]}>
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
  ),
};

export const Disclosures: StoryObj = {
  render: () => (
    <div className="w-[32rem] space-y-3">
      <Disclosure summary="Recalled memory" defaultExpanded>
        <p className="mt-2 text-sm text-chat-muted">Prefers a worked example before the general formula.</p>
      </Disclosure>
      <Disclosure summary={<span className="flex items-center gap-1.5"><Sparkles className="size-4" /> Thought for 6s</span>}>
        <p className="mt-2 text-sm text-chat-muted">Setting up a null-versus-alternative normal test.</p>
      </Disclosure>
    </div>
  ),
};

const projects = ["CSCD01 Professor", "stab57", "c34", "matc15", "CSCC43 Project", "Resume Improver", "LINA01 Professor", "ASL Webcam Transcriber"];

/** Submenu with search, built only from primitives (the real one is Components/ChatHeader). */
export const MenuWithSubmenu: StoryObj = {
  render: () => (
    <MenuTrigger defaultOpen>
      <Button>
        Self-hosting a team wiki <ChevronDown className="size-4" />
      </Button>
      <Popover placement="bottom start">
        <Menu aria-label="Chat actions" className="min-w-44">
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
  ),
};

export const Badges: StoryObj = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge>Recommended</Badge>
      <Badge tone="warning" icon={<AlertTriangle />}>
        5.5× or more usage
      </Badge>
    </div>
  ),
};

export const Tooltips: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      {(["top", "bottom", "start", "end"] as const).map((placement) => (
        <Tooltip key={placement} content={`Tooltip ${placement}`} placement={placement} delay={0}>
          <Button variant="subtle">{placement}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

/** Right-click (or the Menu key / Shift+F10 when focused) anywhere in the box. */
export const ContextMenus: StoryObj = {
  name: "ContextMenu",
  render: () => (
    <ContextMenu
      menu={
        <Menu aria-label="Message actions" className="min-w-44">
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
};

function Overlays() {
  const [modal, setModal] = useState(false);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  return (
    <div className="flex gap-2">
      <Button variant="subtle" onPress={() => setModal(true)}>
        Modal
      </Button>
      <Button variant="subtle" onPress={() => setLeft(true)}>
        Drawer left
      </Button>
      <Button variant="subtle" onPress={() => setRight(true)}>
        Drawer right
      </Button>
      <Modal isOpen={modal} onOpenChange={setModal} title="Rename chat" className="max-w-md">
        <input aria-label="Title" defaultValue="Speeding up CI" className="mx-5 h-10 rounded-chat-md border border-chat-border bg-chat-bg px-3 text-chat-fg outline-none focus:border-chat-border-strong" />
        <div className="flex justify-end gap-2 px-5 py-4">
          <Button variant="subtle" onPress={() => setModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onPress={() => setModal(false)}>
            Save
          </Button>
        </div>
      </Modal>
      <Drawer isOpen={left} onOpenChange={setLeft} aria-label="Left drawer">
        <p className="p-4 text-sm">The sidebar uses this on phones.</p>
      </Drawer>
      <Drawer isOpen={right} onOpenChange={setRight} side="right" aria-label="Right drawer">
        <p className="p-4 text-sm">E.g. a context or settings panel.</p>
      </Drawer>
    </div>
  );
}

export const ModalAndDrawer: StoryObj = { name: "Modal and Drawer", render: () => <Overlays /> };

/** A framed region with a header that fills its container; an assistant dock, or one agent pane in a dashboard. */
export const Panels: StoryObj = {
  name: "Panel",
  render: () => (
    <div className="grid h-80 w-[44rem] grid-cols-2 gap-3">
      <Panel
        title="Assistant"
        actions={
          <>
            <IconButton label="Expand" size="sm">
              <Maximize2 />
            </IconButton>
            <IconButton label="Close" size="sm">
              <X />
            </IconButton>
          </>
        }
        footer={<span className="text-xs text-chat-muted">Footer</span>}
      >
        <p className="m-0 p-3 text-sm">{"Scrolling body. ".repeat(60)}</p>
      </Panel>
      <Panel aria-label="Untitled">
        <p className="m-0 p-3 text-sm text-chat-muted">No header: just the frame.</p>
      </Panel>
    </div>
  ),
};

export const CodeBlocks: StoryObj = {
  name: "CodeBlock",
  render: () => (
    <div className="flex w-[36rem] flex-col gap-4">
      <CodeBlock language="ts" code={'const chat = useChat({ transport });\nchat.send("Hello", { model: "gpt-6-astra" });'} />
      <CodeBlock variant="boxed" label="bash" code="pnpm install --frozen-lockfile" />
    </div>
  ),
};
