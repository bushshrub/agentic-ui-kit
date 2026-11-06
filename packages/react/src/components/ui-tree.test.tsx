import { uiActionSchema } from "@agentic-ui-kit/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { UiComponentsProvider, UiTree, useUiAction, type UiComponent, type UiStateStore } from "./ui-tree";
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
