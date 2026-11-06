import { reduceEvents, type ContextUsage, type Message, type ModelInfo, type ToolCallPart } from "@agentic-ui-kit/core";
import { researchRun } from "@agentic-ui-kit/core/fixtures";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, expect, it } from "vitest";
import { ApprovalCard } from "../components/approval-card";
import { AttachmentRow } from "../components/attachments";
import { AttachButton } from "../components/composer";
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
import { defaultIcons, type ChatIcons } from "./icons";

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
  Object.keys(defaultIcons).map((key) => [key, <svg data-test-icon={key} />]),
) as unknown as ChatIcons;

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

it("leaves no default icon once every icon is overridden", () => {
  const { container } = render(
    <ChatTheme icons={override}>
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
      <AttachButton>{null}</AttachButton>
      <TokenCounter tokens={1200} />
      <TokenCounter tokens={1200} variant="inline" />
      <SidebarToggle />
      <ApprovalCard approval={{ messageId: "m", part: { ...waiting, name: "bash" } }} onRespond={() => {}} />
      {commandTool.Detail && <commandTool.Detail part={{ ...waiting, status: "done", input: { command: "ls" } }} />}
      {webSearchTool.Detail && <webSearchTool.Detail part={{ ...waiting, status: "done", result: { results: [{ title: "T", url: "https://x.test" }] } }} />}
    </ChatTheme>,
  );
  expect(container.querySelector("svg.lucide")).toBeNull();
  expect(container.querySelector('svg[viewBox="0 0 8 8"]')).toBeNull();
  const shown = new Set([...container.querySelectorAll("[data-test-icon]")].map((el) => el.getAttribute("data-test-icon")));
  for (const key of ["copy", "retry", "edit", "speak", "thumbsUp", "thumbsDown", "send", "attach", "tokens", "sidebar", "dropdown", "expand", "caret", "approval", "web", "more", "folder", "file", "remove"]) {
    expect(shown, key).toContain(key);
  }
});

it("inherits icons from an outer ChatTheme and lets the inner one win", () => {
  const { container } = render(
    <ChatTheme icons={{ send: <svg data-test-icon="outer-send" />, attach: <svg data-test-icon="outer-attach" /> }}>
      <ChatTheme icons={{ send: <svg data-test-icon="inner-send" /> }}>
        <ChatView messages={[]} onSend={() => {}} busy={false} />
        <AttachButton>{null}</AttachButton>
      </ChatTheme>
    </ChatTheme>,
  );
  expect(container.querySelector('[data-test-icon="inner-send"]')).not.toBeNull();
  expect(container.querySelector('[data-test-icon="outer-send"]')).toBeNull();
  expect(container.querySelector('[data-test-icon="outer-attach"]')).not.toBeNull();
});
