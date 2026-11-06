import { cx } from "./cx";
import { useIcons, IconSlot } from "./icons";
import { useSyncExternalStore, type ReactNode } from "react";
import {
  Autocomplete,
  Header,
  Modal as AriaModal,
  ModalOverlay,
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

import { DialogTrigger } from "react-aria-components";

export { MenuTrigger, SubmenuTrigger, DialogTrigger } from "react-aria-components";

/**
 * Wraps a trigger button and a kit `Popover` (or `Modal`) so that pressing the button toggles it, without
 * importing react-aria. The same component as `DialogTrigger`; use whichever name reads better.
 */
export const PopoverTrigger = DialogTrigger;

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

/** Viewport narrower than `max` px. False on the server and where `matchMedia` is missing. */
function useNarrower(max: number | false): boolean {
  const query = max === false ? null : `(max-width: ${max - 0.02}px)`;
  return useSyncExternalStore(
    (notify) => {
      if (!query || typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => (query && typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export interface PopoverProps extends Omit<AriaPopoverProps, "className"> {
  className?: string;
  /**
   * Below this viewport width (px, default 768) the popover opens as a bottom sheet over a dimmed page instead
   * of floating at the trigger; keyboard, focus and dismissing work the same. `false` always floats. Placement
   * props are ignored in the sheet.
   */
  sheet?: number | false;
  /** "trigger" makes the popover as wide as its trigger (react-aria's `--trigger-width`). Default "auto". */
  width?: "auto" | "trigger";
  /** When floating on a phone (`sheet={false}`), stretch to the viewport width. */
  fullWidthOnPhones?: boolean;
}

/** Floating panel for menus and pickers: surface color, rounded, soft shadow, fades in. On phones it's a bottom sheet. */
export function Popover({ className, offset = 6, sheet = 768, width = "auto", fullWidthOnPhones, children, ...props }: PopoverProps) {
  const asSheet = useNarrower(sheet);
  if (asSheet) {
    const { isOpen, onOpenChange } = props;
    return (
      <ModalOverlay
        {...(isOpen !== undefined && { isOpen })}
        {...(onOpenChange && { onOpenChange })}
        isDismissable
        className="fixed inset-0 z-50 flex items-end bg-(--chat-backdrop) data-entering:animate-chat-fade-in data-exiting:animate-chat-fade-out"
      >
        <AriaModal
          className={cx(
            "flex max-h-[85dvh] w-full flex-col overflow-auto rounded-t-chat-lg border-t border-chat-popover-border bg-chat-popover pb-[env(safe-area-inset-bottom)] font-chat-sans text-chat-fg shadow-chat-popover outline-none",
            "data-entering:animate-chat-sheet-in data-exiting:animate-chat-sheet-out",
            className,
          )}
        >
          {typeof children === "function"
            ? children({ placement: "bottom", trigger: null, isEntering: false, isExiting: false, defaultChildren: undefined })
            : children}
        </AriaModal>
      </ModalOverlay>
    );
  }
  return (
    <AriaPopover
      offset={offset}
      {...props}
      className={cx(
        "rounded-chat-popover border border-chat-popover-border bg-chat-popover font-chat-sans text-chat-fg shadow-chat-popover outline-none",
        "motion-safe:data-entering:animate-chat-in motion-safe:data-exiting:animate-chat-out",
        width === "trigger" && "w-(--trigger-width) [&_[role=menu]]:min-w-0",
        fullWidthOnPhones && "max-sm:w-[calc(100vw-1.5rem)]",
        className,
      )}
    >
      {children}
    </AriaPopover>
  );
}

export interface MenuProps<T> extends Omit<AriaMenuProps<T>, "className"> {
  className?: string;
}

export function Menu<T extends object>({ className, ...props }: MenuProps<T>) {
  return <AriaMenu {...props} className={cx("max-h-[inherit] min-w-52 overflow-auto p-1.5 outline-none", className)} />;
}

export interface MenuItemProps extends Omit<AriaMenuItemProps, "className" | "children"> {
  children: ReactNode;
  icon?: ReactNode;
  /** Second line under the label ("For complex work and everyday tasks"). */
  description?: ReactNode;
  /** "below" (default) puts the description under the label; "beside" puts it after it on one line. */
  descriptionPlacement?: "below" | "beside";
  /** Right-aligned detail: the current value of a submenu ("Medium") or a badge. */
  detail?: ReactNode;
  /** Keyboard shortcut shown on the right ("⌘U", "P"). */
  shortcut?: string;
  /** "danger" colors the item red, for Delete. */
  tone?: "default" | "danger";
  /** In a selection menu, how the selected state shows: a "check" mark (default) or an on/off "switch" for settings rows. */
  indicator?: "check" | "switch";
  className?: string;
}

export function MenuItem({ children, icon, description, descriptionPlacement = "below", detail, shortcut, tone = "default", indicator = "check", className, ...props }: MenuItemProps) {
  const icons = useIcons();
  const textValue = props.textValue ?? (typeof children === "string" ? children : undefined);
  return (
    <AriaMenuItem
      {...props}
      {...(textValue !== undefined && { textValue })}
      className={cx(
        "group flex min-h-7 cursor-pointer items-center gap-2.5 rounded-chat-sm px-2 py-1 text-(length:--chat-ui-font-size) leading-5 text-chat-fg outline-none select-none",
        "data-focused:bg-chat-popover-hover data-open:bg-chat-popover-hover data-disabled:opacity-40",
        tone === "danger" && "text-chat-danger",
        className,
      )}
    >
      {({ isSelected, hasSubmenu, selectionMode }) => (
        <>
          {icon && (
            <span className={cx("flex size-4 shrink-0 items-center [&_svg]:size-4", tone === "danger" ? "text-chat-danger" : "text-chat-fg")}>
              {icon}
            </span>
          )}
          <span className={cx("flex min-w-0 flex-1", descriptionPlacement === "beside" ? "items-baseline gap-2" : "flex-col")}>
            <Text slot="label" className={cx("truncate", descriptionPlacement === "beside" && "shrink-0")}>
              {children}
            </Text>
            {description && (
              <Text
                slot="description"
                className={cx(
                  "text-chat-muted",
                  descriptionPlacement === "beside" ? "truncate text-(length:--chat-ui-font-size) leading-5" : "text-(length:--chat-ui-font-size-sm) leading-4",
                )}
              >
                {description}
              </Text>
            )}
          </span>
          {detail && <span className="shrink-0 text-(length:--chat-ui-font-size) leading-5 text-chat-muted">{detail}</span>}
          {shortcut && <Keyboard className="shrink-0 font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle">{shortcut}</Keyboard>}
          {selectionMode !== "none" && indicator === "switch" && (
            <span
              aria-hidden
              data-selected={isSelected || undefined}
              className="relative h-4 w-7 shrink-0 rounded-full bg-chat-border-strong transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-3 after:rounded-full after:bg-chat-bg after:transition-transform data-selected:bg-chat-accent data-selected:after:translate-x-3 data-selected:after:bg-chat-accent-fg"
            />
          )}
          {selectionMode !== "none" && indicator === "check" && isSelected && <IconSlot className="text-chat-check [&_svg]:size-4">{icons.check}</IconSlot>}
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
  return <div className={cx("px-2 py-1.5 text-(length:--chat-ui-font-size) leading-snug text-chat-muted", className)}>{children}</div>;
}
