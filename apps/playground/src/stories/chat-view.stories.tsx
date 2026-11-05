import type { Meta, StoryObj } from "@storybook/react-vite";
import { AttachmentRow, Composer, ModelPicker, useAttachments, type DraftAttachment } from "@llm-chat/react";
import { useState } from "react";
import { attachMenu, DemoChat, fakeUpload, history, models } from "../lib/demo-chat";

const meta: Meta = { title: "Views/Chat view", parameters: { layout: "fullscreen" } };
export default meta;

/** A chat in progress. Send a message to get a recorded reply; stop it midway; retry any reply. */
export const InProgress: StoryObj = {
  render: () => (
    <div className="h-dvh">
      <DemoChat start={history} title="Speeding up CI" />
    </div>
  ),
};

/** A new chat: greeting over the centered composer. */
export const Empty: StoryObj = {
  render: () => (
    <div className="h-dvh">
      <DemoChat start={[]} title="New chat" />
    </div>
  ),
};

/** Docked in a side panel of a host app (e.g. an assistant dock). */
export const Panel: StoryObj = {
  render: () => (
    <div className="flex h-dvh">
      <div className="flex-1 p-8 font-chat-sans text-sm text-chat-subtle">Host app content</div>
      <div className="w-[26rem] border-l border-chat-border">
        <DemoChat start={history} density="panel" title="CI speed" />
      </div>
    </div>
  ),
};

/** A small area inside a form (e.g. a draft helper in an application form). */
export const Inline: StoryObj = {
  render: () => (
    <div className="mx-auto max-w-xl p-8">
      <p className="mb-2 font-chat-sans text-sm text-chat-muted">Cover letter assistant</p>
      <div className="h-[28rem] overflow-hidden rounded-chat-lg border border-chat-border">
        <DemoChat start={[]} density="inline" title="Draft" />
      </div>
    </div>
  ),
};

export const Composers: StoryObj = {
  render: function Render() {
    const [model, setModel] = useState(models[0]!.id);
    const [effort, setEffort] = useState("high");
    const picker = <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />;
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
        <Composer variant="centered" placeholder="How can I help you today?" onSubmit={() => {}} leading={attachMenu()} trailing={picker} />
        <Composer onSubmit={() => {}} leading={attachMenu()} trailing={picker} />
        <Composer busy onSubmit={() => {}} onStop={() => {}} leading={attachMenu()} trailing={picker} value="Can we make CI foot faster" />
        <Composer variant="compact" placeholder="Ask about this job…" onSubmit={() => {}} leading={attachMenu()} />
      </div>
    );
  },
};

const pasted = `Lighthouses were never meant to be beautiful. They were built to warn ships off coastlines that had already sunk too many of them, and every design decision followed from that. A tower had to be tall enough for its light to clear the curve of the earth.`;

const screenshot = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#111"/>${Array.from({ length: 14 }, (_, i) => `<rect x="${20 + (i % 3) * 8}" y="${20 + i * 14}" width="${60 + ((i * 37) % 120)}" height="6" rx="2" fill="${["#6c9cf0", "#98c379", "#e5c07b", "#ecebe6"][i % 4]}"/>`).join("")}</svg>`,
)}`;

const drafts: DraftAttachment[] = [
  { id: "a1", kind: "text", name: "Pasted text", mime: "text/plain", size: pasted.length, text: pasted, status: "ready" },
  { id: "a2", kind: "image", name: "screenshot.png", mime: "image/png", size: 48_000, previewUrl: screenshot, status: "ready" },
  { id: "a3", kind: "image", name: "uploading.png", mime: "image/png", size: 48_000, previewUrl: screenshot, status: "uploading" },
  { id: "a4", kind: "file", name: "quarterly-report.pdf", mime: "application/pdf", size: 120_000, status: "uploading" },
  { id: "a5", kind: "file", name: "notes.md", mime: "text/markdown", size: 2_000, status: "error", error: "File too large" },
];

/** Pasted text, images and files in the composer; the shimmering ones are uploading. Paste long text or drop files to add more. */
export const Attachments: StoryObj = {
  render: function Render() {
    const [list, setList] = useState(drafts);
    const files = useAttachments({ upload: fakeUpload });
    const all = [...list, ...files.attachments];
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Composer
          onSubmit={() => {}}
          leading={attachMenu()}
          above={
            <AttachmentRow
              attachments={all}
              onRemove={(id) => (setList((l) => l.filter((a) => a.id !== id)), files.remove(id))}
              onEditText={(id, text) => (setList((l) => l.map((a) => (a.id === id ? { ...a, text } : a))), files.updateText(id, text))}
            />
          }
          onFiles={files.addFiles}
          onLongPaste={files.addText}
          allowEmpty
          submitDisabled={all.some((a) => a.status === "uploading")}
        />
      </div>
    );
  },
};
