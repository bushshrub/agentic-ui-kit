import { clsx } from "clsx";
import { useIcons, IconSlot } from "../primitives/icons";
import type { ReactNode } from "react";
import { useLabels } from "../primitives/labels";
import { Button } from "../primitives/button";
import { Menu, MenuItem, MenuSearch, MenuSeparator, MenuTrigger, Popover, SubmenuTrigger } from "../primitives/menu";

export interface ChatHeaderProps {
  title: ReactNode;
  /** Opens from the title, e.g. `<ChatTitleMenu>`. Without it the title is plain text. */
  menu?: ReactNode;
  /** Left of the title, e.g. a project breadcrumb or the sidebar toggle on small screens. */
  leading?: ReactNode;
  /** Right side, e.g. Share or a context button. */
  actions?: ReactNode;
  className?: string;
}

/** The bar above a chat: breadcrumb and title with its menu, actions on the right. */
export function ChatHeader({ title, menu, leading, actions, className }: ChatHeaderProps) {
  const icons = useIcons();
  return (
    <header className={clsx("flex h-12 shrink-0 items-center gap-1 px-3 font-chat-sans", className)}>
      {leading}
      {menu ? (
        <MenuTrigger>
          <Button size="sm" className="min-w-0 text-chat-fg">
            <span className="truncate">{title}</span>
            <IconSlot className="text-chat-muted [&_svg]:size-3.5">{icons.dropdown}</IconSlot>
          </Button>
          <Popover placement="bottom start">{menu}</Popover>
        </MenuTrigger>
      ) : (
        <h1 className="min-w-0 truncate px-2 text-(length:--chat-ui-font-size) leading-5 text-chat-fg">{title}</h1>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>
    </header>
  );
}

export interface ChatTitleMenuProps {
  pinned?: boolean;
  onPin?: () => void;
  onRename?: () => void;
  projects?: { id: string; name: string }[];
  onAddToProject?: (projectId: string) => void;
  onCreateProject?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  /** Extra items, placed before Delete. */
  children?: ReactNode;
}

/** Pin, Rename, Add to project (searchable), Share, Delete. Each shows only when its handler is set. */
export function ChatTitleMenu({ pinned, onPin, onRename, projects, onAddToProject, onCreateProject, onShare, onDelete, children }: ChatTitleMenuProps) {
  const icons = useIcons();
  const labels = useLabels();
  const act = (key: React.Key) => {
    if (key === "pin") onPin?.();
    else if (key === "rename") onRename?.();
    else if (key === "share") onShare?.();
    else if (key === "delete") onDelete?.();
  };
  return (
    <Menu aria-label={labels.chatActions} className="min-w-44" onAction={act}>
      {onPin && (
        <MenuItem id="pin" icon={pinned ? icons.unpin : icons.pin} shortcut="P">
          {pinned ? labels.unpin : labels.pin}
        </MenuItem>
      )}
      {onRename && (
        <MenuItem id="rename" icon={icons.rename} shortcut="R">
          {labels.rename}
        </MenuItem>
      )}
      {onAddToProject && (
        <SubmenuTrigger>
          <MenuItem id="project" icon={icons.addToProject}>
            {labels.addToProject}
          </MenuItem>
          <Popover placement="end top" className="w-60">
            <MenuSearch placeholder={labels.searchProjects}>
              <Menu
                aria-label={labels.projects}
                className="max-h-72"
                onAction={(key) => (key === "__new" ? onCreateProject?.() : onAddToProject(String(key)))}
              >
                {onCreateProject && (
                  <MenuItem id="__new" icon={icons.add}>
                    {labels.newProject}
                  </MenuItem>
                )}
                {(projects ?? []).map((p) => (
                  <MenuItem key={p.id} id={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Menu>
            </MenuSearch>
          </Popover>
        </SubmenuTrigger>
      )}
      {onShare && (
        <MenuItem id="share" icon={icons.share}>
          {labels.shareChat}
        </MenuItem>
      )}
      {children}
      {onDelete && (
        <>
          <MenuSeparator />
          <MenuItem id="delete" icon={icons.delete} shortcut="D" tone="danger">
            {labels.delete}
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
