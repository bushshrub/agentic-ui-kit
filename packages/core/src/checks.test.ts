import { expect, it } from "vitest";
import { salvageJson } from "./partial-json";
import { checkUiTree, uiActionSchema, type UiComponentSpec } from "./ui-tree";
import { checkWidgetCode } from "./visualize";

const specs: UiComponentSpec[] = [
  { name: "Stack", description: "Column.", children: true },
  { name: "Text", description: "Text.", props: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } },
  { name: "Button", description: "Button.", props: { type: "object", properties: { label: { type: "string" }, onPress: uiActionSchema }, required: ["label", "onPress"] } },
];

it("passes a good tree", () => {
  const tree = { root: { component: "Stack", children: [{ component: "Text", props: { text: { $state: "t" } } }] }, state: { t: "hi" } };
  expect(checkUiTree(tree, specs)).toMatchObject({ ok: true, errors: [] });
});

it("tells the model what to fix, with paths", () => {
  const { ok, errors, feedback } = checkUiTree(
    {
      root: {
        component: "Stack",
        children: [
          { component: "text", props: { text: "x" } },
          { component: "Text", props: { text: 3, size: "lg" } },
          { component: "Text", props: { text: "ok" }, children: [] },
          { component: "Button", props: { label: "Go", onPress: { action: "open", url: "javascript:x" } } },
        ],
      },
    },
    specs,
  );
  expect(ok).toBe(false);
  expect(errors).toEqual([
    'root.children[0].component: unknown "text"; did you mean "Text"?',
    "root.children[1].props.text: expected string, got number 3",
    "root.children[1].props.size: unknown prop (allowed: text)",
    "root.children[2].children: Text takes no children (they are not shown)",
    'root.children[3].props.onPress.url: must match ^https?://, got "javascript:x"',
  ]);
  expect(feedback).toContain("3 of 5 nodes were left out");
  expect(feedback).toContain("call render_ui again");
});

it("accepts a root sent as a JSON string, but says so, and where it broke", () => {
  const { errors } = checkUiTree({ root: '{"component":"Text","props":{"text":"a"}}]' }, specs);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/^root: send an object, not a JSON string \(and the string has invalid JSON at character 41/);
});

it("lets a state ref stand for a value set later", () => {
  expect(checkUiTree({ root: { component: "Text", props: { text: { $state: "later" } } } }, specs).ok).toBe(true);
});

it("keeps valid JSON before a syntax error", () => {
  expect(salvageJson('{"a":[1,2]],"b":3}').value).toEqual({ a: [1, 2] });
});

it("flags what breaks a widget in the sandbox", () => {
  const html = `<!doctype html><img src="https://cdn.evil.com/x.png"><script src="https://unpkg.com/leaflet.js"></script>
<a href="https://example.com">ok</a><script>fetch("/api"); localStorage.x = 1</script>`;
  const { ok, errors } = checkWidgetCode(html, { resourceDomains: ["https://unpkg.com"] });
  expect(ok).toBe(false);
  expect(errors).toEqual([
    "Send a fragment: no <!doctype>, <html>, <head> or <body>.",
    "Blocked by the sandbox: https://cdn.evil.com. Only https://unpkg.com may be loaded. Inline it instead.",
    "Network calls (fetch, XHR, WebSocket) are blocked: inline the data.",
    "Storage (localStorage, cookies, indexedDB) is not available in the sandbox: keep state in variables.",
  ]);
});

it("warns about hard-coded colors but still shows the widget", () => {
  const check = checkWidgetCode(`<div style="color:#ff0000;background:var(--chat-surface)">hi</div>`);
  expect(check).toMatchObject({ ok: true, errors: [] });
  expect(check.warnings[0]).toMatch(/^Hard-coded colors \(#ff0000\)/);
  expect(checkWidgetCode("<p>hi</p>").feedback).toBe("Shown to the user.");
});
