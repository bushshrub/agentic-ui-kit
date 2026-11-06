import type { Message, Part } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { MessageList } from "../components/message-list";
import { openInNewTab, WidgetHostProvider, type WidgetHost } from "../components/widget-frame";
import { densityVars, type Density } from "./chat-view";

export interface ChatTranscriptProps {
  messages: Message[];
  renderPart?: (part: Part) => ReactNode;
  /** What widgets may load and how their links open. Widgets here cannot send messages or call tools. */
  widgets?: Omit<WidgetHost, "onPrompt" | "onCallTool">;
  /** Above the conversation, e.g. a ChatHeader with the title and who shared it. */
  header?: ReactNode;
  /** Atop the conversation, scrolling with it: who shared it and what it is. E.g. a ChatNotice. */
  notice?: ReactNode;
  /** Pinned under the last message, e.g. "Continue this chat" or "Shared snapshot, may be out of date". */
  footer?: ReactNode;
  /** Where reading starts. Default "top", the start of the conversation. */
  start?: "top" | "bottom";
  density?: Density;
  contentWidth?: string;
  contentPadding?: string;
  className?: string;
}

/**
 * A conversation to read, not to continue: a shared chat, an export, a log. Same messages as ChatView,
 * with no composer, approvals, retry, edit or feedback. Copy stays.
 */
export function ChatTranscript({
  messages,
  renderPart,
  widgets,
  header,
  notice,
  footer,
  start = "top",
  density = "full",
  contentWidth,
  contentPadding,
  className,
}: ChatTranscriptProps) {
  const style = {
    ...densityVars[density],
    ...(contentWidth && { "--chat-content-width": contentWidth }),
    ...(contentPadding && { "--chat-content-padding": contentPadding }),
  } as CSSProperties;
  const host = useMemo<WidgetHost>(() => {
    const { allow, readResource } = { ...widgets };
    const onOpenLink = widgets && "onOpenLink" in widgets ? widgets.onOpenLink : openInNewTab;
    return { ...(allow && { allow }), ...(onOpenLink && { onOpenLink }), ...(readResource && { readResource }) };
  }, [widgets]);
  return (
    <div data-chat-density={density} style={style} className={clsx("chat-view flex h-full min-h-0 flex-col bg-chat-bg text-chat-fg", className)}>
      {header}
      <div className="chat-view-body flex min-h-0 flex-1 flex-col">
        <WidgetHostProvider host={host}>
        <MessageList
          messages={messages}
          start={start}
          {...(notice && { header: notice })}
          {...(renderPart && { renderPart })}
          {...(footer && {
            footer: (
              <div className="bg-linear-to-t from-chat-bg from-70% to-transparent px-(--chat-gutter) pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="mx-auto w-full max-w-(--chat-content-width)">{footer}</div>
              </div>
            ),
          })}
        />
        </WidgetHostProvider>
      </div>
    </div>
  );
}
