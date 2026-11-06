import { uiActionSchema } from "@agentic-ui-kit/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { readTreeInput, UiComponentsProvider, UiTree, useUiAction, type UiComponent, type UiStateStore } from "./ui-tree";
import { WidgetHostProvider } from "./widget-frame";

afterEach(cleanup);

const components: UiComponent[] = [
  {
    name: "Stack",
    description: "Children in a column.",
    children: true,
    render: ({ children }: { children?: ReactNode }) => <div data-testid="stack">{children}</div>,
  },
  {
    name: "Text",
    description: "A line of text.",
    props: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    render: ({ text }: { text: string }) => <p>{text}</p>,
  },
  {
    name: "Button",
    description: "Runs an action.",
    props: { type: "object", properties: { label: { type: "string" }, onPress: uiActionSchema }, required: ["label", "onPress"] },
    render: function Button({ label, onPress }: { label: string; onPress: unknown }) {
      const run = useUiAction();
      return <button onClick={() => run(onPress)}>{label}</button>;
    },
  },
  { name: "Boom", description: "Throws.", render: () => { throw new Error("boom"); } },
];

function tree(root: unknown, extra: { state?: Record<string, unknown>; persist?: UiStateStore; onPrompt?: (t: string) => void } = {}) {
  return (
    <WidgetHostProvider host={{ ...(extra.onPrompt && { onPrompt: extra.onPrompt }) }}>
      <UiComponentsProvider components={components} {...(extra.persist && { persist: extra.persist })}>
        <UiTree id="call1" root={root} {...(extra.state && { state: extra.state })} />
      </UiComponentsProvider>
    </WidgetHostProvider>
  );
}

it("draws good nodes and skips unknown components, bad props and components that throw", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  render(
    tree({
      component: "Stack",
      children: [
        { component: "Text", props: { text: "kept" } },
        { component: "Text", props: { text: 3 } },
        { component: "Script", props: { src: "x" } },
        { component: "Boom" },
        "junk",
        { component: "Text", props: { text: "also kept" } },
      ],
    }),
  );
  expect(screen.getByTestId("stack").textContent).toBe("keptalso kept");
});

it("renders a tree cut short while it streams", () => {
  // What parsePartialJson gives mid-stream: the last node has no props yet.
  render(tree({ component: "Stack", children: [{ component: "Text", props: { text: "Mon" } }, { component: "Text" }] }));
  expect(screen.getByTestId("stack").textContent).toBe("Mon");
});

it("sets local state that props read, and keeps it in the store", () => {
  const saved: Record<string, unknown>[] = [];
  const persist: UiStateStore = { load: () => undefined, save: (_id, s) => void saved.push(s) };
  render(
    tree(
      {
        component: "Stack",
        children: [
          { component: "Text", props: { text: { $state: "picked" } } },
          { component: "Button", props: { label: "Pick B", onPress: { action: "set", key: "picked", value: "B" } } },
        ],
      },
      { state: { picked: "A" }, persist },
    ),
  );
  expect(screen.getByText("A")).toBeTruthy();
  fireEvent.click(screen.getByText("Pick B"));
  expect(screen.getByText("B")).toBeTruthy();
  expect(saved).toEqual([{ picked: "B" }]);
});

it("starts from the stored state", () => {
  const persist: UiStateStore = { load: (id) => (id === "call1" ? { picked: "C" } : undefined), save: () => {} };
  render(tree({ component: "Text", props: { text: { $state: "picked" } } }, { state: { picked: "A" }, persist }));
  expect(screen.getByText("C")).toBeTruthy();
});

it("sends a message only when the host allows it", async () => {
  const send = { component: "Button", props: { label: "Ask", onPress: { action: "send", text: "Compare them" } } };
  const onPrompt = vi.fn();
  const { unmount } = render(tree(send, { onPrompt }));
  await act(async () => fireEvent.click(screen.getByText("Ask")));
  expect(onPrompt).toHaveBeenCalledWith("Compare them");
  unmount();
  render(tree(send));
  fireEvent.click(screen.getByText("Ask"));
  expect(onPrompt).toHaveBeenCalledTimes(1);
});

