import { clsx } from "clsx";
import { useIcons, IconSlot } from "../primitives/icons";
import { useState, type ReactNode } from "react";
import { Button as AriaButton, Dialog, Disclosure, DisclosurePanel, Heading, Link } from "react-aria-components";
import { Badge } from "../primitives/badge";
import { IconButton } from "../primitives/button";
import { useLabels } from "../primitives/labels";
import { DialogTrigger, MenuTrigger, Popover, type PopoverProps } from "../primitives/menu";
import { useSidebar } from "../hooks/sidebar-state";

export interface ChatSummary {
  id: string;
  title: string;
  /** A reply is streaming in this chat. */
  running?: boolean;
  /** Something new since the user last opened it. */
  unread?: boolean;
  /** Quiet text at the right of the row, e.g. a relative time ("2h"). Makes room for the "…" button on hover. */
  detail?: ReactNode;
  /** Dimmed row, e.g. a channel with notifications off. Unread styling is dropped. */
  muted?: boolean;
  /** Link target. Rows render as links when set (middle-click, open in new tab), else as buttons. */
  href?: string;
}

export interface ProjectSummary {
  type: "project";
  id: string;
  name: string;
  chats: ChatSummary[];
  defaultExpanded?: boolean;
  href?: string;
}

export type ChatListItem = ChatSummary | ProjectSummary;

export interface ChatListSection {
  id: string;
  /** "Pinned", "Chats and tasks". Without a title the section has no header and cannot collapse. */
  title?: string;
  items: ChatListItem[];
  defaultExpanded?: boolean;
  /** Next to the title, e.g. "10 new". */
  badge?: ReactNode;
  /** Right side of the header, e.g. a filter button. */
  action?: ReactNode;
  /** Shows a "View all" row after the items. */
  onViewAll?: () => void;
}

export interface ChatListProps {
  sections: ChatListSection[];
  activeId?: string;
  onSelect?: (chatId: string) => void;
  /** Opens from a row's "…" button, e.g. `<ChatTitleMenu>` for that chat. */
  rowMenu?: (chat: ChatSummary) => ReactNode;
  "aria-label"?: string;
  className?: string;
}

const isProject = (item: ChatListItem): item is ProjectSummary => "type" in item && item.type === "project";

const rowClass = clsx(
  "group/row relative flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-chat-sm px-2 text-left font-chat-sans text-(length:--chat-ui-font-size) leading-5 text-chat-fg outline-none",
  "data-hovered:bg-chat-hover data-pressed:bg-chat-selected data-focus-visible:ring-2 data-focus-visible:ring-chat-focus data-focus-visible:ring-inset",
  "[@media(pointer:coarse)]:h-10",
);

/**
 * The chat picker: sections of chats and projects, collapsible, with an active row, running and unread
 * markers and a per-row menu. Usable on its own (in a host's own sidebar) or inside `Sidebar`.
 */
export function ChatList({ sections, activeId, onSelect, rowMenu, className, ...props }: ChatListProps) {
  const icons = useIcons();
  const labels = useLabels();
  const row = (chat: ChatSummary, nested = false) => (
    <ChatRow key={chat.id} chat={chat} active={chat.id === activeId} nested={nested} {...(onSelect && { onSelect })} {...(rowMenu && { menu: rowMenu(chat) })} />
  );
  const items = (list: ChatListItem[]) =>
    list.map((item) => (isProject(item) ? <ProjectRow key={item.id} project={item} activeId={activeId} row={row} /> : row(item)));

  return (
    <nav aria-label={props["aria-label"] ?? labels.chats} className={clsx("flex flex-col gap-3", className)}>
      {sections.map((section) =>
        section.title ? (
          <Disclosure key={section.id} defaultExpanded={section.defaultExpanded ?? true} className="group/section">
            <Heading className="m-0 flex h-7 items-center gap-1 pr-1 pl-2 font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 font-normal text-chat-subtle">
              <AriaButton slot="trigger" className="group/trigger flex min-w-0 cursor-pointer items-center gap-1 rounded-chat-sm outline-none data-hovered:text-chat-muted data-focus-visible:ring-2 data-focus-visible:ring-chat-focus">
                <span className="truncate">{section.title}</span>
                <IconSlot className="opacity-0 transition group-hover/section:opacity-100 group-aria-expanded/trigger:rotate-90 group-data-focus-visible/trigger:opacity-100 [@media(hover:none)]:opacity-100 [&_svg]:size-3">
                  {icons.expand}
                </IconSlot>
              </AriaButton>
              {section.badge}
              <span className="ml-auto flex items-center">{section.action}</span>
            </Heading>
            <DisclosurePanel>
              <ul className="flex flex-col gap-px">{items(section.items)}</ul>
              {section.onViewAll && (
                <AriaButton onPress={section.onViewAll} className={clsx(rowClass, "text-chat-muted")}>
                  {labels.viewAll}
                </AriaButton>
              )}
            </DisclosurePanel>
          </Disclosure>
        ) : (
          <ul key={section.id} className="flex flex-col gap-px">
            {items(section.items)}
          </ul>
        ),
      )}
    </nav>
  );
}

