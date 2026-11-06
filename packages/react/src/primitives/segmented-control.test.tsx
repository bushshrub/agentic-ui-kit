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

const two = [{ id: "a", label: "A" }, { id: "b", label: "B" }];

it("clearable: pressing the selected option reports null", () => {
  const onChange = vi.fn();
  render(<SegmentedControl clearable label="Mode" value="a" onChange={onChange} options={two} />);
  fireEvent.click(screen.getByRole("radio", { name: "A" }));
  expect(onChange).toHaveBeenCalledWith(null);
});

it("isDisabled blocks the whole control, and an option can be disabled alone", () => {
  const onChange = vi.fn();
  const { rerender } = render(<SegmentedControl isDisabled label="Mode" value="a" onChange={onChange} options={two} />);
  fireEvent.click(screen.getByRole("radio", { name: "B" }));
  expect(onChange).not.toHaveBeenCalled();
  rerender(<SegmentedControl label="Mode" value="a" onChange={onChange} options={[two[0]!, { ...two[1]!, isDisabled: true }]} />);
  fireEvent.click(screen.getByRole("radio", { name: "B" }));
  expect(onChange).not.toHaveBeenCalled();
});

it("size md makes the buttons taller", () => {
  render(<SegmentedControl size="md" label="Mode" value="a" onChange={() => {}} options={two} />);
  expect(screen.getByRole("radio", { name: "A" }).className).toContain("h-8");
});
