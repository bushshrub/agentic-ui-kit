import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Button, IconButton } from "./button";

afterEach(cleanup);

it("lets the caller's size classes win over the kit's", () => {
  render(<Button className="h-12">Go</Button>);
  render(<IconButton label="Close" className="size-12">x</IconButton>);
  const go = screen.getByRole("button", { name: "Go" });
  expect(go.className).toContain("h-12");
  expect(go.className).not.toContain("h-8");
  expect(go.className).toContain("justify-center");
  const close = screen.getByRole("button", { name: "Close" });
  expect(close.className).toContain("size-12");
  expect(close.className).not.toContain("size-8");
});

it.each([
  ["Button", (p: object) => <Button isDisabled disabledReason="Fill in the title" {...p}>Submit</Button>, "Submit"],
  ["IconButton", (p: object) => <IconButton label="Submit" isDisabled disabledReason="Fill in the title" {...p}>x</IconButton>, "Submit"],
])("%s with a disabledReason stays focusable, not activatable, and exposes the reason", async (_n, make, name) => {
  const user = userEvent.setup();
  const onPress = vi.fn();
  const onSubmit = vi.fn((e: Event) => e.preventDefault());
  render(
    <form onSubmit={onSubmit as never}>
      {make({ onPress, type: "submit" })}
    </form>,
  );
  const button = screen.getByRole("button", { name });
  expect(button.getAttribute("aria-disabled")).toBe("true");
  expect(button.hasAttribute("disabled")).toBe(false);
  expect(button.getAttribute("aria-describedby")).toBeTruthy();
  expect(document.getElementById(button.getAttribute("aria-describedby")!)!.textContent).toBe("Fill in the title");

  await user.tab();
  expect(document.activeElement).toBe(button);
  expect(await screen.findByRole("tooltip")).toHaveProperty("textContent", "Fill in the title");

  await user.click(button);
  await user.keyboard("{Enter}");
  expect(onPress).not.toHaveBeenCalled();
  expect(onSubmit).not.toHaveBeenCalled();
});

it("without a reason, a disabled button is natively disabled", () => {
  render(<Button isDisabled disabledReason={undefined}>Submit</Button>);
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
});

it("an enabled button ignores disabledReason", () => {
  const onPress = vi.fn();
  render(<Button disabledReason="nope" onPress={onPress}>Go</Button>);
  fireEvent.click(screen.getByRole("button"));
  expect(onPress).toHaveBeenCalled();
});