it("reads a root the model sent as a JSON string, even one cut short", () => {
  expect(readTreeInput({ root: '{"component":"Text","props":{"text":"hi"}}', state: '{"a":1}' })).toEqual({
    root: { component: "Text", props: { text: "hi" } },
    state: { a: 1 },
  });
  expect(readTreeInput({ root: '{"component":"Stack","children":[{"component":"Te' })).toMatchObject({ root: { component: "Stack" } });
  // A stray bracket midway (seen from a real model): the nodes before it survive.
  const broken = '{"component":"Stack","children":[{"component":"Text","props":{"text":"hi"}}]]},{"component":"Text"}]}';
  expect(readTreeInput({ root: broken })).toEqual({ root: { component: "Stack", children: [{ component: "Text", props: { text: "hi" } }] } });
});

it("draws ```ui blocks in a reply, each with its own state, and code without a provider", async () => {
  const { Markdown } = await import("./markdown");
  const text = 'Intro\n\n```ui\n<State picked="A" />\n<Text text={$state.picked} />\n<Button label="Pick B" onPress={{action: "set", key: "picked", value: "B"}} />\n```\n\nBetween\n\n```ui\n<Text text={$state.picked} />\n<State picked="Z" />\n```\n';
  const ids = new Set<string>();
  const persist: UiStateStore = { load: (id) => void ids.add(id), save: () => {} };
  const { unmount } = render(
    <UiComponentsProvider components={components} persist={persist}>
      <Markdown partId="m1">{text}</Markdown>
    </UiComponentsProvider>,
  );
  expect(await screen.findByText("A")).toBeTruthy();
  expect(screen.getByText("Z")).toBeTruthy();
  fireEvent.click(screen.getByText("Pick B"));
  expect(screen.getByText("B")).toBeTruthy();
  expect(screen.getByText("Z")).toBeTruthy();
  expect(ids.size).toBe(2);
  unmount();
  const { container } = render(<Markdown partId="m1">{text}</Markdown>);
  expect(container.textContent).toContain("<Text text={$state.picked} />");
});

it("draws a UI tool call's markup while its input streams", async () => {
  const { uiMarkupToolView } = await import("./ui-tree");
  const { Block } = uiMarkupToolView();
  const part = (partialInput: unknown, status: "input" | "done") => ({ type: "tool_call", id: "c1", name: "show_ui", status, partialInput }) as never;
  const { rerender } = render(
    <UiComponentsProvider components={components}>
      <Block part={part({ markup: '<Stack><Text text="first" /><Text text="sec' }, "input")} />
    </UiComponentsProvider>,
  );
  expect(screen.getByTestId("stack").textContent).toBe("first");
  rerender(
    <UiComponentsProvider components={components}>
      <Block part={part({ markup: '<Stack><Text text="first" /><Text text="second" /></Stack>' }, "done")} />
    </UiComponentsProvider>,
  );
  expect(screen.getByTestId("stack").textContent).toBe("firstsecond");
});

it("keys the stored state by stateKey when the host passes one, so live and saved ids agree", () => {
  const loaded: string[] = [];
  const saved: string[] = [];
  const persist: UiStateStore = { load: (id) => (loaded.push(id), id === "activity-7" ? { picked: "C" } : undefined), save: (id) => void saved.push(id) };
  const root = { component: "Stack", children: [{ component: "Text", props: { text: { $state: "picked" } } }, { component: "Button", props: { label: "Pick B", onPress: { action: "set", key: "picked", value: "B" } } }] };
  render(
    <UiComponentsProvider components={components} persist={persist}>
      <UiTree id="live-part" stateKey="activity-7" root={root} />
    </UiComponentsProvider>,
  );
  expect(screen.getByText("C")).toBeTruthy();
  fireEvent.click(screen.getByText("Pick B"));
  expect(loaded).toEqual(["activity-7"]);
  expect(saved).toEqual(["activity-7"]);
});
