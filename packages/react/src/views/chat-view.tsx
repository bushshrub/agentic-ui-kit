import type { Message, Part } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ApprovalCard } from "../components/approval-card";
import type { PendingApproval } from "../hooks/use-chat";
import { Composer, type ComposerProps } from "../components/composer";
import { MessageList } from "../components/message-list";
import type { Feedback } from "../components/messages";
import { useLabels } from "../primitives/labels";
import { openInNewTab, WidgetHostProvider, type WidgetHost } from "../components/widget-frame";

export type Density = "full" | "panel" | "inline";

/**
 * Column defaults per density; `contentWidth` / `contentPadding` override them. Only the message size changes
 * with density: UI text is the same in all three. A theme can set the other text-size variables per density
 * with `[data-chat-density="panel"] { --chat-ui-font-size: … }`.
 */
export const densityVars: Record<Density, CSSProperties> = {
  full: {},
  panel: { "--chat-content-width": "100%", "--chat-content-padding": "1rem", "--chat-message-font-size": "1rem" } as CSSProperties,
  inline: { "--chat-content-width": "100%", "--chat-content-padding": "0.75rem", "--chat-message-font-size": "0.9375rem" } as CSSProperties,
};

export interface ChatViewProps {
  messages: Message[];
  busy?: boolean;
  onSend: (text: string) => void;
  onStop?: () => void;
  /** Tool calls waiting on the user (`useChat().approvals`); the first shows above the composer. */
  approvals?: PendingApproval[];
  onApprove?: (partId: string, granted: boolean) => void;
  onRetry?: (assistantId: string) => void;
  onEdit?: (userId: string) => void;
  onFeedback?: (assistantId: string, feedback: Feedback) => void;
  renderPart?: (part: Part) => ReactNode;
  /**
   * What widgets (sandboxed visuals) may do: the domains they may load, and their callbacks. A widget's
   * sendPrompt sends through `onSend` and its links open in a new tab unless set here; set a callback to
   * `undefined` to turn it off.
   */
  widgets?: WidgetHost;
  /** Usually a `<ChatHeader>`. */
  header?: ReactNode;
  /** Passed to the composer: toolbar slots, placeholder, controlled text. */
  composer?: Partial<Omit<ComposerProps, "onSubmit" | "onStop" | "busy">>;
  /**
   * Shown instead of the list while there are no messages; gets the centered composer to place, e.g.
   * `(composer) => <EmptyState greeting="Good evening">{composer}</EmptyState>`. Defaults to the composer.
   */
  emptyState?: (composer: ReactNode) => ReactNode;
  /** Small print under the composer. */
  disclaimer?: ReactNode;
  /** "full": a page. "panel": a docked side panel. "inline": a small area inside a form. */
  density?: Density;
  /** Width of the message column, e.g. "48rem". Users can change it in settings. */
  contentWidth?: string;
  /** Padding beside the message column, e.g. "1.5rem". */
  contentPadding?: string;
  className?: string;
}

/** A whole chat: header, the conversation, the docked composer. An empty chat shows `emptyState`. */
export function ChatView({
  messages,
  busy = false,
  onSend,
  onStop,
  approvals,
  onApprove,
  onRetry,
  onEdit,
  onFeedback,
  renderPart,
  widgets,
  header,
  composer,
  emptyState,
  disclaimer,
  density = "full",
  contentWidth,
  contentPadding,
  className,
}: ChatViewProps) {
  const style = {
    ...densityVars[density],
    ...(contentWidth && { "--chat-content-width": contentWidth }),
    ...(contentPadding && { "--chat-content-padding": contentPadding }),
  } as CSSProperties;
  const host = useMemo<WidgetHost>(
    () => ({ onPrompt: onSend, onOpenLink: openInNewTab, ...widgets }),
    [onSend, widgets],
  );
  const empty = messages.length === 0;
  const [body, short] = useShortPane();
  const labels = useLabels();
  const pending = onApprove && approvals?.[0];
  const box = (variant: ComposerProps["variant"]) => (
    <Composer
      variant={density === "inline" || (short && !empty) ? "compact" : variant}
      busy={busy}
      onSubmit={onSend}
      {...(onStop && { onStop })}
      {...composer}
      {...(pending && { placeholder: labels.replyDirectly })}
    />
  );

  return (
    <div data-chat-density={density} style={style} className={clsx("chat-view flex h-full min-h-0 flex-col bg-chat-bg text-chat-fg", className)}>
      {header}
      <div ref={body} className="chat-view-body flex min-h-0 flex-1 flex-col">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-(--chat-gutter) pb-[10cqh]">
          <div className="w-full max-w-(--chat-content-width)">{emptyState ? emptyState(box("centered")) : box("centered")}</div>
        </div>
      ) : (
        <WidgetHostProvider host={host}>
        <MessageList
          messages={messages}
          {...(onRetry && { onRetry })}
          {...(onEdit && { onEdit })}
          {...(onFeedback && { onFeedback })}
          {...(renderPart && { renderPart })}
          footer={
            <div className={clsx("bg-linear-to-t from-chat-bg from-70% to-transparent px-(--chat-gutter)", short ? "pt-2" : "pt-4")}>
              <div className="mx-auto w-full max-w-(--chat-content-width)">
                {pending && <ApprovalCard key={pending.part.id} approval={pending} onRespond={onApprove} className="mb-2" />}
                {box("docked")}
                <div className={clsx("flex items-center justify-center py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] text-center font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle", short ? "min-h-2" : "min-h-6")}>
                  {disclaimer && !short && <span>{disclaimer}</span>}
                </div>
              </div>
            </div>
          }
        />
        </WidgetHostProvider>
      )}
      </div>
    </div>
  );
}

/** Below this pane height (px) the docked composer is one row and the disclaimer hides, e.g. stacked panes or a phone on its side. */
const SHORT_PANE = 360;

/** Tracks the chat body's own height, so it adapts to its pane rather than the window. */
function useShortPane() {
  const [short, setShort] = useState(false);
  const observer = useRef<ResizeObserver>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(([entry]) => entry && setShort(entry.contentRect.height < SHORT_PANE));
    observer.current.observe(el);
  }, []);
  return [ref, short] as const;
}

export interface EmptyStateProps {
  /** "Good evening, Alex". */
  greeting: ReactNode;
  /** Mark left of the greeting, e.g. a logo. */
  icon?: ReactNode;
  /** The centered composer. */
  children: ReactNode;
  /** Under the composer, e.g. suggestion chips. */
  footer?: ReactNode;
}

/** A new chat: greeting over a centered composer. */
export function EmptyState({ greeting, icon, children, footer }: EmptyStateProps) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="chat-empty-greeting flex items-center justify-center gap-3 text-center font-chat-serif text-[clamp(1.5rem,6cqw,2.5rem)] font-normal text-chat-fg">
        {icon && <span className="flex shrink-0 text-chat-accent [&_svg]:size-[1em]">{icon}</span>}
        {greeting}
      </h1>
      {children}
      {footer}
    </div>
  );
}
