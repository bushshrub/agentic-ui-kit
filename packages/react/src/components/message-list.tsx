import type { Message, Part } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { useIcons } from "../primitives/icons";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconButton } from "../primitives/button";
import { useLabels } from "../primitives/labels";
import { laterReplacements, LaterReplacements } from "./replacements";
import { AssistantMessage, UserMessage, type Feedback, type MessageActions } from "./messages";

export interface MessageListProps {
  messages: Message[];
  onRetry?: (assistantId: string) => void;
  onEdit?: (userId: string) => void;
  onFeedback?: (assistantId: string, feedback: Feedback) => void;
  /** Read aloud button on assistant messages. */
  onReadAloud?: (assistantId: string) => void;
  /** Add your own buttons to each message's action row, or hide copy and the time. */
  actions?: MessageActions;
  renderPart?: (part: Part) => ReactNode;
  /** Under the last message, inside the scroll area, e.g. the docked composer. Stays in view at the bottom. */
  footer?: ReactNode;
  /** Above the first message, inside the column; scrolls with the conversation. E.g. a ChatNotice. */
  header?: ReactNode;
  /** Where reading starts: "bottom" (default, a live chat) or "top" (a transcript read from the start). */
  start?: "bottom" | "top";
  className?: string;
}

/** How close to the bottom still counts as "at the bottom", in px. */
const STICK_SLOP = 48;

/**
 * The scrolling conversation. It follows a streaming reply while the reader is at the bottom and leaves
 * them alone once they scroll up, with a button to jump back. Sending a message always jumps down.
 */
export function MessageList({ messages, onRetry, onEdit, onFeedback, onReadAloud, actions, renderPart, header, footer, start = "bottom", className }: MessageListProps) {
  const icons = useIcons();
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stuck = useRef(start === "bottom");
  const labels = useLabels();
  const later = useMemo(() => laterReplacements(messages), [messages]);
  const [atBottom, setAtBottom] = useState(true);

  const toBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const nearBottom = () => {
    const el = scroller.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < STICK_SLOP;
  };

  const onScroll = () => {
    const bottom = nearBottom();
    stuck.current = bottom;
    setAtBottom(bottom);
  };

  // Follow growing content while stuck.
  useEffect(() => {
    const el = content.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (stuck.current) toBottom();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [toBottom]);

  // A new user message means the reader just sent it: go to the bottom. Read from the top, the messages
  // there on mount do not count; only note whether there is more below.
  const lastUser = messages.findLast((m) => m.role === "user")?.id;
  const jumpedFor = useRef<string | undefined | null>(start === "top" ? lastUser : null);
  useLayoutEffect(() => {
    if (lastUser === jumpedFor.current) {
      // Only the button. Following growth starts when the reader scrolls: a page that is short at mount
      // (a notice, a widget still loading) is "at the bottom" until it grows, and must not follow it.
      setAtBottom(nearBottom());
      return;
    }
    jumpedFor.current = lastUser;
    stuck.current = true;
    setAtBottom(true);
    toBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nearBottom only reads refs
  }, [lastUser, toBottom]);

  return (
    <div className={clsx("relative min-h-0 flex-1", className)}>
      <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto [scrollbar-gutter:stable] [scrollbar-width:thin]">
        <div ref={content} className="flex min-h-full flex-col">
          <div
            role="log"
            aria-label={labels.conversation}
            className="mx-auto flex w-full max-w-[calc(var(--chat-content-width)+2*var(--chat-gutter,var(--chat-content-padding)))] flex-1 flex-col gap-6 px-[var(--chat-gutter,var(--chat-content-padding))] pt-6 pb-4"
          >
            {header}
            <LaterReplacements value={later}>
            {messages.map((m) =>
              m.role === "user" ? (
                <UserMessage key={m.id} message={m} {...(onEdit && { onEdit: () => onEdit(m.id) })} {...(actions?.extra && { actions: actions.extra(m) })} {...(actions?.copy === false && { copy: false })} {...(actions?.time === false && { time: false })} />
              ) : (
                <AssistantMessage
                  key={m.id}
                  message={m}
                  {...(onRetry && { onRetry: () => onRetry(m.id) })}
                  {...(onFeedback && { onFeedback: (f: Feedback) => onFeedback(m.id, f) })}
                  {...(onReadAloud && { onReadAloud: () => onReadAloud(m.id) })}
                  {...(actions?.extra && { actions: actions.extra(m) })} {...(actions?.copy === false && { copy: false })} {...(actions?.time === false && { time: false })}
                  {...(renderPart && { renderPart })}
                />
              ),
            )}
            </LaterReplacements>
          </div>
          {footer && <div className="sticky bottom-0">{footer}</div>}
        </div>
      </div>
      {!atBottom && (
        <IconButton
          label={labels.scrollToBottom}
          variant="subtle"
          onPress={() => {
            stuck.current = true;
            toBottom("smooth");
          }}
          className="absolute bottom-[min(10rem,40%)] left-1/2 -translate-x-1/2 rounded-full border border-chat-border shadow-chat-popover"
        >
          {icons.scrollToBottom}
        </IconButton>
      )}
    </div>
  );
}
