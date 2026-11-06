import { cx } from "./cx";
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Button as AriaButton, MenuTrigger } from "react-aria-components";
import { Popover } from "./menu";

export interface ContextMenuProps {
  /** A `<Menu>`; it opens at the pointer. */
  menu: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Opens `menu` at the pointer on right-click, or at the focused element with the Menu key or Shift+F10.
 * Long-press opens it where the browser fires `contextmenu` for touch (Android); give touch users a
 * visible "…" button as well.
 */
export function ContextMenu({ menu, children, className }: ContextMenuProps) {
  const root = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ x: number; y: number }>();

  const openAt = (x: number, y: number) => {
    const box = root.current?.getBoundingClientRect();
    if (box) setAt({ x: x - box.left, y: y - box.top });
  };
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    openAt(e.clientX, e.clientY);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
    e.preventDefault();
    const target = (e.target as HTMLElement).getBoundingClientRect();
    openAt(target.left + 8, target.bottom);
  };

  return (
    <div ref={root} onContextMenu={onContextMenu} onKeyDown={onKeyDown} className={cx("relative", className)}>
      {children}
      <MenuTrigger isOpen={at !== undefined} onOpenChange={(open) => !open && setAt(undefined)}>
        {/* The anchor the menu opens from; not focusable, focus returns to where it was. */}
        <AriaButton aria-hidden excludeFromTabOrder className="pointer-events-none absolute size-0 opacity-0" style={{ left: at?.x ?? 0, top: at?.y ?? 0 }} />
        <Popover placement="bottom start" offset={2}>
          {menu}
        </Popover>
      </MenuTrigger>
    </div>
  );
}
