import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { Tooltip } from "./tooltip";

afterEach(cleanup);

it("works on a plain span: focusable, and the tooltip shows on focus", async () => {
  render(
    <Tooltip content="Full path" delay={0}>
      <span>file.ts</span>
    </Tooltip>,
  );
  expect(screen.getByText("file.ts").getAttribute("tabindex")).toBe("0");
  await userEvent.tab();
  expect(await screen.findByRole("tooltip")).toBeTruthy();
});

