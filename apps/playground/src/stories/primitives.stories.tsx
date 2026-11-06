import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  SegmentedControl,
  EffortSlider,
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
  Trash2,
  Wand2,
} from "lucide-react";
import { ArrowUp, Check, LayoutGrid, List, Maximize2, X } from "lucide-react";
import { useState, type ComponentProps } from "react";
import type { Key, Selection } from "react-aria-components";
import { expect, fn, waitFor, within } from "storybook/test";

/** Every story sets its own `component`, so the sheet has no component of its own. */
const meta: Meta = { title: "Primitives", subcomponents: { Button, IconButton, SegmentedControl, Badge, Menu, MenuItem, Disclosure, Tooltip, ContextMenu, Modal, Drawer, Panel, CodeBlock, EffortSlider } };
export default meta;

const icons = { none: undefined, plus: <Plus />, share: <Share />, check: <Check />, send: <ArrowUp /> };

interface ButtonArgs {
  variant: NonNullable<ComponentProps<typeof Button>["variant"]>;
  size: NonNullable<ComponentProps<typeof Button>["size"]>;
  children: string;
  /** An icon before the label. */
  icon: keyof typeof icons;
  isDisabled: boolean;
  onPress: () => void;
}

function ButtonDemo({ icon, children, ...props }: ButtonArgs) {
  return (
    <Button {...props}>
      {icons[icon]} {children}
    </Button>
  );
}

