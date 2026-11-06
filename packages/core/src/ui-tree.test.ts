import { expect, it } from "vitest";
import { matchesSchema, renderUiTool, uiActionSchema } from "./ui-tree";

const metric = {
  type: "object",
  properties: { label: { type: "string" }, value: { type: "number" }, tone: { enum: ["good", "bad"] } },
  required: ["label", "value"],
  additionalProperties: false,
};

it("checks props against a component's schema", () => {
  expect(matchesSchema(metric, { label: "RAM", value: 16 })).toBe(true);
  expect(matchesSchema(metric, { label: "RAM", value: "16" })).toBe(false);
  expect(matchesSchema(metric, { label: "RAM" })).toBe(false);
  expect(matchesSchema(metric, { label: "RAM", value: 16, tone: "meh" })).toBe(false);
  expect(matchesSchema(metric, { label: "RAM", value: 16, style: "x" })).toBe(false);
  expect(matchesSchema({ type: "array", items: { type: "string" }, maxItems: 2 }, ["a", "b", "c"])).toBe(false);
});

it("accepts the four actions and nothing else", () => {
  expect(matchesSchema(uiActionSchema, { action: "set", key: "tab", value: "specs" })).toBe(true);
  expect(matchesSchema(uiActionSchema, { action: "send", text: "Compare them" })).toBe(true);
  expect(matchesSchema(uiActionSchema, { action: "open", url: "https://example.com" })).toBe(true);
  expect(matchesSchema(uiActionSchema, { action: "open", url: "javascript:alert(1)" })).toBe(false);
  expect(matchesSchema(uiActionSchema, { action: "eval", code: "1" })).toBe(false);
});

it("describes the registered components to the model", () => {
  const tool = renderUiTool([{ name: "Metric", description: "A number with a label.", props: metric }, { name: "Stack", description: "Lays out children.", children: true }]);
  expect(tool.name).toBe("render_ui");
  expect(tool.description).toContain("- Metric: A number with a label.");
  expect(tool.description).toContain("- Stack (takes children)");
  expect(tool.inputSchema.properties.root.properties.component.enum).toEqual(["Metric", "Stack"]);
});
