import { clsx } from "clsx";
import type { ReactNode } from "react";

export interface PanelProps {
  /** Header text; the header is left out when neither `title` nor `actions` is set. */
  title?: ReactNode;
  /** Right side of the header, e.g. expand and close buttons. */
  actions?: ReactNode;
  /** Pinned under the body. */
  footer?: ReactNode;
  children: ReactNode;
  /** "card": bordered and rounded, for grids and docks. "flush": no frame, for a pane that fills a column. */
  variant?: "card" | "flush";
  "aria-label"?: string;
  className?: string;
}

/**
 * A titled region that fills its container and lets the body scroll: a dock panel, an agent pane in a
 * grid, a settings card. A `ChatView` placed in the body sizes itself to the panel.
 */
export function Panel({ title, actions, footer, children, variant = "card", className, ...props }: PanelProps) {
  return (
    <section
      aria-label={props["aria-label"]}
      className={clsx(
        "flex min-h-0 min-w-0 flex-col overflow-hidden bg-chat-bg font-chat-sans text-chat-fg",
        variant === "card" && "rounded-chat-md border border-chat-border",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-chat-divider px-3 text-sm">
          <div className="min-w-0 flex-1 truncate font-medium">{title}</div>
          {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">{children}</div>
      {footer && <footer className="shrink-0 border-t border-chat-divider px-3 py-2">{footer}</footer>}
    </section>
  );
}
