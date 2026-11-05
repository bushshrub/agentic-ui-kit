import { clsx } from "clsx";
import { PanelLeft } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { DRAWER_QUERY, NARROW_QUERY, SidebarContext, useMediaQuery, useSidebar, type SidebarState } from "../hooks/sidebar-state";
import { IconButton } from "../primitives/button";
import { Drawer } from "../primitives/overlay";

export interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  /** Defaults to collapsed below 1024px. */
  defaultCollapsed?: boolean;
  className?: string;
}

/**
 * A page with a sidebar: pinned and collapsible to an icon rail from tablet width up, a drawer over the
 * content on phones. Children get `useSidebar()` and `<SidebarToggle>`.
 */
export function AppShell({ sidebar, children, defaultCollapsed, className }: AppShellProps) {
  const drawer = useMediaQuery(DRAWER_QUERY);
  const [collapsed, setCollapsed] = useState(() => defaultCollapsed ?? (typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggle = useCallback(() => (drawer ? setDrawerOpen((o) => !o) : setCollapsed((c) => !c)), [drawer]);
  const dismiss = useCallback(() => setDrawerOpen(false), []);

  const pinned = useMemo<SidebarState>(() => ({ collapsed, drawer, drawerOpen, toggle, dismiss }), [collapsed, drawer, drawerOpen, toggle, dismiss]);
  // Inside the drawer the sidebar is always full width.
  const inDrawer = useMemo<SidebarState>(() => ({ ...pinned, collapsed: false }), [pinned]);

  return (
    <SidebarContext.Provider value={pinned}>
      <div className={clsx("flex h-dvh overflow-hidden bg-chat-bg text-chat-fg", className)}>
        {!drawer && (
          <aside
            className={clsx(
              "shrink-0 overflow-hidden border-r border-chat-divider bg-chat-sidebar transition-[width] duration-200 ease-out motion-reduce:transition-none",
              collapsed ? "w-13" : "w-(--chat-sidebar-width,18rem)",
            )}
          >
            {sidebar}
          </aside>
        )}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
      {drawer && (
        <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen} aria-label="Sidebar">
          <SidebarContext.Provider value={inDrawer}>{sidebar}</SidebarContext.Provider>
        </Drawer>
      )}
    </SidebarContext.Provider>
  );
}

export interface SidebarToggleProps {
  /** Render only when the sidebar is a drawer, e.g. in the chat header. */
  drawerOnly?: boolean;
  className?: string;
}

/** Opens the drawer on phones, collapses / expands the pinned sidebar elsewhere. */
export function SidebarToggle({ drawerOnly = false, className }: SidebarToggleProps) {
  const { drawer, drawerOpen, collapsed, toggle } = useSidebar();
  if (drawerOnly && !drawer) return null;
  const label = drawer ? (drawerOpen ? "Close sidebar" : "Open sidebar") : collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <IconButton label={label} onPress={toggle} className={className}>
      <PanelLeft />
    </IconButton>
  );
}
