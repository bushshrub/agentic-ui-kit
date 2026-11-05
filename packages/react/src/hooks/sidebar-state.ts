import { createContext, useContext, useSyncExternalStore } from "react";

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
}

export const SidebarContext = createContext<SidebarState>({ collapsed: false, drawer: false, drawerOpen: false, toggle: () => {}, dismiss: () => {} });

export const useSidebar = () => useContext(SidebarContext);

