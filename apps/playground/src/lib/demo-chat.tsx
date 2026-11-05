import type { Message, ModelInfo } from "@llm-chat/core";
import { reduceEvents, resolveEffort } from "@llm-chat/core";
import { agentRun } from "@llm-chat/core/fixtures";
import {
  AttachButton,
  AttachmentRow,
  ChatHeader,
  ChatTitleMenu,
  ChatView,
  Composer,
  EmptyState,
  IconButton,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
  ModelPicker,
  SidebarToggle,
  useAttachments,
  useChat,
  userMessage,
  type Density,
  type DraftAttachment,
} from "@llm-chat/react";
import { Camera, Globe, Paperclip, Search, Share, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fixtureTransport } from "./fixture-transport";

export const efforts = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium", recommended: true },
  { id: "high", label: "High", warning: "Slower" },
];

/** Hosts supply these: slug, display name, description, context window, effort levels if any. */
export const models: ModelInfo[] = [
  { id: "gpt-6-astra", label: "GPT 6 Astra", description: "Reasoning model for hard problems", contextWindow: 400_000, efforts, defaultEffort: "medium" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", description: "Fast and capable for everyday work", contextWindow: 1_000_000, efforts, defaultEffort: "low" },
  { id: "gpt-6-astra-mini", label: "GPT 6 Astra Mini", description: "No reasoning effort setting", contextWindow: 128_000 },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", description: "Fastest, for simple tasks", contextWindow: 200_000, secondary: true },
];

/** Pretends to upload: a couple of seconds, then a file id. */
export const fakeUpload = (_file: File, signal: AbortSignal) =>
  new Promise<{ fileId: string }>((resolve, reject) => {
    const timer = setTimeout(() => resolve({ fileId: `file_${Date.now().toString(36)}` }), 2500);
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(new Error("aborted"))));
  });

export function attachMenu(onUpload?: () => void) {
  return (
    <AttachButton>
      <Menu aria-label="Add" onAction={(key) => key === "upload" && onUpload?.()}>
        <MenuItem id="upload" icon={<Paperclip />} shortcut="⌘U">
          Upload or add files
        </MenuItem>
        <MenuItem id="screenshot" icon={<Camera />}>
          Take a screenshot
        </MenuItem>
        <MenuSeparator />
        {/* Only the toggles hold a selection; the items above are actions. */}
        <MenuSection selectionMode="multiple" defaultSelectedKeys={["web"]}>
          <MenuItem id="research" icon={<Search />}>
            Research
          </MenuItem>
          <MenuItem id="web" icon={<Globe />}>
            Web search
          </MenuItem>
        </MenuSection>
      </Menu>
    </AttachButton>
  );
}

export const history: Message[] = (() => {
  const user = userMessage("Can we make CI faster?", null);
  const reply = reduceEvents(agentRun)!;
  return [{ ...user, createdAt: "2026-11-05T15:00:00Z" }, { ...reply, parentId: user.id }];
})();

export interface DemoChatProps {
  start: Message[];
  density?: Density;
  title: string;
  /** Replaces the default header. */
  header?: ReactNode;
  /** Sent once on mount, so the chat is already streaming (multi-pane stories). */
  autoSend?: string;
  greeting?: string;
  disclaimer?: ReactNode;
  eventsPerSecond?: number;
}

export function DemoChat({ start, density = "full", title: initialTitle, header, autoSend, greeting = "Good evening, Alex", disclaimer, eventsPerSecond }: DemoChatProps) {
  const transport = useMemo(() => fixtureTransport(eventsPerSecond ? { eventsPerSecond } : {}), [eventsPerSecond]);
  const [title, setTitle] = useState(initialTitle);
  const chat = useChat({ transport, initialMessages: start, onTitle: setTitle });
  const [model, setModel] = useState(models[0]!.id);
  const [effort, setEffort] = useState("medium");
  const files = useAttachments({ upload: fakeUpload });
  const input = useRef<HTMLInputElement>(null);
  const current = models.find((m) => m.id === model);
  const options = { model, ...(resolveEffort(current, effort) && { effort: resolveEffort(current, effort)! }) };
  const sent = useRef(false);
  useEffect(() => {
    if (!autoSend || sent.current) return;
    sent.current = true;
    chat.send(autoSend, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend]);
  const picker = <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />;

  return (
    <ChatView
      density={density}
      messages={chat.messages}
      busy={chat.busy}
      onSend={(text) => {
        chat.send(text, { ...options, attachments: files.toParts() });
        files.clear();
      }}
      onStop={chat.stop}
      onRetry={(id) => chat.retry(id, options)}
      onFeedback={() => {}}
      header={
        header !== undefined ? header : <ChatHeader
            leading={<SidebarToggle drawerOnly />}
            title={chat.messages.length > 0 ? title : ""}
            menu={
              chat.messages.length > 0 && (
              <ChatTitleMenu
                onPin={() => {}}
                onRename={() => {}}
                projects={[{ id: "p1", name: "website" }, { id: "p2", name: "job-board" }]}
                onAddToProject={() => {}}
                onCreateProject={() => {}}
                onShare={() => {}}
                onDelete={() => {}}
              />
              )
            }
            actions={
              density === "full" && chat.messages.length > 0 && (
                <IconButton label="Share">
                  <Share />
                </IconButton>
              )
            }
          />
      }
      composer={{
        placeholder: chat.messages.length ? "Reply…" : "How can I help you today?",
        leading: (
          <>
            {attachMenu(() => input.current?.click())}
            <input ref={input} type="file" multiple hidden onChange={(e) => (files.addFiles(e.target.files ?? []), (e.target.value = ""))} />
          </>
        ),
        trailing: density === "inline" ? undefined : picker,
        above: <AttachmentRow attachments={files.attachments} onRemove={files.remove} onEditText={files.updateText} />,
        onFiles: files.addFiles,
        onLongPaste: files.addText,
        allowEmpty: files.attachments.length > 0,
        submitDisabled: files.uploading,
      }}
      emptyState={(composer) =>
        density === "full" ? (
          <EmptyState greeting={greeting} icon={<Sparkles />}>
            {composer}
          </EmptyState>
        ) : (
          composer
        )
      }
      disclaimer={disclaimer ?? (density === "full" && "AI can make mistakes. Please double-check responses.")}
    />
  );
}

