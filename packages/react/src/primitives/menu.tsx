import { clsx } from "clsx";
import { useIcons, IconSlot } from "./icons";
import type { ReactNode } from "react";
import {
  Autocomplete,
  Header,
  Input,
  SearchField,
  useFilter,
  Keyboard,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  Popover as AriaPopover,
  Separator,
  Text,
  type MenuItemProps as AriaMenuItemProps,
  type MenuProps as AriaMenuProps,
  type PopoverProps as AriaPopoverProps,
  type Key,
  type Selection,
} from "react-aria-components";

export { MenuTrigger, SubmenuTrigger } from "react-aria-components";

export interface MenuSearchProps {
  placeholder: string;
  /** A `Menu`; its items are filtered by what the user types. */
  children: ReactNode;
  /** Controlled search text, e.g. to offer "Create <text>". */
  value?: string;
  onChange?: (value: string) => void;
}

/** A search box above a menu that filters its items, like "Search or create a project". */
export function MenuSearch({ placeholder, children, value, onChange }: MenuSearchProps) {
  const { contains } = useFilter({ sensitivity: "base" });
  return (
    <Autocomplete
      filter={contains}
      {...(value !== undefined && { inputValue: value })}
      {...(onChange && { onInputChange: onChange })}
    >
      <SearchField aria-label={placeholder} autoFocus className="border-b border-chat-popover-border">
        <Input
          placeholder={placeholder}
          className="w-full bg-transparent px-3.5 py-2.5 text-(length:--chat-ui-font-size) leading-5 text-chat-fg outline-none placeholder:text-chat-subtle"
        />
      </SearchField>
      {children}
    </Autocomplete>
  );
}

export interface PopoverProps extends Omit<AriaPopoverProps, "className"> {
  className?: string;
}

/** Floating panel for menus and pickers: surface color, rounded, soft shadow, fades in. */
export function Popover({ className, offset = 6, ...props }: PopoverProps) {
  return (
    <AriaPopover
      offset={offset}
      {...props}
      className={clsx(
        "rounded-chat-popover border border-chat-popover-border bg-chat-popover font-chat-sans text-chat-fg shadow-chat-popover outline-none",
        "motion-safe:data-entering:animate-chat-in motion-safe:data-exiting:animate-chat-out",
        className,
      )}
    />
  );
}

export interface MenuProps<T> extends Omit<AriaMenuProps<T>, "className"> {
  className?: string;
}

export function Menu<T extends object>({ className, ...props }: MenuProps<T>) {
  return <AriaMenu {...props} className={clsx("max-h-[inherit] min-w-52 overflow-auto p-1.5 outline-none", className)} />;
}

export interface MenuItemProps extends Omit<AriaMenuItemProps, "className" | "children"> {
  children: ReactNode;
  icon?: ReactNode;
  /** Second line under the label ("For complex work and everyday tasks"). */
  description?: ReactNode;
  /** Right-aligned detail: the current value of a submenu ("Medium") or a badge. */
  detail?: ReactNode;
  /** Keyboard shortcut shown on the right ("⌘U", "P"). */
  shortcut?: string;
  /** "danger" colors the item red, for Delete. */
  tone?: "default" | "danger";
  className?: string;
}

export function MenuItem({ children, icon, description, detail, shortcut, tone = "default", className, ...props }: MenuItemProps) {
  const icons = useIcons();
  const textValue = props.textValue ?? (typeof children === "string" ? children : undefined);
  return (
    <AriaMenuItem
      {...props}
      {...(textValue !== undefined && { textValue })}
      className={clsx(
        "group flex min-h-7 cursor-pointer items-center gap-2.5 rounded-chat-sm px-2 py-1 text-(length:--chat-ui-font-size) leading-5 text-chat-fg outline-none select-none",
        "data-focused:bg-chat-popover-hover data-open:bg-chat-popover-hover data-disabled:opacity-40",
        tone === "danger" && "text-chat-danger",
        className,
      )}
    >
      {({ isSelected, hasSubmenu, selectionMode }) => (
        <>
          {icon && (
            <span className={clsx("flex size-4 shrink-0 items-center [&_svg]:size-4", tone === "danger" ? "text-chat-danger" : "text-chat-fg")}>
              {icon}
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <Text slot="label" className="truncate">
              {children}
            </Text>
            {description && (
              <Text slot="description" className="text-(length:--chat-ui-font-size-sm) leading-4 text-chat-muted">
                {description}
              </Text>
            )}
          </span>
          {detail && <span className="shrink-0 text-(length:--chat-ui-font-size) leading-5 text-chat-muted">{detail}</span>}
          {shortcut && <Keyboard className="shrink-0 font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle">{shortcut}</Keyboard>}
          {selectionMode !== "none" && isSelected && <IconSlot className="text-chat-check [&_svg]:size-4">{icons.check}</IconSlot>}
          {hasSubmenu && <IconSlot className="text-chat-muted [&_svg]:size-4">{icons.submenu}</IconSlot>}
        </>
      )}
    </AriaMenuItem>
  );
}

export interface MenuSectionProps {
  children: ReactNode;
  title?: ReactNode;
  /** A section can hold its own selection, e.g. the model list above action items. */
  selectionMode?: "single" | "multiple";
  selectedKeys?: Iterable<Key>;
  defaultSelectedKeys?: Iterable<Key>;
  onSelectionChange?: (keys: Selection) => void;
}

export function MenuSection({ title, children, ...selection }: MenuSectionProps) {
  return (
    <AriaMenuSection {...selection} className="[&:not(:first-child)]:mt-1">
      {title && <Header className="px-2 pt-1.5 pb-1 text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle">{title}</Header>}
      {children}
    </AriaMenuSection>
  );
}

export function MenuSeparator() {
  return <Separator className="-mx-1.5 my-1.5 border-t border-chat-popover-border" />;
}

/** Explanatory text inside a menu, above or below the items. Not focusable. */
export function MenuNote({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("px-2 py-1.5 text-(length:--chat-ui-font-size) leading-snug text-chat-muted", className)}>{children}</div>;
}