/** Text button in every variant and size. The icon, if any, comes before the label. */
export const Buttons: StoryObj<typeof ButtonDemo> = {
  name: "Button",
  render: (args) => <ButtonDemo {...args} />,
  args: { variant: "outline", size: "md", children: "Save", icon: "none", isDisabled: false, onPress: fn() },
  argTypes: {
    variant: { control: "select", options: ["ghost", "subtle", "outline", "primary", "danger"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    icon: { control: "inline-radio", options: Object.keys(icons) },
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

interface IconButtonArgs {
  /** Accessible name, also the tooltip. */
  label: string;
  variant: NonNullable<ComponentProps<typeof IconButton>["variant"]>;
  size: "sm" | "md";
  isDisabled: boolean;
  onPress: () => void;
}

function IconButtonDemo({ label, ...props }: IconButtonArgs) {
  return (
    <IconButton label={label} {...props}>
      <ArrowUp />
    </IconButton>
  );
}

/** A square button holding only an icon; hover for its label. */
export const IconButtons: StoryObj<typeof IconButtonDemo> = {
  name: "IconButton",
  render: (args) => <IconButtonDemo {...args} />,
  args: { label: "Send", variant: "primary", size: "md", isDisabled: false, onPress: fn() },
  argTypes: {
    variant: { control: "select", options: ["ghost", "subtle", "outline", "primary", "danger"] },
    size: { control: "inline-radio", options: ["sm", "md"] },
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: args.label }));
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

interface SegmentedArgs {
  /** Text options, or icons only (then the labels are the accessible names). */
  iconOnly: boolean;
  onChange: (value: string) => void;
}

function SegmentedDemo({ iconOnly, onChange }: SegmentedArgs) {
  const [value, setValue] = useState("a");
  const options = iconOnly
    ? [{ id: "a", label: "List", icon: <List />, iconOnly: true }, { id: "b", label: "Grid", icon: <LayoutGrid />, iconOnly: true }]
    : [{ id: "a", label: "Chat" }, { id: "b", label: "Cowork" }];
  return (
    <div className="inline-flex rounded-chat-lg bg-chat-surface p-2">
      <SegmentedControl
        label="Mode"
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
        options={options}
      />
    </div>
  );
}

/** One of a few options on a track, like the Chat / Cowork switch. */
export const Segmented: StoryObj<typeof SegmentedDemo> = {
  name: "SegmentedControl",
  render: (args) => <SegmentedDemo {...args} />,
  args: { iconOnly: false, onChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("radio")[1]!);
    await expect(args.onChange).toHaveBeenCalledWith("b");
  },
};

interface BadgeArgs {
  tone: "outline" | "warning";
  children: string;
  /** A warning icon before the text. */
  icon: boolean;
}

function BadgeDemo({ icon, ...props }: BadgeArgs) {
  return <Badge icon={icon ? <AlertTriangle /> : undefined} {...props} />;
}

/** A small tag: outlined ("Recommended") or amber ("5.5× or more usage"). */
export const Badges: StoryObj<typeof BadgeDemo> = {
  name: "Badge",
  render: (args) => <BadgeDemo {...args} />,
  args: { tone: "outline", children: "Recommended", icon: false },
  argTypes: { tone: { control: "inline-radio", options: ["outline", "warning"] } },
};

interface MenuArgs {
  /** Open on first render. */
  defaultOpen: boolean;
  onAction: (key: Key) => void;
}

function AttachMenuDemo({ defaultOpen, onAction }: MenuArgs) {
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
export const AttachMenu: StoryObj<typeof AttachMenuDemo> = {
  render: (args) => <AttachMenuDemo {...args} />,
  args: { defaultOpen: true, onAction: fn() },
  play: async ({ args, userEvent }) => {
    const menu = within(document.body);
    await userEvent.click(await menu.findByRole("menuitem", { name: /Upload or add files/ }));
    await expect(args.onAction).toHaveBeenCalledWith("upload");
  },
};

function NoteMenuDemo({ defaultOpen, onAction }: MenuArgs) {
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
export const MenuWithNote: StoryObj<typeof NoteMenuDemo> = {
  render: (args) => <NoteMenuDemo {...args} />,
  args: { defaultOpen: true, onAction: fn() },
  play: async ({ args, userEvent }) => {
    const menu = within(document.body);
    await expect(await menu.findByText(/Higher effort means/)).toBeInTheDocument();
    await userEvent.click(menu.getByRole("menuitemradio", { name: /High/ }));
    await expect(args.onAction).toHaveBeenCalledWith("high");
  },
};

const projects = ["CSCD01 Professor", "stab57", "c34", "matc15", "CSCC43 Project", "Resume Improver", "LINA01 Professor", "ASL Webcam Transcriber"];

function SubmenuDemo({ defaultOpen, onAction }: MenuArgs) {
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
export const MenuWithSubmenu: StoryObj<typeof SubmenuDemo> = {
  render: (args) => <SubmenuDemo {...args} />,
  args: { defaultOpen: true, onAction: fn() },
  play: async ({ args, userEvent }) => {
    const menu = within(document.body);
    await userEvent.click(await menu.findByRole("menuitem", { name: /Rename/ }));
    await expect(args.onAction).toHaveBeenCalledWith("rename");
  },
};

interface DisclosureArgs {
  summary: string;
  /** Open on first render. */
  defaultExpanded: boolean;
  /** An icon before the summary. */
  icon: boolean;
  indicator: "caret" | "chevron";
  onExpandedChange: (expanded: boolean) => void;
}

function DisclosureDemo({ summary, icon, ...props }: DisclosureArgs) {
  return (
    <div className="w-[32rem]">
      {/* Keyed so `defaultExpanded` applies again when it changes. */}
      <Disclosure
        key={String(props.defaultExpanded)}
        summary={icon ? <span className="flex items-center gap-1.5"><Sparkles className="size-4" /> {summary}</span> : summary}
        {...props}
      >
        <p className="mt-2 text-sm text-chat-muted">Prefers a worked example before the general formula.</p>
      </Disclosure>
    </div>
  );
}

/** A summary row that opens and closes its content. */
export const Disclosures: StoryObj<typeof DisclosureDemo> = {
  name: "Disclosure",
  render: (args) => <DisclosureDemo {...args} />,
  args: { summary: "Recalled memory", defaultExpanded: false, icon: false, indicator: "caret", onExpandedChange: fn() },
  argTypes: { indicator: { control: "inline-radio", options: ["caret", "chevron"] } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await expect(args.onExpandedChange).toHaveBeenCalledWith(!args.defaultExpanded);
  },
};

interface TooltipArgs {
  content: string;
  placement: "top" | "bottom" | "start" | "end";
  /** Milliseconds before it shows. */
  delay: number;
}

function TooltipDemo({ placement, ...props }: TooltipArgs) {
  return (
    <div className="p-16">
      <Tooltip placement={placement} {...props}>
        <Button variant="subtle">Hover me</Button>
      </Tooltip>
    </div>
  );
}

/** A short label on hover or focus. */
export const Tooltips: StoryObj<typeof TooltipDemo> = {
  name: "Tooltip",
  render: (args) => <TooltipDemo {...args} />,
  args: { content: "Tooltip text", placement: "top", delay: 0 },
  argTypes: {
    placement: { control: "inline-radio", options: ["top", "bottom", "start", "end"] },
    delay: { control: { type: "range", min: 0, max: 1500, step: 100 } },
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("button"));
    await expect(await within(document.body).findByRole("tooltip")).toHaveTextContent(args.content);
  },
};

interface ContextMenuArgs {
  onAction: (key: Key) => void;
}

function ContextMenuDemo({ onAction }: ContextMenuArgs) {
  return (
    <ContextMenu
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
  );
}

/** Right-click (or the Menu key / Shift+F10 when focused) anywhere in the box. */
export const ContextMenus: StoryObj<typeof ContextMenuDemo> = {
  name: "ContextMenu",
  render: (args) => <ContextMenuDemo {...args} />,
  args: { onAction: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.pointer({ keys: "[MouseRight]", target: canvas.getByText("Right-click here") });
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: /Branch from here/ }));
    await expect(args.onAction).toHaveBeenCalledWith("branch");
  },
};

interface OverlayArgs {
  kind: "modal" | "drawer";
  /** Which edge the drawer slides from. */
  side: "left" | "right";
  /** Open on first render. */
  defaultOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function OverlayDemo({ kind, side, defaultOpen, onOpenChange }: OverlayArgs) {
  const [open, setOpen] = useState(defaultOpen);
  const change = (value: boolean) => {
    setOpen(value);
    onOpenChange(value);
  };
  return (
    <>
      <Button variant="subtle" onPress={() => change(true)}>
        Open {kind}
      </Button>
      {kind === "modal" ? (
        <Modal isOpen={open} onOpenChange={change} title="Rename chat" className="max-w-md">
          <input aria-label="Title" defaultValue="Speeding up CI" className="mx-5 h-10 rounded-chat-md border border-chat-border bg-chat-bg px-3 text-chat-fg outline-none focus:border-chat-border-strong" />
          <div className="flex justify-end gap-2 px-5 py-4">
            <Button variant="subtle" onPress={() => change(false)}>
              Cancel
            </Button>
            <Button variant="primary" onPress={() => change(false)}>
              Save
            </Button>
          </div>
        </Modal>
      ) : (
        <Drawer isOpen={open} onOpenChange={change} side={side} aria-label="Drawer">
          <p className="p-4 text-sm">{side === "left" ? "The sidebar uses this on phones." : "E.g. a context or settings panel."}</p>
        </Drawer>
      )}
    </>
  );
}

/** A centered dialog or a side drawer over a dimmed page. Escape and clicking outside close it. */
export const ModalAndDrawer: StoryObj<typeof OverlayDemo> = {
  name: "Modal and Drawer",
  render: (args) => <OverlayDemo {...args} />,
  args: { kind: "modal", side: "left", defaultOpen: false, onOpenChange: fn() },
  argTypes: {
    kind: { control: "inline-radio", options: ["modal", "drawer"] },
    side: { control: "inline-radio", options: ["left", "right"], if: { arg: "kind", eq: "drawer" } },
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /Open/ }));
    const dialog = await within(document.body).findByRole("dialog");
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true);
    await userEvent.keyboard("{Escape}");
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

