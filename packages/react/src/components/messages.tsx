import { toBlocks, type Message, type Part } from "@agentic-ui-kit/core";
import { CopyButton } from "../primitives/copy-button";
import { chainsOf, ToolChain } from "./replacements";
import { clsx } from "clsx";
import { useIcons } from "../primitives/icons";
import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "../primitives/button";
import { defaultLabels, useLabels, type ChatLabels } from "../primitives/labels";
import { ActivityGroup } from "./activity-group";
import { AttachmentCard, PastedTextDialog } from "./attachments";
import { Markdown } from "./markdown";
import { useToolViews } from "./tools";
import { WidgetPartView } from "./widget-frame";

/** "just now", "5 minutes ago", "21 hours ago", "yesterday", then a date. */
export function formatRelativeTime(iso: string, now = Date.now(), labels: ChatLabels = defaultLabels): string {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(labels.locale, { numeric: "auto" });
  if (Math.abs(seconds) < 60) return labels.justNow;
  if (Math.abs(seconds) < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (Math.abs(seconds) < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (Math.abs(seconds) < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), "day");
  return new Date(iso).toLocaleDateString(labels.locale, { month: "short", day: "numeric" });
}

/** Plain text of a message, for copy and read aloud. */
export function messageText(message: Message): string {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : p.type === "custom" ? (p.text ?? "") : ""))
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The action row under each message. The kit's buttons show when you pass their handler (retry, edit,
 * feedback, read aloud); copy and the time show unless turned off; `extra` adds your own after them.
 */
export interface MessageActions {
  /** Your buttons after the kit's, per message, e.g. Share or a "…" menu. Use `IconButton size="sm"`. */
  extra?: (message: Message) => ReactNode;
  /** The copy button. Default true. */
  copy?: boolean;
  /** The relative time. Default true. */
  time?: boolean;
}

const timeClass = "px-1 font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle";

export interface UserMessageProps {
  message: Message;
  onRetry?: () => void;
  onEdit?: () => void;
  /** Extra buttons in the action row. */
  actions?: ReactNode;
  /** Hide the copy button. */
  copy?: boolean;
  /** Hide the time. */
  time?: boolean;
  className?: string;
}

/** The user's turn: a bubble on the right, with time, retry, edit and copy under it on hover. */
export function UserMessage({ message, onRetry, onEdit, actions, copy = true, time = true, className }: UserMessageProps) {
  const icons = useIcons();
  const labels = useLabels();
  const text = messageText(message);
  const attachments = message.parts.filter((p) => p.type === "attachment");
  const [viewing, setViewing] = useState<string>();
  return (
    <div className={clsx("group/message flex flex-col items-end", className)}>
      {attachments.length > 0 && (
        <ul aria-label={labels.attachments} className="mb-2 flex max-w-[85%] flex-wrap justify-end gap-2">
          {attachments.map((a) => (
            <li key={a.id}>
              <AttachmentCard attachment={a} size="sm" {...(a.text !== undefined && { onOpen: () => setViewing(a.text) })} />
            </li>
          ))}
        </ul>
      )}
      <PastedTextDialog text={viewing} onClose={() => setViewing(undefined)} />
      {text && <UserBubble text={text} />}
      <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100 [@media(hover:none)]:opacity-100">
        {time && <span className={timeClass}>{formatRelativeTime(message.createdAt, undefined, labels)}</span>}
        {onRetry && (
          <IconButton label={labels.retry} size="sm" onPress={onRetry}>
            {icons.retry}
          </IconButton>
        )}
        {onEdit && (
          <IconButton label={labels.edit} size="sm" onPress={onEdit}>
            {icons.edit}
          </IconButton>
        )}
        {copy && <CopyButton text={text} />}
        {actions}
      </div>
    </div>
  );
}

/** Taller than this (px), a user message folds to this height with "Show more", like a long paste. */
const FOLD_HEIGHT = 240;

function UserBubble({ text }: { text: string }) {
  const body = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);
  const labels = useLabels();
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => setLong(el.scrollHeight > FOLD_HEIGHT + 24);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);
  const folded = long && !open;
  return (
    <div className="max-w-[85%] rounded-chat-lg bg-chat-bubble px-4 py-2.5 font-chat-sans text-(length:--chat-bubble-font-size) leading-relaxed text-chat-fg">
      <div
        ref={body}
        style={folded ? { maxHeight: FOLD_HEIGHT } : undefined}
        className={clsx("whitespace-pre-wrap", folded && "overflow-hidden mask-b-from-60% mask-b-to-100%")}
      >
        {text}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="mt-1.5 cursor-pointer rounded-chat-sm text-(length:--chat-ui-font-size) leading-5 text-chat-muted outline-none hover:text-chat-fg focus-visible:ring-2 focus-visible:ring-chat-focus"
        >
          {open ? labels.showLess : labels.showMore}
        </button>
      )}
    </div>
  );
}

