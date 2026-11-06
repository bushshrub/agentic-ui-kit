import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CodeBlock } from "./code-block";

afterEach(cleanup);

it("copies the whole block from a boxed code block; a plain one has no button", () => {
  const writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  const code = "const a = 1;\nconst b = 2;";
  const { rerender } = render(<CodeBlock variant="boxed" language="ts" code={code} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenCalledWith(code);
  rerender(<CodeBlock variant="plain" code={code} />);
  expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
});
