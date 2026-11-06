import { clsx } from "clsx";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  FileText,
  MessageSquare,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Globe,
  Info,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Share,
  ShieldQuestion,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  X,
  Mic,
} from "lucide-react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Caret } from "./caret";

/**
 * Every icon the kit shows, so a host can swap them for its own set. Set through
 * `ChatTheme icons={{ copy: <MyCopy /> }}`; keys left out keep the default (Lucide). Icons should be SVGs:
 * the kit sizes and colors them through CSS (`size-*`, `currentColor`).
 */
export interface ChatIcons {
  /** Copy button on messages. */
  copy: ReactNode;
  /** Copy button for the moment after copying. */
  copied: ReactNode;
  /** Retry / regenerate a response. */
  retry: ReactNode;
  /** Edit a message or a pasted-text attachment. */
  edit: ReactNode;
  /** Read a message aloud. */
  speak: ReactNode;
  /** Positive feedback on a response. */
  thumbsUp: ReactNode;
  /** Negative feedback on a response. */
  thumbsDown: ReactNode;
  /** Send the composer's message. */
  send: ReactNode;
  /** Stop a running response. */
  stop: ReactNode;
  /** Open the attach menu in the composer. */
  attach: ReactNode;
  /** Start dictation in the composer. */
  mic: ReactNode;
  /** Cancel dictation. */
  dictationCancel: ReactNode;
  /** Accept dictation: put the transcript in the box. */
  dictationAccept: ReactNode;
  /** Jump to the newest message. */
  scrollToBottom: ReactNode;
  /** Prefix of the token counter. */
  tokens: ReactNode;
  /** Toggle the sidebar. */
  sidebar: ReactNode;
  /** Account or workspace switcher in the sidebar. */
  switcher: ReactNode;
  /** Down chevron on dropdown triggers (chat title menu, model picker). */
  dropdown: ReactNode;
  /** Right-pointing chevron of a collapsed section or disclosure; rotates 90 degrees when open. */
  expand: ReactNode;
  /** Small filled triangle after expandable labels; rotates 90 degrees when open. */
  caret: ReactNode;
  /** Marks a menu item that opens a submenu. */
  submenu: ReactNode;
  /** Marks the selected menu item. */
  check: ReactNode;
  /** Default icon of a ChatNotice. */
  info: ReactNode;
  /** Warning badge, e.g. on unavailable models. */
  warning: ReactNode;
  /** Tool approval card. */
  approval: ReactNode;
  /** Previous question in the ask_user prompt's pager. */
  askPrevious: ReactNode;
  /** Next question in the ask_user prompt's pager. */
  askPagerNext: ReactNode;
  /** Continue / send answers button in the ask_user prompt. */
  askNext: ReactNode;
  /** Drag handle of a rank row in the ask_user prompt. */
  dragHandle: ReactNode;
  /** Web link without a favicon, in search results. */
  web: ReactNode;
  /** Pin a chat. */
  pin: ReactNode;
  /** Unpin a chat. */
  unpin: ReactNode;
  /** Rename a chat. */
  rename: ReactNode;
  /** Move a chat into a project. */
  addToProject: ReactNode;
  /** Create something new (a project from the project picker). */
  add: ReactNode;
  /** Share a chat. */
  share: ReactNode;
  /** Delete a chat. */
  delete: ReactNode;
  /** Row actions button in chat lists. */
  more: ReactNode;
  /** Collapsed project folder. */
  folder: ReactNode;
  /** Expanded project folder. */
  folderOpen: ReactNode;
  /** Attachment without a preview. */
  file: ReactNode;
  /** Remove an attachment. */
  remove: ReactNode;
  /** The recent-chats button on the collapsed sidebar rail (`ChatListRailButton`). */
  chatList: ReactNode;
  /**
   * Left of the thinking / tool-steps summary while the model works, e.g. your logo animating. None by
   * default.
   */
  activity?: ReactNode;
  /** The same spot once the steps are done, e.g. the logo at rest. None by default. */
  activityDone?: ReactNode;
}

/** Lucide icons, plus the claude.ai caret. Unsized: the places that show them size them with CSS. */
export const defaultIcons: ChatIcons = {
  copy: <Copy />,
  copied: <Check />,
  retry: <RefreshCw />,
  edit: <Pencil />,
  speak: <Volume2 />,
  thumbsUp: <ThumbsUp />,
  thumbsDown: <ThumbsDown />,
  send: <ArrowUp />,
  stop: <Square />,
  attach: <Plus />,
  mic: <Mic />,
  dictationCancel: <X />,
  dictationAccept: <Check />,
  scrollToBottom: <ArrowDown />,
  tokens: <ArrowDown />,
  sidebar: <PanelLeft />,
  switcher: <ChevronsUpDown />,
  dropdown: <ChevronDown />,
  expand: <ChevronRight />,
  caret: <Caret />,
  submenu: <ChevronRight />,
  check: <Check />,
  info: <Info />,
  warning: <AlertTriangle />,
  approval: <ShieldQuestion />,
  askPrevious: <ChevronLeft />,
  askPagerNext: <ChevronRight />,
  askNext: <ArrowRight />,
  dragHandle: <GripVertical />,
  web: <Globe />,
  pin: <Pin />,
  unpin: <PinOff />,
  rename: <Pencil />,
  addToProject: <FolderPlus />,
  add: <Plus />,
  share: <Share />,
  delete: <Trash2 />,
  more: <MoreHorizontal />,
  folder: <Folder />,
  folderOpen: <FolderOpen />,
  file: <FileText />,
  remove: <X />,
  chatList: <MessageSquare />,
};

const IconsContext = createContext<ChatIcons>(defaultIcons);

/** Merges `icons` over the icons of the enclosing provider (or the defaults). */
export function IconsProvider({ icons, children }: { icons: Partial<ChatIcons> | undefined; children: ReactNode }) {
  const parent = useIcons();
  const merged = useMemo(() => (icons ? { ...parent, ...icons } : parent), [parent, icons]);
  return <IconsContext.Provider value={merged}>{children}</IconsContext.Provider>;
}

/** The active icons: the enclosing `ChatTheme`'s `icons` over the defaults. */
export function useIcons(): ChatIcons {
  return useContext(IconsContext);
}

/**
 * Sizes and colors an icon where no button does it already. Pass the size as `[&_svg]:size-4` so it
 * reaches whatever SVG the host supplies.
 */
export function IconSlot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span aria-hidden className={clsx("inline-flex shrink-0 items-center justify-center", className)}>
      {children}
    </span>
  );
}
