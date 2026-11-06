import { clsx } from "clsx";
import { useIcons, IconSlot } from "../primitives/icons";
import type { ReactNode } from "react";
import { Button as AriaButton, Link } from "react-aria-components";
import { MenuTrigger, Popover } from "../primitives/menu";
import { Tooltip } from "../primitives/tooltip";
import { useSidebar } from "../hooks/sidebar-state";
import { SidebarToggle } from "./app-shell";

export interface SidebarProps {
  /** Name or logo at the top left; hidden when collapsed. */
  brand?: ReactNode;
  /** A logo mark left of `brand`, sized 1.25rem. It stays at the top of the collapsed rail. */
  brandIcon?: ReactNode;
  /** Buttons at the top right next to the collapse toggle, e.g. a mode switch. */
  headerActions?: ReactNode;
  /** Fixed items under the header: New chat, Search, Projects… (`SidebarItem`s). */
  nav?: ReactNode;
  /** The scrolling middle, usually `ChatList`. Hidden when collapsed. */
  children?: ReactNode;
  /** Bottom, usually `SidebarUser`. */
  footer?: ReactNode;
  className?: string;
}

/** The claude.ai sidebar frame. Collapses to an icon rail inside `AppShell`; a drawer on phones. */
export function Sidebar({ brand, brandIcon, headerActions, nav, children, footer, className }: SidebarProps) {
  const { collapsed } = useSidebar();
  return (
    <div className={clsx("flex h-full flex-col font-chat-sans", collapsed ? "w-13" : "w-full", className)}>
      {collapsed && brandIcon && <div className="flex h-12 shrink-0 items-center justify-center [&_svg]:size-5">{brandIcon}</div>}
      <div className={clsx("flex h-12 shrink-0 items-center gap-1 px-2", collapsed && "justify-center")}>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5 font-chat-serif text-lg text-chat-fg">
            {brandIcon && <span className="flex shrink-0 [&_svg]:size-5">{brandIcon}</span>}
            <span className="min-w-0 truncate">{brand}</span>
          </div>
        )}
        {!collapsed && headerActions}
        <SidebarToggle />
      </div>
      {nav && <ul className={clsx("flex shrink-0 flex-col gap-px px-2 pb-2", collapsed && "items-center")}>{nav}</ul>}
      {!collapsed && <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-4 [scrollbar-width:thin]">{children}</div>}
      {collapsed && <div className="flex-1" />}
      {footer && <div className="shrink-0 border-t border-chat-divider p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </div>
  );
}

export interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  href?: string;
  active?: boolean;
  /** Shown on the right, e.g. "⌘K". */
  shortcut?: string;
}

/** A nav row: icon and label; just the icon with a tooltip when collapsed. Closes the drawer when picked. */
export function SidebarItem({ icon, label, onPress, href, active, shortcut }: SidebarItemProps) {
  const { collapsed, dismiss } = useSidebar();
  const className = clsx(
    "group flex h-8 cursor-pointer items-center gap-2.5 rounded-chat-sm text-left text-(length:--chat-ui-font-size) leading-5 text-chat-fg outline-none [@media(pointer:coarse)]:h-10",
    "data-hovered:bg-chat-hover data-pressed:bg-chat-selected data-focus-visible:ring-2 data-focus-visible:ring-chat-focus",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    collapsed ? "w-9 justify-center [@media(pointer:coarse)]:w-10" : "w-full px-2",
    active && "bg-chat-selected",
  );
  const press = () => {
    onPress?.();
    dismiss();
  };
  const content = (
    <>
      {icon}
      {collapsed ? <span className="sr-only">{label}</span> : <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && shortcut && <kbd className="font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle opacity-0 group-data-hovered:opacity-100">{shortcut}</kbd>}
    </>
  );
  const common = { className, onPress: press, "aria-current": active ? ("page" as const) : undefined };
  const control = href ? <Link {...common} href={href}>{content}</Link> : <AriaButton {...common}>{content}</AriaButton>;
  return <li>{collapsed ? <Tooltip content={label} placement="right">{control}</Tooltip> : control}</li>;
}

export interface SidebarUserProps {
  name: string;
  /** Second line, e.g. the plan. */
  detail?: ReactNode;
  /** Image URL; initials otherwise. */
  avatarUrl?: string;
  /** Opens upward from the row, e.g. settings and log out. */
  menu?: ReactNode;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** The account row at the bottom: avatar, name, plan, and a menu. */
export function SidebarUser({ name, detail, avatarUrl, menu }: SidebarUserProps) {
  const icons = useIcons();
  const { collapsed } = useSidebar();
  const avatar = avatarUrl ? (
    <img src={avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-chat-fg text-(length:--chat-ui-font-size-sm) leading-4 font-medium text-chat-bg">
      {initials(name)}
    </span>
  );
  const button = (
    <AriaButton
      aria-label={collapsed ? name : undefined}
      className={clsx(
        "flex h-12 w-full cursor-pointer items-center gap-2.5 rounded-chat-md text-left outline-none",
        "data-hovered:bg-chat-hover data-pressed:bg-chat-selected data-focus-visible:ring-2 data-focus-visible:ring-chat-focus",
        collapsed ? "justify-center" : "px-1.5",
      )}
    >
      {avatar}
      {!collapsed && (
        <>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-(length:--chat-ui-font-size) leading-5 text-chat-fg">{name}</span>
            {detail && <span className="truncate text-(length:--chat-ui-font-size-sm) leading-4 text-chat-muted">{detail}</span>}
          </span>
          {menu && <IconSlot className="text-chat-muted [&_svg]:size-4">{icons.switcher}</IconSlot>}
        </>
      )}
    </AriaButton>
  );
  if (!menu) return button;
  return (
    <MenuTrigger>
      {button}
      <Popover placement="top start">{menu}</Popover>
    </MenuTrigger>
  );
}
