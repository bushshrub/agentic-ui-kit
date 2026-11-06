import { createContext, useCallback, useContext, useRef, useState, useSyncExternalStore } from "react";

/* Sidebar state shared by AppShell (provides it) and anything inside it (ChatList, SidebarItem). */

/** Below this width the sidebar is a drawer over the content (phones). */
export const DRAWER_QUERY = "(max-width: 767.98px)";
/** Below this width a pinned sidebar starts collapsed (tablet portrait). */
export const NARROW_QUERY = "(max-width: 1023.98px)";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export interface SidebarState {
  /** Pinned sidebar shows only icons. */
  collapsed: boolean;
  /** The sidebar is a drawer (small screens). */
  drawer: boolean;
  drawerOpen: boolean;
  /** Collapses / expands the pinned sidebar, or opens / closes the drawer. */
  toggle: () => void;
  /** Closes the drawer after a pick; does nothing for a pinned sidebar. */
  dismiss: () => void;
  /** The keyboard shortcut that toggles the sidebar, e.g. "⌘ B"; unset when the shell's shortcut is off. */
  shortcut?: string;
}

export const SidebarContext = createContext<SidebarState>({ collapsed: false, drawer: false, drawerOpen: false, toggle: () => {}, dismiss: () => {} });

export const useSidebar = () => useContext(SidebarContext);


/** State that the parent may own: `value` makes it controlled, otherwise `initial` seeds it. */
export function useControllable<T>(value: T | undefined, initial: () => T, onChange?: (next: T) => void): [T, (next: T | ((prev: T) => T)) => void] {
  const [inner, setInner] = useState(initial);
  const current = value ?? inner;
  const latest = useRef({ current, value, onChange });
  latest.current = { current, value, onChange };
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const { current, value, onChange } = latest.current;
    const resolved = typeof next === "function" ? (next as (prev: T) => T)(current) : next;
    if (resolved === current) return;
    if (value === undefined) setInner(resolved);
    onChange?.(resolved);
  }, []);
  return [current, set];
}

/** True on Apple platforms, where the shortcut modifier is ⌘ instead of Ctrl. */
export const isMacPlatform = () => typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