export interface ChatListRailButtonProps extends ChatListProps {
  /** Accessible name and tooltip of the button. Default: the `chats` label. */
  label?: string;
  /** Passed to the popover, e.g. `{ placement: "right top" }` (the default). */
  popoverProps?: Omit<PopoverProps, "children">;
}

/**
 * An icon button that opens a `ChatList` in a popover, for `Sidebar`'s `railActions`: the list itself is
 * hidden on the collapsed rail, so this keeps recent chats reachable. Picking a chat closes the popover.
 */
export function ChatListRailButton({ label, popoverProps, onSelect, className, ...list }: ChatListRailButtonProps) {
  const icons = useIcons();
  const labels = useLabels();
  const name = label ?? labels.chats;
  return (
    <DialogTrigger>
      <IconButton label={name}>{icons.chatList}</IconButton>
      <Popover placement="right top" {...popoverProps}>
        <Dialog aria-label={name} className="max-h-[70dvh] w-64 overflow-y-auto p-2 outline-none [scrollbar-width:thin]">
          {({ close }) => (
            <ChatList
              {...list}
              className={className}
              onSelect={(id) => {
                onSelect?.(id);
                close();
              }}
            />
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

function ChatRow({
  chat,
  active,
  nested,
  onSelect,
  menu,
}: {
  chat: ChatSummary;
  active: boolean;
  nested: boolean;
  onSelect?: (id: string) => void;
  menu?: ReactNode;
}) {
  const icons = useIcons();
  const [menuOpen, setMenuOpen] = useState(false);
  const { dismiss } = useSidebar();
  const labels = useLabels();
  const markerClass = "size-2 shrink-0 rounded-full";
  const marker = chat.running ? (
    <span role="img" aria-label={labels.running} className={clsx(markerClass, "animate-pulse bg-chat-accent motion-reduce:animate-none")} />
  ) : chat.unread && !chat.muted ? (
    <span role="img" aria-label={labels.unread} className={clsx(markerClass, "bg-chat-check")} />
  ) : null;
  const content = (
    <>
      <span className={clsx("min-w-0 flex-1 truncate", chat.unread && !active && !chat.muted && "font-medium", chat.muted && "text-chat-muted")}>{chat.title}</span>
      {chat.detail != null && <span className="shrink-0 text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle tabular-nums">{chat.detail}</span>}
      {marker}
    </>
  );
  // Room for the "…" button whenever it shows, so the title truncates before it and the marker sits beside it.
  const className = clsx(
    rowClass,
    nested && "pl-8",
    active && "bg-chat-selected",
    menu && (menuOpen || active ? "pr-8" : "group-hover/item:pr-8 group-focus-within/item:pr-8"),
    menu && "[@media(hover:none)]:pr-10",
  );
  const common = { className, "aria-current": active ? ("page" as const) : undefined, onPress: () => (onSelect?.(chat.id), dismiss()) };
  return (
    <li className="group/item relative">
      {chat.href ? <Link {...common} href={chat.href}>{content}</Link> : <AriaButton {...common}>{content}</AriaButton>}
      {menu && (
        <MenuTrigger isOpen={menuOpen} onOpenChange={setMenuOpen}>
          <IconButton
            label={labels.moreOptionsFor(chat.title)}
            size="sm"
            tooltip={false}
            className={clsx(
              "absolute top-1/2 right-1 size-6 -translate-y-1/2 [@media(pointer:coarse)]:size-8",
              menuOpen || active
                ? "opacity-100"
                : "opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 [@media(hover:none)]:opacity-100",
            )}
          >
            {icons.more}
          </IconButton>
          <Popover placement="bottom start">{menu}</Popover>
        </MenuTrigger>
      )}
    </li>
  );
}

function ProjectRow({ project, activeId, row }: { project: ProjectSummary; activeId: string | undefined; row: (chat: ChatSummary, nested?: boolean) => ReactNode }) {
  const icons = useIcons();
  const labels = useLabels();
  const holdsActive = project.chats.some((c) => c.id === activeId);
  return (
    <li>
      <Disclosure defaultExpanded={project.defaultExpanded ?? holdsActive}>
        {({ isExpanded }) => (
          <>
            <Heading className="m-0 font-normal">
              <AriaButton slot="trigger" className={rowClass}>
                <IconSlot className="text-chat-muted [&_svg]:size-4">{isExpanded ? icons.folderOpen : icons.folder}</IconSlot>
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {!isExpanded && project.chats.some((c) => c.unread || c.running) && <Badge>{labels.new}</Badge>}
              </AriaButton>
            </Heading>
            <DisclosurePanel>
              <ul className="flex flex-col gap-px">{project.chats.map((c) => row(c, true))}</ul>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </li>
  );
}