interface PanelArgs {
  /** Header text; empty leaves the header out (unless there are actions). */
  title: string;
  variant: "card" | "flush";
  /** Expand and close buttons on the right of the header. */
  actions: boolean;
  footer: boolean;
  onClose: () => void;
}

function PanelDemo({ title, variant, actions, footer, onClose }: PanelArgs) {
  return (
    <div className="h-80 w-[22rem]">
      <Panel
        title={title || undefined}
        variant={variant}
        aria-label="Panel"
        actions={
          actions ? (
            <>
              <IconButton label="Expand" size="sm">
                <Maximize2 />
              </IconButton>
              <IconButton label="Close" size="sm" onPress={onClose}>
                <X />
              </IconButton>
            </>
          ) : undefined
        }
        footer={footer ? <span className="text-xs text-chat-muted">Footer</span> : undefined}
      >
        <p className="m-0 p-3 text-sm">{"Scrolling body. ".repeat(60)}</p>
      </Panel>
    </div>
  );
}

/** A framed region with a header that fills its container; an assistant dock, or one agent pane in a dashboard. */
export const Panels: StoryObj<typeof PanelDemo> = {
  name: "Panel",
  render: (args) => <PanelDemo {...args} />,
  args: { title: "Assistant", variant: "card", actions: true, footer: true, onClose: fn() },
  argTypes: { variant: { control: "inline-radio", options: ["card", "flush"] } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

interface CodeBlockArgs {
  code: string;
  language: string;
  /** Caption; defaults to the language. */
  label: string;
  variant: "plain" | "boxed";
}

function CodeBlockDemo({ label, ...props }: CodeBlockArgs) {
  return (
    <div className="w-[36rem]">
      <CodeBlock label={label || undefined} {...props} />
    </div>
  );
}

/** Highlighted code; "boxed" adds a caption bar with a copy button. */
export const CodeBlocks: StoryObj<typeof CodeBlockDemo> = {
  name: "CodeBlock",
  render: (args) => <CodeBlockDemo {...args} />,
  args: {
    code: 'const chat = useChat({ transport });\nchat.send("Hello", { model: "gpt-6-astra" });',
    language: "ts",
    label: "",
    variant: "boxed",
  },
  argTypes: { variant: { control: "inline-radio", options: ["plain", "boxed"] } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/useChat/)).toBeVisible();
  },
};

interface EffortArgs {
  onChange: (id: string) => void;
}

function EffortDemo({ onChange }: EffortArgs) {
  const [effort, setEffort] = useState("medium");
  return (
    <div className="w-72 rounded-chat-popover border border-chat-popover-border bg-chat-popover p-3">
      <EffortSlider
        efforts={[
          { id: "low", label: "Low", description: "Quick answers" },
          { id: "medium", label: "Medium", description: "Balanced; the default", recommended: true },
          { id: "high", label: "High", description: "More thorough, takes longer" },
          { id: "max", label: "Max", description: "Most thorough", warning: "Slower" },
        ]}
        value={effort}
        onChange={(id) => {
          setEffort(id);
          onChange(id);
        }}
      />
    </div>
  );
}

/** Effort as a slider, one stop per level. Drag, click a spot, or use the arrow keys. */
export const EffortSliderStory: StoryObj<typeof EffortDemo> = {
  name: "Effort slider",
  render: (args) => <EffortDemo {...args} />,
  args: { onChange: fn() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("slider"));
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onChange).toHaveBeenCalledWith("high");
  },
};
