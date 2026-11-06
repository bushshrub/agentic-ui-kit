import type { AttachmentPart } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { useIcons, IconSlot } from "../primitives/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../primitives/button";
import { useLabels } from "../primitives/labels";
import { Modal } from "../primitives/overlay";

/** An attachment in the composer, before it is sent. */
export interface DraftAttachment {
  id: string;
  kind: "text" | "image" | "file";
  name: string;
  mime: string;
  size: number;
  /** Pasted text. */
  text?: string;
  /** Local object URL for image thumbnails. */
  previewUrl?: string;
  status: "uploading" | "ready" | "error";
  fileId?: string;
  url?: string;
  error?: string;
}

export interface UploadResult {
  fileId: string;
  url?: string;
}

export interface UseAttachmentsOptions {
  /** Uploads a file. Without it files are kept locally and count as ready at once. */
  upload?: (file: File, signal: AbortSignal) => Promise<UploadResult>;
}

export interface UseAttachments {
  attachments: DraftAttachment[];
  /** True while any file uploads; sending waits for it. */
  uploading: boolean;
  addFiles(files: Iterable<File>): void;
  addText(text: string): void;
  updateText(id: string, text: string): void;
  remove(id: string): void;
  clear(): void;
  /** Ready attachments as message parts, for `send`. */
  toParts(): AttachmentPart[];
}

