// @vitest-environment jsdom
import { uiComponentSpecs, uiSpecs } from "@agentic-ui-kit/core/visuals";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { uiComponents, uiComponentSet } from "./ui-components";
import { UiComponentsProvider, UiTree } from "./ui-tree";

afterEach(cleanup);

const draw = (root: unknown, components = uiComponents) =>
  render(
    <UiComponentsProvider components={components}>
      <UiTree id="t" root={root} />
    </UiComponentsProvider>,
  );

it("draws each component with the specs core gives the model", () => {
  expect(uiComponents.map(({ render, ...spec }) => spec)).toEqual(uiComponentSpecs);
});

it("draws a table, a badge and a progress bar", () => {
  draw({
    component: "Stack",
    children: [
      { component: "Table", props: { columns: ["Name", "Qty"], rows: [["Tent", 1]] } },
      { component: "Badge", props: { label: "Live" } },
      { component: "Progress", props: { label: "Quota", value: 30, max: 60 } },
    ],
  });
  expect(screen.getByRole("columnheader", { name: "Qty" })).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Tent" })).toBeTruthy();
  expect(screen.getByText("Live")).toBeTruthy();
  expect(screen.getByRole("progressbar", { name: "Quota" }).getAttribute("aria-valuenow")).toBe("30");
  expect(screen.getByText("50%")).toBeTruthy();
});

it("runs a button's action and ticks a checklist", () => {
  draw({
    component: "Stack",
    children: [
      { component: "Checklist", props: { stateKey: "done", items: ["Tent"] } },
      { component: "Tabs", props: { stateKey: "tab", value: { $state: "tab" }, options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] } },
      { component: "Show", props: { value: { $state: "tab" }, equals: "b" }, children: [{ component: "Text", props: { text: "Panel B" } }] },
    ],
  });
  fireEvent.click(screen.getByRole("checkbox"));
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  expect(screen.queryByText("Panel B")).toBeNull();
  fireEvent.click(screen.getByText("B"));
  expect(screen.getByText("Panel B")).toBeTruthy();
});

it("draws a host's own Button for the same spec", () => {
  const pressed: unknown[] = [];
  const set = uiComponentSet({ renders: { Button: ({ label, onPress }: { label: string; onPress: unknown }) => <a href="#x" onClick={() => pressed.push(onPress)}>host {label}</a> } });
  expect(set.find((c) => c.name === "Button")?.description).toBe(uiSpecs.Button.description);
  draw({ component: "Stack", children: [{ component: "Button", props: { label: "Go", onPress: { action: "copy", text: "x" } } }, { component: "Text", props: { text: "kept" } }] }, set);
  fireEvent.click(screen.getByText("host Go"));
  expect(pressed).toEqual([{ action: "copy", text: "x" }]);
  expect(screen.getByText("kept")).toBeTruthy();
});

it("leaves out what the host excludes: it does not draw, and its spec is gone", () => {
  const set = uiComponentSet({ exclude: ["Button"] });
  expect(set.some((c) => c.name === "Button")).toBe(false);
  draw({ component: "Stack", children: [{ component: "Button", props: { label: "Go", onPress: { action: "copy", text: "x" } } }, { component: "Text", props: { text: "kept" } }] }, set);
  expect(screen.queryByText("Go")).toBeNull();
  expect(screen.getByText("kept")).toBeTruthy();
});
