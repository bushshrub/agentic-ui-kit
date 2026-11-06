import { clsx } from "clsx";
import { ArrowUp, Plus, Square } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type React from "react";
import { IconButton } from "../primitives/button";
import { useLabels } from "../primitives/labels";
import { MenuTrigger, Popover } from "../primitives/menu";

export interface ComposerProps {
  onSubmit: (text: string) => void;
  /** Shown as a stop button while `busy`. */
  onStop?: () => void;
  /** A reply is streaming: the send button becomes stop, and Enter does not send. */
  busy?: boolean;
  /** Controlled text. Leave both unset to let the composer keep its own. */
  value?: string;
  onChange?: (text: string) => void;
  placeholder?: string;
  /**
   * "docked": under a chat in progress. "centered": the empty state, taller. "compact": one row, for
   * panels and inline use.
   */
  variant?: "docked" | "centered" | "compact";
  /** Left of the toolbar, e.g. `<AttachButton>` and toggles. */
  leading?: ReactNode;
  /** Right of the toolbar before send, e.g. `<ModelPicker>`. */
  trailing?: ReactNode;
  /** Above the text, e.g. attachment chips. */
  above?: ReactNode;
  /** Files pasted or dropped onto the composer. */
  onFiles?: (files: File[]) => void;
  /** Pasted text longer than `longPasteChars` goes here instead of into the box, e.g. as a card. */
  onLongPaste?: (text: string) => void;
  longPasteChars?: number;
  /** Allows sending with no text, e.g. when attachments are ready. */
  allowEmpty?: boolean;
  /** Holds sending back, e.g. while a file uploads. */
  submitDisabled?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/** Touch keyboards have no easy Shift+Enter, so there Enter adds a line and the button sends. */
const coarsePointer = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

/** The chat box: growing textarea, toolbar slots, send / stop. Enter sends, Shift+Enter adds a line. */
export function Composer({
  onSubmit,
  onStop,
  busy = false,
  value,
  onChange,
  placeholder,
  variant = "docked",
  leading,
  trailing,
  above,
  onFiles,
  onLongPaste,
  longPasteChars = 2000,
  allowEmpty = false,
  submitDisabled = false,
  isDisabled = false,
  autoFocus,
  className,
}: ComposerProps) {
  const labels = useLabels();
  const [own, setOwn] = useState("");
  const text = value ?? own;
  const setText = (next: string) => {
    if (value === undefined) setOwn(next);
    onChange?.(next);
  };
  const area = useRef<HTMLTextAreaElement>(null);

  // Grow with the text up to the CSS max height, then scroll. Re-measured when the variant's padding or
  // the pane's width changes; it only scrolls once the text is taller than the max height.
  const fit = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflowY = el.scrollHeight > el.clientHeight + 1 ? "auto" : "hidden";
  }, []);
  useLayoutEffect(fit, [text, variant, fit]);
  useEffect(() => {
    const el = area.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width) (width = el.clientWidth), fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  const [dragging, setDragging] = useState(false);
  const canSend = !busy && !isDisabled && !submitDisabled && (allowEmpty || text.trim().length > 0);
  const submit = () => {
    if (!canSend) return;
    onSubmit(text);
    setText("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || coarsePointer()) return;
    e.preventDefault();
    submit();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...e.clipboardData.files];
    if (files.length && onFiles) {
      e.preventDefault();
      onFiles(files);
      return;
    }
    const pasted = e.clipboardData.getData("text/plain");
    if (onLongPaste && pasted.length > longPasteChars) {
      e.preventDefault();
      onLongPaste(pasted);
    }
  };
  const dropProps = onFiles && {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      setDragging(false);
      onFiles([...e.dataTransfer.files]);
    },
  };

  const compact = variant === "compact";
  const action = busy ? (
    <IconButton label={labels.stop} variant="primary" onPress={onStop} className="rounded-chat-md [&_svg]:size-3.5 [&_svg]:fill-current">
      <Square />
    </IconButton>
  ) : (
    <IconButton label={labels.send} variant="primary" onPress={submit} isDisabled={!canSend} className="rounded-chat-md">
      <ArrowUp />
    </IconButton>
  );

  return (
    <div
      className={clsx(
        "flex flex-col rounded-[1.25rem] border border-chat-border bg-chat-surface font-chat-sans shadow-chat-popover",
        "focus-within:border-chat-border-strong",
        dragging && "border-chat-accent! border-dashed",
        compact ? "gap-1 p-2" : "gap-2 p-3",
        className,
      )}
      {...dropProps}
      onPointerDown={(e) => {
        // Clicks on the box's padding focus the text, like one big field.
        if (e.target === e.currentTarget) {
          e.preventDefault();
          area.current?.focus();
        }
      }}
    >
      {above}
      <div className={clsx("flex gap-2", compact ? "items-end" : "flex-col")}>
        {compact && leading}
        <textarea
          ref={area}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder ?? labels.replyPlaceholder}
          aria-label={labels.message}
          disabled={isDisabled}
          autoFocus={autoFocus}
          className={clsx(
            "w-full resize-none bg-transparent px-1.5 text-chat-fg outline-none placeholder:text-chat-subtle",
            "text-base leading-relaxed [scrollbar-width:thin]",
            // cqh: a share of the chat pane's height, so a short pane keeps room for messages.
            compact ? "max-h-[min(10rem,30cqh)] py-1" : variant === "centered" ? "max-h-[min(24rem,45cqh)] min-h-12 pt-1" : "max-h-[min(18rem,35cqh)] min-h-6 pt-1",
          )}
        />
        {compact ? (
          <div className="flex shrink-0 items-center gap-1">
            {trailing}
            {action}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <div className="flex min-w-0 flex-1 items-center gap-1">{leading}</div>
            {trailing}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AttachButtonProps {
  /** The menu, e.g. `<Menu aria-label="Add">…</Menu>`. */
  children: ReactNode;
  label?: string;
}

/** The `+` button that opens the attach menu above the composer. */
export function AttachButton({ children, label }: AttachButtonProps) {
  const labels = useLabels();
  return (
    <MenuTrigger>
      <IconButton label={label ?? labels.addFiles}>
        <Plus />
      </IconButton>
      <Popover placement="top start">{children}</Popover>
    </MenuTrigger>
  );
}
