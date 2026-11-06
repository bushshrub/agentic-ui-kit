import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EffortSlider } from "./effort-slider";

afterEach(cleanup);

const efforts = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium", description: "Balanced" },
  { id: "high", label: "High" },
];

it("shows the current level and moves one stop per arrow key", () => {
  const onChange = vi.fn();
  render(<EffortSlider efforts={efforts} value="medium" onChange={onChange} />);
  const thumb = screen.getByRole("slider");
  expect(thumb.getAttribute("aria-valuetext")).toBe("Medium");
  expect(screen.getByLabelText("Effort")).toBe(thumb);
  expect(screen.getByText("Balanced")).toBeTruthy();
  fireEvent.keyDown(thumb, { key: "ArrowRight" });
  expect(onChange).toHaveBeenCalledWith("high");
});
