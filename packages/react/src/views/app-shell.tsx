import { clsx } from "clsx";
import { useIcons } from "../primitives/icons";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DRAWER_QUERY, NARROW_QUERY, SidebarContext, isMacPlatform, useControllable, useMediaQuery, useSidebar, type SidebarState } from "../hooks/sidebar-state";
import { IconButton } from "../primitives/button";
import { useLabels } from "../primitives/labels";
import { Drawer } from "../primitives/overlay";

export interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  /** Defaults to collapsed below 1024px. Only the initial value; use `collapsed` to control it. */
  defaultCollapsed?: boolean;
  /** Controls whether the pinned sidebar is the icon rail. Pair with `onCollapsedChange`. */
  collapsed?: boolean;
  /** Called with the new value when the user collapses or expands the pinned sidebar (button or shortcut). */
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Where the page scrolls. `"inner"` (default): the shell is exactly the window tall and `main` scrolls inside.
   * `"window"`: the shell grows with its content, the window scrolls (sticky headers and `position: sticky` in the
   * page keep working) and the sidebar sticks to the top at window height.
   */
  scroll?: "inner" | "window";
  /**
   * Lets the user drag the sidebar's right edge (or use the arrow keys on it) to change its width, in px.
   * Without it the width is `--chat-sidebar-width`.
   */
  resizable?: { min: number; max: number };
  /** Controls the width in px while `resizable`. Pair with `onWidthChange`. */
  width?: number;
  /** Initial width in px while `resizable`, 288 (18rem) otherwise. */
  defaultWidth?: number;
  /** Called with the width in px when a drag ends or a key changes it (not on every pointer move). */
  onWidthChange?: (width: number) => void;
  /** Keeps the width in localStorage under this key, so it survives reloads. */
  persistKey?: string;
  /** Cmd+B (Ctrl+B off Apple platforms) toggles the sidebar. Default true. */
  shortcut?: boolean;
  className?: string;
}

const DEFAULT_WIDTH = 288;
const KEY_STEP = 16;
const clampWidth = (px: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(px)));

