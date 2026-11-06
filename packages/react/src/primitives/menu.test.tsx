import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Menu, MenuItem, MenuTrigger, Popover, PopoverTrigger } from "./menu";
import { Button } from "./button";
import { Dialog } from "react-aria-components";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubWidth(narrow: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: narrow && query.startsWith("(max-width"),
    addEventListener() {},
    removeEventListener() {},
  }));
}

const selectMenu = (indicator?: "switch") => (
  <MenuTrigger>
    <Button>Open</Button>
    <Popover>
      <Menu selectionMode="multiple" defaultSelectedKeys={["a"]}>
        <MenuItem id="a" {...(indicator && { indicator })}>A</MenuItem>
        <MenuItem id="b" {...(indicator && { indicator })}>B</MenuItem>
      </Menu>
    </Popover>
  </MenuTrigger>
);

it("shows a check mark only on selected items", async () => {
  render(selectMenu());
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  const [a, b] = screen.getAllByRole("menuitemcheckbox");
  expect(a!.querySelector("svg")).not.toBeNull();
  expect(b!.querySelector("svg")).toBeNull();
});

it("indicator=switch draws a switch instead of the check", async () => {
  render(selectMenu("switch"));
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  const [a, b] = screen.getAllByRole("menuitemcheckbox");
  expect(a!.querySelector("svg")).toBeNull();
  expect(a!.querySelector("[data-selected]")).not.toBeNull();
  expect(b!.querySelector("[data-selected]")).toBeNull();
  expect(b!.querySelector("span[aria-hidden]")).not.toBeNull();
});

it("width=trigger and a caller className apply to the popover", async () => {
  render(
    <MenuTrigger>
      <Button>Open</Button>
      <Popover width="trigger" className="w-40">
        <Menu><MenuItem>A</MenuItem></Menu>
      </Popover>
    </MenuTrigger>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  const cls = screen.getByRole("menu").parentElement!.className;
  expect(cls).toContain("w-40");
  expect(cls).not.toContain("--trigger-width)");
});

it("width=trigger sets the trigger-width width", async () => {
  render(
    <MenuTrigger>
      <Button>Open</Button>
      <Popover width="trigger"><Menu><MenuItem>A</MenuItem></Menu></Popover>
    </MenuTrigger>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(screen.getByRole("menu").parentElement!.className).toContain("w-(--trigger-width)");
});

it("renders a bottom sheet on a narrow screen that still handles keyboard and Escape", async () => {
  stubWidth(true);
  const user = userEvent.setup();
  const onPick = vi.fn();
  render(
    <MenuTrigger>
      <Button>Open</Button>
      <Popover>
        <Menu onAction={onPick}><MenuItem id="a">A</MenuItem><MenuItem id="b">B</MenuItem></Menu>
      </Popover>
    </MenuTrigger>,
  );
  await user.click(screen.getByRole("button", { name: "Open" }));
  const menu = screen.getByRole("menu");
  expect(menu.closest("[class*=rounded-t-chat-lg]")).not.toBeNull();
  await user.keyboard("{ArrowDown}{Enter}");
  expect(onPick).toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Open", hidden: true }));
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("menu")).toBeNull();
});

it("sheet={false} keeps the floating popover on a narrow screen", async () => {
  stubWidth(true);
  render(
    <MenuTrigger>
      <Button>Open</Button>
      <Popover sheet={false}><Menu><MenuItem>A</MenuItem></Menu></Popover>
    </MenuTrigger>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(screen.getByRole("menu").closest("[class*=rounded-t-chat-lg]")).toBeNull();
});

it("PopoverTrigger opens a kit Popover without importing react-aria", async () => {
  render(
    <PopoverTrigger>
      <Button>Open</Button>
      <Popover><Dialog aria-label="Panel">hello</Dialog></Popover>
    </PopoverTrigger>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(screen.getByRole("dialog", { name: "Panel" })).toBeTruthy();
});