export type Feedback = "good" | "bad";

export interface AssistantMessageProps {
  message: Message;
  onRetry?: () => void;
  onFeedback?: (feedback: Feedback) => void;
  onReadAloud?: () => void;
  /** Renders parts the kit does not draw itself (custom parts), or replaces its own look (widgets). */
  renderPart?: (part: Part) => ReactNode;
  /** Extra buttons in the action row. */
  actions?: ReactNode;
  /** Hide the copy button. */
  copy?: boolean;
  /** Hide the time. */
  time?: boolean;
  className?: string;
}

/**
 * The assistant's turn: activity groups (each with its own token count), markdown, and other parts in
 * order. When done, copy / read aloud / feedback / retry and the time sit under it.
 */
export function AssistantMessage({ message, onRetry, onFeedback, onReadAloud, renderPart, actions, copy = true, time = true, className }: AssistantMessageProps) {
  const icons = useIcons();
  const labels = useLabels();
  const streaming = message.status === "streaming";
  const views = useToolViews();
  const blocks = toBlocks(message.parts, (part) => views[part.name]?.Block !== undefined);
  const { first, chains } = chainsOf(message);
  return (
    <div className={clsx("group/message flex flex-col gap-4", className)}>
      {blocks.map((block) => {
        if (block.kind === "activity") {
          const cards = block.parts.filter((p) => p.type === "tool_call" && views[p.name]?.Card);
          if (!cards.length) return <ActivityGroup key={block.id} parts={block.parts} />;
          return (
            <Fragment key={block.id}>
              <ActivityGroup parts={block.parts} />
              {cards.map((p) => {
                if (p.type !== "tool_call") return null;
                const Card = views[p.name]!.Card!;
                return <Card key={p.id} part={p} />;
              })}
            </Fragment>
          );
        }
        if (block.kind === "tool") {
          // A call that updates an earlier one in this reply is drawn in that one's place.
          if (first.get(block.part.id) !== block.part.id) return null;
          return (
            <ToolChain
              key={block.id}
              chain={chains.get(block.part.id) ?? [block.part]}
              draw={(part) => {
                const ToolBlock = (views[part.name] ?? views[block.part.name])!.Block!;
                return <ToolBlock part={part} />;
              }}
            />
          );
        }
        const part = block.part;
        if (part.type === "text") return <Markdown key={part.id} partId={part.id} streaming={part.status === "streaming"}>{part.text}</Markdown>;
        const custom = renderPart?.(part);
        if (custom) return <div key={part.id}>{custom}</div>;
        if (part.type === "widget") return <WidgetPartView key={part.id} part={part} />;
        if (part.type === "custom" && part.text) return <Markdown key={part.id}>{part.text}</Markdown>;
        return null;
      })}
      {message.status === "error" && (
        <p className="font-chat-sans text-(length:--chat-ui-font-size) leading-5 text-chat-danger">{message.error ?? labels.somethingWentWrong}</p>
      )}
      {streaming ? (
        <div className="h-7" />
      ) : (
        <div className="-ml-1.5 flex h-7 items-center gap-0.5">
          {copy && <CopyButton text={messageText(message)} />}
          {onReadAloud && (
            <IconButton label={labels.readAloud} size="sm" onPress={onReadAloud}>
              {icons.speak}
            </IconButton>
          )}
          {onFeedback && (
            <>
              <IconButton label={labels.goodResponse} size="sm" onPress={() => onFeedback("good")}>
                {icons.thumbsUp}
              </IconButton>
              <IconButton label={labels.badResponse} size="sm" onPress={() => onFeedback("bad")}>
                {icons.thumbsDown}
              </IconButton>
            </>
          )}
          {onRetry && (
            <IconButton label={labels.retry} size="sm" onPress={onRetry}>
              {icons.retry}
            </IconButton>
          )}
          {actions}
          {time && <span className={timeClass}>{formatRelativeTime(message.createdAt, undefined, labels)}</span>}
        </div>
      )}
    </div>
  );
}