function readStoredWidth(key: string | undefined): number | undefined {
  if (!key) return undefined;
  try {
    const n = Number(window.localStorage.getItem(key));
    return n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A page with a sidebar: pinned and collapsible to an icon rail from tablet width up, a drawer over the
 * content on phones. Children get `useSidebar()` and `<SidebarToggle>`.
 */
export function AppShell({
  sidebar,
  children,
  defaultCollapsed,
  collapsed: collapsedProp,
  onCollapsedChange,
  scroll = "inner",
  resizable,
  width: widthProp,
  defaultWidth,
  onWidthChange,
  persistKey,
  shortcut = true,
  className,
}: AppShellProps) {
  const drawer = useMediaQuery(DRAWER_QUERY);
  const labels = useLabels();
  const [collapsed, setCollapsed] = useControllable(
    collapsedProp,
    () => defaultCollapsed ?? (typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches),
    onCollapsedChange,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggle = useCallback(() => (drawer ? setDrawerOpen((o) => !o) : setCollapsed((c) => !c)), [drawer, setCollapsed]);
  const dismiss = useCallback(() => setDrawerOpen(false), []);

  const min = resizable?.min ?? 0;
  const max = resizable?.max ?? Infinity;
  const [rawWidth, setWidth] = useControllable(
    widthProp,
    () => readStoredWidth(persistKey) ?? defaultWidth ?? DEFAULT_WIDTH,
    (px) => {
      if (persistKey) {
        try {
          window.localStorage.setItem(persistKey, String(px));
        } catch {
          /* storage unavailable: the width just isn't kept */
        }
      }
      onWidthChange?.(px);
    },
  );
  const width = resizable ? clampWidth(rawWidth, min, max) : undefined;

  const shortcutKeys = shortcut ? `${isMacPlatform() ? "⌘" : labels.ctrlKey} B` : undefined;
  useEffect(() => {
    if (!shortcut) return;
    const mac = isMacPlatform();
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.shiftKey || e.key.toLowerCase() !== "b") return;
      if (mac ? !e.metaKey || e.ctrlKey : !e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, toggle]);

  const pinned = useMemo<SidebarState>(
    () => ({ collapsed, drawer, drawerOpen, toggle, dismiss, ...(shortcutKeys && { shortcut: shortcutKeys }) }),
    [collapsed, drawer, drawerOpen, toggle, dismiss, shortcutKeys],
  );
  // Inside the drawer the sidebar is always full width.
  const inDrawer = useMemo<SidebarState>(() => ({ ...pinned, collapsed: false }), [pinned]);
  const windowScroll = scroll === "window";

  return (
    <SidebarContext.Provider value={pinned}>
      <div className={clsx("flex bg-chat-bg text-chat-fg", windowScroll ? "min-h-dvh" : "h-dvh overflow-hidden", className)}>
        {!drawer && (
          <aside
            style={width ? ({ "--chat-sidebar-width": `${width}px` } as CSSProperties) : undefined}
            className={clsx(
              "relative shrink-0 border-r border-chat-divider bg-chat-sidebar transition-[width] duration-200 ease-out motion-reduce:transition-none data-resizing:transition-none",
              windowScroll ? "sticky top-0 h-dvh self-start overflow-clip" : "overflow-hidden",
              collapsed ? "w-13" : "w-(--chat-sidebar-width,18rem)",
            )}
          >
            {sidebar}
            {resizable && !collapsed && width && <ResizeHandle width={width} min={min} max={max} onCommit={setWidth} />}
          </aside>
        )}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
      {drawer && (
        <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen} aria-label={labels.sidebar}>
          <SidebarContext.Provider value={inDrawer}>{sidebar}</SidebarContext.Provider>
        </Drawer>
      )}
    </SidebarContext.Provider>
  );
}

/** The draggable right edge of the sidebar. A drag moves the aside's width variable alone and commits on release. */
function ResizeHandle({ width, min, max, onCommit }: { width: number; min: number; max: number; onCommit: (px: number) => void }) {
  const labels = useLabels();
  const live = useRef<number | null>(null);
  const aside = (el: HTMLElement) => el.closest("aside") as HTMLElement;
  const move = (el: HTMLElement, px: number) => {
    live.current = clampWidth(px, min, max);
    aside(el).style.setProperty("--chat-sidebar-width", `${live.current}px`);
  };
  const end = (el: HTMLElement) => {
    delete aside(el).dataset.resizing;
    if (live.current != null) onCommit(live.current);
    live.current = null;
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={labels.resizeSidebar}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className="group/handle absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none outline-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        aside(e.currentTarget).dataset.resizing = "";
        live.current = null;
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.currentTarget, e.clientX - aside(e.currentTarget).getBoundingClientRect().left);
      }}
      onPointerUp={(e) => end(e.currentTarget)}
      onPointerCancel={(e) => end(e.currentTarget)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
        const next = e.key === "ArrowLeft" ? width - step : e.key === "ArrowRight" ? width + step : e.key === "Home" ? min : e.key === "End" ? max : null;
        if (next == null) return;
        e.preventDefault();
        onCommit(clampWidth(next, min, max));
      }}
    >
      <span className="absolute inset-y-0 right-0 w-px bg-transparent transition-colors group-hover/handle:bg-chat-border-strong group-focus-visible/handle:w-0.5 group-focus-visible/handle:bg-chat-focus in-data-resizing:bg-chat-focus" />
    </div>
  );
}

export interface SidebarToggleProps {
  /** Render only when the sidebar is a drawer, e.g. in the chat header. */
  drawerOnly?: boolean;
  className?: string;
}

/** Opens the drawer on phones, collapses / expands the pinned sidebar elsewhere. Its label names the shortcut, e.g. "(⌘ B)". */
export function SidebarToggle({ drawerOnly = false, className }: SidebarToggleProps) {
  const icons = useIcons();
  const { drawer, drawerOpen, collapsed, toggle, shortcut } = useSidebar();
  const labels = useLabels();
  if (drawerOnly && !drawer) return null;
  const label = drawer
    ? drawerOpen
      ? labels.closeSidebar
      : labels.openSidebar
    : collapsed
      ? labels.expandSidebar
      : labels.collapseSidebar;
  return (
    <IconButton label={shortcut ? labels.withShortcut(label, shortcut) : label} onPress={toggle} className={className}>
      {icons.sidebar}
    </IconButton>
  );
}
