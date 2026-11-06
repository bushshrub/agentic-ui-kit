import { expect, it } from "vitest";
import { checkUiTree, renderUiTool } from "./ui-tree";
import { uiComponentSpecs, uiSpecs, uiSpecSet } from "./ui-components";

const check = (root: unknown) => checkUiTree({ root }, uiComponentSpecs);

it("lists every spec once, under its own name", () => {
  expect(uiComponentSpecs.map((s) => s.name)).toEqual(Object.keys(uiSpecs));
});

it("accepts a dashboard built from the set", () => {
  const root = {
    component: "Stack",
    children: [
      { component: "Grid", props: { columns: 3 }, children: [{ component: "Metric", props: { label: "Users", value: 1204, tone: "good" } }, { component: "Badge", props: { label: "Live", tone: "good" } }] },
      { component: "Progress", props: { label: "Quota", value: 30, max: 50 } },
      { component: "Table", props: { columns: ["Name", "Qty"], rows: [["Tent", 1], ["Stove", 2]] } },
    ],
  };
  expect(check(root)).toMatchObject({ ok: true, errors: [] });
});

it("rejects table cells that are not text or numbers, and a negative progress value", () => {
  expect(check({ component: "Table", props: { columns: ["A"], rows: [[{ x: 1 }]] } }).ok).toBe(false);
  expect(check({ component: "Table", props: { columns: [], rows: [] } }).ok).toBe(false);
  expect(check({ component: "Progress", props: { value: -1 } }).ok).toBe(false);
  expect(check({ component: "Badge", props: { label: "x", tone: "loud" } }).ok).toBe(false);
});

it("builds a set from groups and names, and checks only against it", () => {
  const display = uiSpecSet({ exclude: ["interactive"] }).map((s) => s.name);
  expect(display).toEqual(["Stack", "Grid", "Card", "Heading", "Text", "Metric", "List", "Table", "Badge", "Progress"]);
  expect(uiSpecSet({ exclude: ["Button"] }).map((s) => s.name)).not.toContain("Button");
  expect(uiSpecSet({ include: ["Text", "Button"] }).map((s) => s.name)).toEqual(["Text", "Button"]);
  const button = { component: "Button", props: { label: "Go", onPress: { action: "copy", text: "x" } } };
  expect(checkUiTree({ root: button }, uiComponentSpecs).ok).toBe(true);
  const { ok, errors } = checkUiTree({ root: button }, uiSpecSet({ exclude: ["interactive"] }));
  expect(ok).toBe(false);
  expect(errors.join()).toMatch(/unknown "Button"/);
  expect(renderUiTool(uiSpecSet({ exclude: ["Button"] })).description).not.toContain("- Button");
});
