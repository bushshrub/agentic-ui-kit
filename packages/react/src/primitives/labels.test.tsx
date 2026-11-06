import { reduceEvents, type ContextUsage, type Message, type ModelInfo, type ToolCallPart } from "@agentic-ui-kit/core";
import { researchRun } from "@agentic-ui-kit/core/fixtures";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, it } from "vitest";
import { ApprovalCard } from "../components/approval-card";
import { AttachmentRow } from "../components/attachments";
import { ChatList } from "../components/chat-list";
import { ChatTitleMenu } from "../components/chat-header";
import { ContextPanel } from "../components/context-panel";
import { AssistantMessage } from "../components/messages";
import { ModelPicker } from "../components/model-picker";
import { TokenCounter } from "../components/token-counter";
import { commandTool, webSearchTool } from "../components/tools";
import { ChatView } from "../views/chat-view";
import { SidebarToggle } from "../views/app-shell";
import { ChatTheme } from "./chat-theme";
import { defaultLabels, type ChatLabels } from "./labels";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollTo = () => {};
});
afterEach(cleanup);

const override = Object.fromEntries(
  Object.entries(defaultLabels).map(([key, value]) => [key, typeof value === "function" ? () => `§${key.toLowerCase()}` : `§${key.toLowerCase()}`]),
) as unknown as ChatLabels;

// Plain words, so a leftover default label stands out.
const user: Message = {
  id: "u1",
  parentId: null,
  role: "user",
  status: "done",
  createdAt: "2026-11-04T19:00:00Z",
  parts: [
    { type: "text", id: "u1t", status: "done", text: "when does python 3.10 stop getting fixes?" },
    { type: "attachment", id: "u1a", status: "done", fileId: "f", name: "notes", mime: "text/plain", size: 4, text: "abcd" },
  ],
};
const assistant = reduceEvents(researchRun)!;
const waiting: ToolCallPart = { type: "tool_call", id: "w", name: "lookup_job", status: "awaiting", inputJson: "{}", input: {} };
const models: ModelInfo[] = [
  { id: "a", label: "Alpha", efforts: [{ id: "lo", label: "Low", recommended: true }], defaultEffort: "lo" },
  { id: "b", label: "Beta", secondary: true },
];
const context: ContextUsage = { limit: 1000, categories: [{ id: "a", label: "Alpha", tokens: 100 }, { id: "d", label: "Beta", tokens: 50, deferred: true }] };

function attributes(root: HTMLElement) {
  return [...root.querySelectorAll("[aria-label],[placeholder],[title]")].flatMap((el) =>
    ["aria-label", "placeholder", "title"].map((name) => el.getAttribute(name)).filter((v): v is string => !!v),
  );
}

it("leaves no default English once every label is overridden", () => {
  const { container } = render(
    <ChatTheme labels={override}>
      <ChatView
        messages={[user, assistant]}
        onSend={() => {}}
        approvals={[{ messageId: assistant.id, part: waiting }]}
        onApprove={() => {}}
        onRetry={() => {}}
        onEdit={() => {}}
        onFeedback={() => {}}
        composer={{ onFiles: () => {} }}
      />
      <AssistantMessage message={{ ...assistant, status: "error" }} onReadAloud={() => {}} />
      <ChatList
        sections={[
          { id: "s", title: "Recent", onViewAll: () => {}, items: [{ id: "c", title: "One", running: true }, { id: "d", title: "Two", unread: true }] },
          { id: "p", items: [{ type: "project", id: "pr", name: "site", chats: [{ id: "e", title: "Three", unread: true }] }] },
        ]}
        rowMenu={() => <span />}
      />
      <ChatTitleMenu pinned onPin={() => {}} onRename={() => {}} onAddToProject={() => {}} onCreateProject={() => {}} onShare={() => {}} onDelete={() => {}} />
      <ContextPanel usage={context} />
      <AttachmentRow
        attachments={[
          { id: "d1", kind: "text", name: "n", mime: "text/plain", size: 1, text: "x", status: "ready" },
          { id: "d2", kind: "file", name: "z", mime: "x/y", size: 1, status: "error" },
          { id: "d3", kind: "file", name: "q", mime: "x/y", size: 1, status: "ready" },
        ]}
        onRemove={() => {}}
        onEditText={() => {}}
      />
      <ModelPicker models={models} model="a" onModelChange={() => {}} effort="lo" onEffortChange={() => {}} />
      <TokenCounter tokens={1200} />
      <TokenCounter tokens={1200} variant="inline" />
      <SidebarToggle />
      <ApprovalCard approval={{ messageId: "m", part: { ...waiting, name: "bash" } }} onRespond={() => {}} />
      {commandTool.Detail && <commandTool.Detail part={{ ...waiting, status: "done", input: { command: "ls" } }} />}
      {webSearchTool.Detail && <webSearchTool.Detail part={{ ...waiting, status: "done", result: { results: [] } }} />}
    </ChatTheme>,
  );
  const strings = Object.values(defaultLabels).filter((v): v is string => typeof v === "string" && v.length > 3);
  const text = container.textContent ?? "";
  const attrs = attributes(container);
  for (const s of strings) {
    expect(text, `text contains "${s}"`).not.toContain(s);
    expect(attrs.filter((a) => a.includes(s)), `attribute contains "${s}"`).toEqual([]);
  }
  expect(attrs).toContain("§copy");
  expect(screen.getAllByLabelText("§send").length).toBeGreaterThan(0);
});

it("inherits labels from an outer ChatTheme and lets the inner one win", () => {
  render(
    <ChatTheme labels={{ send: "Envoyer", stop: "Arrêter" }}>
      <ChatTheme labels={{ send: "Senden" }}>
        <ChatView messages={[]} onSend={() => {}} busy={false} />
      </ChatTheme>
    </ChatTheme>,
  );
  expect(screen.queryByLabelText("Senden")).not.toBeNull();
  expect(screen.queryByLabelText("Send")).toBeNull();
});
