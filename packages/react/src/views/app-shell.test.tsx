import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { Sidebar, SidebarItem, SidebarList } from "./sidebar";

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

const aside = () => document.querySelector("aside") as HTMLElement;
const shell = (props: Partial<React.ComponentProps<typeof AppShell>> = {}) =>
  render(
    <AppShell defaultCollapsed={false} sidebar={<Sidebar brand="App" nav={<SidebarItem icon={<i />} label="Home" />} />} {...props}>
      page
    </AppShell>,
  );

it("window scroll mode lets the page grow and sticks the sidebar", () => {
  shell({ scroll: "window" });
  expect(aside().className).toContain("sticky");
  expect((aside().parentElement as HTMLElement).className).not.toContain("overflow-hidden");
});

it("collapsed is controlled and reports requests", () => {
  const onCollapsedChange = vi.fn();
  const { rerender } = shell({ collapsed: false, onCollapsedChange });
  fireEvent.click(screen.getByRole("button", { name: /Collapse sidebar/ }));
  expect(onCollapsedChange).toHaveBeenCalledWith(true);
  // The parent did not change the prop, so the sidebar stays open.
  expect(screen.getByRole("button", { name: /Collapse sidebar/ })).toBeTruthy();
  rerender(
    <AppShell collapsed sidebar={<Sidebar />}>
      page
    </AppShell>,
  );
  expect(screen.getByRole("button", { name: /Expand sidebar/ })).toBeTruthy();
});

it("the toggle names its shortcut and the shortcut toggles", () => {
  const onCollapsedChange = vi.fn();
  shell({ onCollapsedChange });
  const mac = /mac/i.test(navigator.platform || navigator.userAgent);
  expect(screen.getByRole("button", { name: mac ? "Collapse sidebar (⌘ B)" : "Collapse sidebar (Ctrl B)" })).toBeTruthy();
  act(() => {
    fireEvent.keyDown(window, { key: "b", metaKey: mac, ctrlKey: !mac });
  });
  expect(onCollapsedChange).toHaveBeenCalledWith(true);
});

it("shortcut={false} turns the key and the hint off", () => {
  const onCollapsedChange = vi.fn();
  shell({ shortcut: false, onCollapsedChange });
  fireEvent.keyDown(window, { key: "b", metaKey: true, ctrlKey: true });
  expect(onCollapsedChange).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy();
});

it("resizes with arrow keys within the limits, reports and persists the width", () => {
  const onWidthChange = vi.fn();
  shell({ resizable: { min: 200, max: 320 }, defaultWidth: 300, onWidthChange, persistKey: "w" });
  const handle = screen.getByRole("separator");
  expect(handle.getAttribute("aria-valuenow")).toBe("300");
  fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
  expect(onWidthChange).toHaveBeenLastCalledWith(320);
  expect(window.localStorage.getItem("w")).toBe("320");
  expect(aside().style.getPropertyValue("--chat-sidebar-width")).toBe("320px");
  fireEvent.keyDown(screen.getByRole("separator"), { key: "Home" });
  expect(onWidthChange).toHaveBeenLastCalledWith(200);
});

it("restores the persisted width and hides the handle on the rail", () => {
  window.localStorage.setItem("w", "250");
  const { unmount } = shell({ resizable: { min: 200, max: 320 }, persistKey: "w" });
  expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe("250");
  unmount();
  shell({ resizable: { min: 200, max: 320 }, collapsed: true });
  expect(screen.queryByRole("separator")).toBeNull();
});

it("a collapsed rail shows railActions but not headerActions", () => {
  shell({
    collapsed: true,
    sidebar: <Sidebar headerActions={<button>Mode</button>} railActions={<button>Bell</button>} />,
  });
  expect(screen.getByRole("button", { name: "Bell" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Mode" })).toBeNull();
});

it("SidebarItem shows badge, description, trailing, title and data attributes", () => {
  render(
    <AppShell defaultCollapsed={false} sidebar={<SidebarList><SidebarItem icon={<i />} label="Inbox" badge={3} description="Unread" trailing={<button>More</button>} data-testid="row" /></SidebarList>}>
      x
    </AppShell>,
  );
  const li = screen.getByTestId("row");
  expect(li.tagName).toBe("LI");
  expect(li.className).toContain("list-none");
  expect(screen.getByText("3")).toBeTruthy();
  expect(screen.getByText("Unread")).toBeTruthy();
  expect(screen.getByRole("button", { name: "More" })).toBeTruthy();
});

it("SidebarItem on the rail keeps the badge in its accessible name and drops trailing", () => {
  render(
    <AppShell collapsed sidebar={<SidebarList><SidebarItem icon={<i />} label="Inbox" badge={3} trailing={<button>More</button>} /></SidebarList>}>
      x
    </AppShell>,
  );
  expect(screen.getByRole("button", { name: "Inbox (3)" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "More" })).toBeNull();
});
