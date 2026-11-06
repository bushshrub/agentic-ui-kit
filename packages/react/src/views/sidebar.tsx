import { clsx } from "clsx";
import { useIcons, IconSlot } from "../primitives/icons";
import type { PointerEvent, ReactNode } from "react";
import { Button as AriaButton, Link } from "react-aria-components";
import { MenuTrigger, Popover, type PopoverProps } from "../primitives/menu";
import { Tooltip } from "../primitives/tooltip";
import { useSidebar } from "../hooks/sidebar-state";
import { SidebarToggle } from "./app-shell";

export interface SidebarProps {
  /** Name or logo at the top left; hidden when collapsed. */
  brand?: ReactNode;
  /** A logo mark left of `brand`, sized 1.25rem. It stays at the top of the collapsed rail. */
  brandIcon?: ReactNode;
  /** Buttons at the top right next to the collapse toggle, e.g. a mode switch. Hidden when collapsed; see `railActions`. */
  headerActions?: ReactNode;
  /** Icon-only buttons shown under the toggle on the collapsed rail, e.g. the same actions as `headerActions`. */
  railActions?: ReactNode;
  /** Fixed items under the header: New chat, Search, Projects… (`SidebarItem`s). */
  nav?: ReactNode;
  /** The scrolling middle, usually `ChatList`. Hidden when collapsed. */
  children?: ReactNode;
  /** Bottom, usually `SidebarUser`. */
  footer?: ReactNode;
  className?: string;
}

/** The claude.ai sidebar frame. Collapses to an icon rail inside `AppShell`; a drawer on phones. */
export function Sidebar({ brand, brandIcon, headerActions, railActions, nav, children, footer, className }: SidebarProps) {
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
      {collapsed && railActions && <div className="flex shrink-0 flex-col items-center gap-1 pb-2">{railActions}</div>}
      {nav && <SidebarList className={clsx("shrink-0 px-2 pb-2", collapsed && "items-center")}>{nav}</SidebarList>}
      {!collapsed && <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-4 [scrollbar-width:thin]">{children}</div>}
      {collapsed && <div className="flex-1" />}
      {footer && <div className="shrink-0 border-t border-chat-divider p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </div>
  );
}

export interface SidebarListProps {
  children: ReactNode;
  className?: string;
}

/** The `<ul>` for `SidebarItem`s outside `Sidebar`'s `nav` slot (e.g. inside a section): no bullets, no padding. */
export function SidebarList({ children, className }: SidebarListProps) {
  return <ul className={clsx("m-0 flex list-none flex-col gap-px p-0", className)}>{children}</ul>;
}

export interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  /**
   * Renders the row as a link. For client-side navigation wrap the app in react-aria's `RouterProvider`;
   * otherwise a press reloads the page.
   */
  href?: string;
  active?: boolean;
  /** Shown on the right on hover, e.g. "⌘K". */
  shortcut?: string;
  /** Always shown on the right, e.g. an unread count. On the collapsed rail it becomes a dot. */
  badge?: ReactNode;
  /** A second, smaller line under the label. */
  description?: ReactNode;
  /** Row actions (a `…` button, say), shown on hover and focus, outside the link so they can be buttons. Hidden when collapsed. */
  trailing?: ReactNode;
  /** Native tooltip on the row. Without it, the label shows as a tooltip only while it is cut off by `…`. */
  title?: string;
  className?: string;
  /** Any `data-*` attribute goes on the row's `<li>`, e.g. `data-testid`. */
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
}

const iconSize = "[&_svg]:size-(--chat-sidebar-icon-size,1rem) [&_svg]:shrink-0";

/**
 * A nav row: icon and label; just the icon with a tooltip when collapsed. Closes the drawer when picked.
 * Icons are 1rem, or `--chat-sidebar-icon-size`.
 */
export function SidebarItem({ icon, label, onPress, href, active, shortcut, badge, description, trailing, title, className: extra, ...rest }: SidebarItemProps) {
  const { collapsed, dismiss } = useSidebar();
  const data = Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith("data-")));
  const hasTrailing = !collapsed && trailing != null;
  const className = clsx(
    "group flex min-h-8 cursor-pointer items-center gap-2.5 rounded-chat-sm text-left text-(length:--chat-ui-font-size) leading-5 text-chat-fg outline-none [@media(pointer:coarse)]:min-h-10",
    "data-hovered:bg-chat-hover data-pressed:bg-chat-selected data-focus-visible:ring-2 data-focus-visible:ring-chat-focus",
    iconSize,
    collapsed ? "relative w-9 justify-center [@media(pointer:coarse)]:w-10" : "w-full px-2",
    description && !collapsed && "py-1",
    hasTrailing && "group-hover/item:pr-9 group-focus-within/item:pr-9 [@media(hover:none)]:pr-10",
    active && "bg-chat-selected",
  );
  const press = () => {
    onPress?.();
    dismiss();
  };
  // Only a label that is actually cut off gets a tooltip.
  const showIfCut = (e: PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.title = el.scrollWidth > el.clientWidth ? label : "";
  };
  const content = (
    <>
      {icon}
      {collapsed ? (
        <span className="sr-only">
          {label}
          {(typeof badge === "string" || typeof badge === "number") && ` (${badge})`}
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate" onPointerEnter={title ? undefined : showIfCut}>{label}</span>
          {description && <span className="truncate text-(length:--chat-ui-font-size-sm) leading-4 text-chat-muted">{description}</span>}
        </span>
      )}
      {!collapsed && shortcut && <kbd className="font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle opacity-0 group-data-hovered:opacity-100">{shortcut}</kbd>}
      {!collapsed && badge != null && <span className="shrink-0 text-(length:--chat-ui-font-size-sm) leading-4 text-chat-muted tabular-nums">{badge}</span>}
      {collapsed && badge != null && <span aria-hidden className="absolute top-1 right-1 size-2 rounded-full bg-chat-accent" />}
    </>
  );
  const common = { className, onPress: press, "aria-current": active ? ("page" as const) : undefined, ...(title && { title }) };
  const control = href ? <Link {...common} href={href}>{content}</Link> : <AriaButton {...common}>{content}</AriaButton>;
  return (
    <li {...data} className={clsx("group/item relative list-none", extra)}>
      {collapsed ? <Tooltip content={label} placement="right">{control}</Tooltip> : control}
      {hasTrailing && (
        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 [@media(hover:none)]:opacity-100">
          {trailing}
        </div>
      )}
    </li>
  );
}

export interface SidebarUserProps {
  name: string;
  /** Second line, e.g. the plan. */
  detail?: ReactNode;
  /** Image URL; initials otherwise. */
  avatarUrl?: string;
  /** Opens upward from the row, e.g. settings and log out. */
  menu?: ReactNode;
  /** Passed to the menu's popover, e.g. `{ width: "trigger" }` to match the row's width, or a different `placement`. */
  popoverProps?: Omit<PopoverProps, "children">;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/** The account row at the bottom: avatar, name, plan, and a menu. */
export function SidebarUser({ name, detail, avatarUrl, menu, popoverProps }: SidebarUserProps) {
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
      <Popover placement="top start" {...popoverProps}>{menu}</Popover>
    </MenuTrigger>
  );
}
