import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SegmentedControl } from "./segmented-control";

afterEach(cleanup);

it("selects one option and reports the other on press", () => {
  const onChange = vi.fn();
  render(<SegmentedControl label="Mode" value="chat" onChange={onChange} options={[{ id: "chat", label: "Chat" }, { id: "cowork", label: "Cowork" }]} />);
  expect(screen.getByRole("radio", { name: "Chat" }).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("radio", { name: "Cowork" }));
  expect(onChange).toHaveBeenCalledWith("cowork");
});
