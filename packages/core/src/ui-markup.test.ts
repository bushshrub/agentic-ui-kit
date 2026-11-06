import { expect, it } from "vitest";
import { checkUiMarkup, checkUiMarkupCode, findUiBlocks, parseUiMarkup, readUiValue, showUiTool, uiMarkupGuide } from "./ui-markup";
import { uiActionSchema, type UiComponentSpec } from "./ui-tree";

const specs: UiComponentSpec[] = [
  { name: "Stack", description: "Column.", children: true },
  { name: "Card", description: "Box.", children: true, props: { type: "object", properties: { title: { type: "string" } }, additionalProperties: false } },
  { name: "Text", description: "Text.", props: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } },
  { name: "List", description: "Rows.", props: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { label: { type: "string" } }, required: ["label"] } } }, required: ["items"] } },
  { name: "Button", description: "Button.", props: { type: "object", properties: { label: { type: "string" }, onPress: uiActionSchema }, required: ["label", "onPress"] } },
];

it("reads JSX the way models write it", () => {
  const m = parseUiMarkup(`<State tab="a" open={false} />
<Card title="Pixel">
  <Text text={$state.tab} />
  <Text>Plain text child</Text>
  {/* a comment */}
  <Button label="Ask" onPress={{action: 'send', text: "More", }} />
  <Text text={"$state":"tab"} />
</Card>`);
  expect(m.errors).toEqual([]);
  expect(m.complete).toBe(true);
  expect(m.state).toEqual({ tab: "a", open: false });
  expect(m.nodes).toEqual([
    {
      component: "Card",
      props: { title: "Pixel" },
      children: [
        { component: "Text", props: { text: { $state: "tab" } } },
        { component: "Text", props: { text: "Plain text child" } },
        { component: "Button", props: { label: "Ask", onPress: { action: "send", text: "More" } } },
        { component: "Text", props: { text: { $state: "tab" } } },
      ],
    },
  ]);
  expect(m.lineOf(m.nodes[0]!.children![2]!)).toBe(6);
});

it("shows what has arrived while it streams", () => {
  const full = `<Stack>\n  <Text text="one" />\n  <Card title="Two">\n    <Text text="inside" />\n  </Card>\n</Stack>`;
  for (let n = 0; n <= full.length; n++) {
    const m = parseUiMarkup(full.slice(0, n));
    expect(m.errors).toEqual([]);
  }
  expect(parseUiMarkup(full.slice(0, full.indexOf("inside") + 3)).nodes).toEqual([
    { component: "Stack", children: [{ component: "Text", props: { text: "one" } }, { component: "Card", props: { title: "Two" } }] },
  ]);
  expect(parseUiMarkup(full.slice(0, 20)).complete).toBe(false);
});

it("reads values in braces leniently and says when it can't", () => {
  expect(readUiValue("[1, 'two', {a: true,},]").value).toEqual([1, "two", { a: true }]);
  expect(readUiValue("state.x").value).toEqual({ $state: "x" });
  expect(readUiValue("items.map(i => i)").error).toMatch(/JavaScript expressions are not run/);
});

it("finds ui blocks in reply text, the last one maybe still open", () => {
  const text = "Intro\n\n```ui\n<Text text=\"a\" />\n```\n\nMore\n\n```js\nx\n```\n\n```ui\n<Text";
  expect(findUiBlocks(text).map((b) => [b.source, b.closed])).toEqual([
    ['<Text text="a" />\n', true],
    ["<Text", false],
  ]);
});

it("tells the model what to fix, by line and component", () => {
  const reply = `Here you go.

\`\`\`ui
<Stack>
  <Card title="A" tone="accent">
    <List items={["plain", "strings"]} />
  </Card>
  <Txt text="x" />
</Stack>
\`\`\``;
  const { ok, errors, feedback } = checkUiMarkup(reply, specs);
  expect(ok).toBe(false);
  expect(errors).toEqual([
    "line 2 <Card>.props.tone: unknown prop (allowed: title)",
    "line 3 <List>.props.items[0]: expected object, got string \"plain\"",
    "line 3 <List>.props.items[1]: expected object, got string \"strings\"",
    'line 5 <Txt>.component: unknown "Txt"; use one of Stack, Card, Text, List, Button',
  ]);
  expect(feedback).toContain("did not fully show");
  expect(checkUiMarkup("No UI here.", specs)).toEqual({ ok: true, errors: [], feedback: "" });
});

it("writes a guide from the components", () => {
  const guide = uiMarkupGuide(specs);
  expect(guide).toContain('- <Card title?="…">…</Card>');
  expect(guide).toContain("- <List items={[{label}, …]} />");
  expect(guide).toContain('- <Button label="…" onPress={action} />');
  expect(uiMarkupGuide(specs)).toBe(guide);
});

it("suggests a UI tool and answers its calls", () => {
  const tool = showUiTool(specs);
  expect(tool.name).toBe("show_ui");
  expect(tool.description).toContain('- <Card title?="…">…</Card>');
  expect(showUiTool(specs).description).toBe(tool.description);
  expect(checkUiMarkupCode('<Card title="A"><Text text="hi" /></Card>', specs)).toEqual({ ok: true, errors: [], feedback: "Shown to the user." });
  const bad = checkUiMarkupCode('<Card title="A">\n  <Text text={3} />\n</Card>', specs);
  expect(bad.errors).toEqual(["line 2 <Text>.props.text: expected string, got number 3"]);
  expect(bad.feedback).toBe("Not all of it is shown. Fix these and call show_ui again:\n- line 2 <Text>.props.text: expected string, got number 3");
  expect(checkUiMarkupCode("", specs).ok).toBe(false);
});