let counter = 0;
const draftId = () => `att_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/** Composer attachments: pasted text, images with thumbnails, files, each uploading on its own. */
export function useAttachments({ upload }: UseAttachmentsOptions = {}): UseAttachments {
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const uploads = useRef(new Map<string, AbortController>());
  const labels = useLabels();
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const uploadRef = useRef(upload);
  uploadRef.current = upload;

  const patch = useCallback((id: string, fields: Partial<DraftAttachment>) => {
    setAttachments((list) => list.map((a) => (a.id === id ? { ...a, ...fields } : a)));
  }, []);

  const addFiles = useCallback(
    (files: Iterable<File>) => {
      for (const file of files) {
        const id = draftId();
        const image = file.type.startsWith("image/");
        const doUpload = uploadRef.current;
        const draft: DraftAttachment = {
          id,
          kind: image ? "image" : "file",
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          status: doUpload ? "uploading" : "ready",
          ...(image && { previewUrl: URL.createObjectURL(file) }),
        };
        setAttachments((list) => [...list, draft]);
        if (!doUpload) continue;
        const controller = new AbortController();
        uploads.current.set(id, controller);
        doUpload(file, controller.signal)
          .then((result) => patch(id, { status: "ready", fileId: result.fileId, ...(result.url && { url: result.url }) }))
          .catch((error: unknown) => {
            if (!controller.signal.aborted) patch(id, { status: "error", error: error instanceof Error ? error.message : labelsRef.current.uploadFailed });
          })
          .finally(() => uploads.current.delete(id));
      }
    },
    [patch],
  );

  const addText = useCallback((text: string) => {
    setAttachments((list) => [
      ...list,
      { id: draftId(), kind: "text", name: labelsRef.current.pastedText, mime: "text/plain", size: new Blob([text]).size, text, status: "ready" },
    ]);
  }, []);

  const updateText = useCallback((id: string, text: string) => patch(id, { text, size: new Blob([text]).size }), [patch]);

  const remove = useCallback((id: string) => {
    uploads.current.get(id)?.abort();
    setAttachments((list) => {
      const gone = list.find((a) => a.id === id);
      if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
      return list.filter((a) => a.id !== id);
    });
  }, []);

  // Sent attachments keep their preview URLs: the sent message still shows them.
  const clear = useCallback(() => setAttachments([]), []);

  const toParts = useCallback(
    (): AttachmentPart[] =>
      attachments
        .filter((a) => a.status === "ready")
        .map((a) => ({
          type: "attachment",
          id: a.id,
          status: "done",
          fileId: a.fileId ?? a.id,
          name: a.name,
          mime: a.mime,
          size: a.size,
          ...((a.url ?? a.previewUrl) && { url: a.url ?? a.previewUrl }),
          ...(a.text !== undefined && { text: a.text }),
        })),
    [attachments],
  );

  useEffect(() => () => uploads.current.forEach((c) => c.abort()), []);

  return { attachments, uploading: attachments.some((a) => a.status === "uploading"), addFiles, addText, updateText, remove, clear, toParts };
}

/** What a card needs; both composer drafts and sent attachment parts fit. */
export interface AttachmentCardData {
  name: string;
  mime: string;
  text?: string;
  /** Image thumbnail. */
  url?: string;
  status?: "uploading" | "ready" | "error" | string;
  error?: string;
}

export interface AttachmentCardProps {
  attachment: AttachmentCardData;
  /** Shows the remove button (on hover and focus; always on touch). */
  onRemove?: () => void;
  /** Pasted text: opens it to view or edit. */
  onOpen?: () => void;
  size?: "md" | "sm";
  className?: string;
}

const extension = (name: string) => /\.([a-z0-9]{1,5})$/i.exec(name)?.[1]?.toUpperCase();

/** A square card: pasted text preview with a PASTED badge, an image thumbnail, or a file with its type. */
export function AttachmentCard({ attachment: a, onRemove, onOpen, size = "md", className }: AttachmentCardProps) {
  const icons = useIcons();
  const image = a.mime.startsWith("image/") && a.url;
  const pasted = a.text !== undefined;
  const labels = useLabels();
  const uploading = a.status === "uploading";
  const failed = a.status === "error";
  return (
    <div
      className={clsx(
        "group/card relative shrink-0 rounded-chat-md border bg-chat-bg font-chat-sans",
        failed ? "border-chat-danger" : "border-chat-border",
        size === "md" ? "size-30" : "size-24",
        className,
      )}
      title={failed ? (a.error ?? labels.uploadFailed) : a.name}
    >
      <div className={clsx("absolute inset-0 overflow-hidden rounded-[inherit]", uploading && "chat-shimmer-surface")}>
        {image ? (
          <img src={a.url} alt={a.name} className={clsx("size-full object-cover", uploading && "opacity-60")} />
        ) : pasted ? (
          <p className="h-full overflow-hidden p-2.5 pb-9 text-[0.5625rem] leading-snug break-all text-chat-muted [mask-image:linear-gradient(to_bottom,black_45%,transparent_72%)]">
            {a.text}
          </p>
        ) : (
          <div className="flex h-full flex-col gap-1.5 p-2.5">
            <IconSlot className="text-chat-muted [&_svg]:size-5">{icons.file}</IconSlot>
            <span className="line-clamp-3 text-(length:--chat-ui-font-size-sm) leading-4 break-words text-chat-fg">{a.name}</span>
          </div>
        )}
      </div>
      {!image && (
        <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-1">
          <span
            className={clsx(
              "rounded-[0.3rem] border bg-chat-bg px-1.5 py-0.5 text-[0.625rem] leading-none tracking-wide uppercase",
              failed ? "border-chat-danger text-chat-danger" : "border-chat-border-strong text-chat-muted",
            )}
          >
            {failed ? labels.failed : pasted ? labels.pasted : (extension(a.name) ?? labels.file)}
          </span>
          {pasted && onOpen && (
            <IconButton label={labels.editPastedText} size="sm" onPress={onOpen} className="size-6 border border-chat-border-strong bg-chat-bg [&_svg]:size-3.5 [@media(pointer:coarse)]:size-7!">
              {icons.edit}
            </IconButton>
          )}
        </div>
      )}
      {pasted && onOpen && !onRemove && (
        <button type="button" aria-label={labels.viewPastedText} onClick={onOpen} className="absolute inset-0 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-chat-focus" />
      )}
      {onRemove && (
        <IconButton
          label={labels.removeAttachment(a.name)}
          variant="subtle"
          size="sm"
          tooltip={false}
          onPress={onRemove}
          className={clsx(
            "absolute -top-2 -right-2 size-6 rounded-full border border-chat-border-strong [&_svg]:size-3.5 [@media(pointer:coarse)]:size-7!",
            "opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 data-focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
          )}
        >
          {icons.remove}
        </IconButton>
      )}
    </div>
  );
}

export interface AttachmentRowProps {
  attachments: DraftAttachment[];
  onRemove: (id: string) => void;
  /** Saves edited pasted text. Without it pasted text opens read-only. */
  onEditText?: (id: string, text: string) => void;
}

/** The composer's row of cards above the text. Renders nothing when empty. */
export function AttachmentRow({ attachments, onRemove, onEditText }: AttachmentRowProps) {
  const [editing, setEditing] = useState<DraftAttachment>();
  const labels = useLabels();
  if (attachments.length === 0) return null;
  return (
    <>
      <ul aria-label={labels.attachments} className="flex gap-2.5 overflow-x-auto px-0.5 pt-2.5 pb-1 [scrollbar-width:thin]">
        {attachments.map((a) => (
          <li key={a.id}>
            <AttachmentCard
              attachment={{ ...a, ...(a.previewUrl && { url: a.previewUrl }) }}
              onRemove={() => onRemove(a.id)}
              {...(a.kind === "text" && { onOpen: () => setEditing(a) })}
            />
          </li>
        ))}
      </ul>
      <PastedTextDialog
        text={editing?.text}
        onClose={() => setEditing(undefined)}
        {...(onEditText && editing && { onSave: (text: string) => onEditText(editing.id, text) })}
      />
    </>
  );
}

export interface PastedTextDialogProps {
  /** Open while set. */
  text: string | undefined;
  onClose: () => void;
  /** Makes the text editable. */
  onSave?: (text: string) => void;
  title?: string;
}

/** Shows pasted text in a modal, editable when `onSave` is set. */
export function PastedTextDialog({ text, onClose, onSave, title }: PastedTextDialogProps) {
  const labels = useLabels();
  title ??= labels.pastedText;
  const [draft, setDraft] = useState(text ?? "");
  useEffect(() => setDraft(text ?? ""), [text]);
  return (
    <Modal isOpen={text !== undefined} onOpenChange={(open) => !open && onClose()} title={title}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        readOnly={!onSave}
        aria-label={title}
        className="mx-5 min-h-64 flex-1 resize-none rounded-chat-md border border-chat-border bg-chat-bg p-3 font-chat-mono text-(length:--chat-ui-font-size) leading-relaxed text-chat-fg outline-none focus:border-chat-border-strong [scrollbar-width:thin]"
      />
      <div className="flex justify-end gap-2 px-5 py-4">
        <Button variant="subtle" onPress={onClose}>
          {onSave ? labels.cancel : labels.close}
        </Button>
        {onSave && (
          <Button
            variant="primary"
            onPress={() => {
              onSave(draft);
              onClose();
            }}
          >
            {labels.save}
          </Button>
        )}
      </div>
    </Modal>
  );
}
