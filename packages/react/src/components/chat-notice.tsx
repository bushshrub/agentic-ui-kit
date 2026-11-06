import { clsx } from "clsx";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

export interface ChatNoticeProps {
  children: ReactNode;
  /** Under the text, e.g. a Report button. */
  actions?: ReactNode;
  /** Default an info icon; `null` for none. */
  icon?: ReactNode;
  className?: string;
}

/** A bordered note in the conversation column: "Shared by Alex. This is a copy of a chat…" with actions under it. */
export function ChatNotice({ children, actions, icon = <Info />, className }: ChatNoticeProps) {
  return (
    <div role="note" className={clsx("flex gap-3 rounded-chat-lg border border-(--chat-notice-border,var(--chat-border)) bg-(--chat-notice-bg,transparent) px-4 py-3.5 font-chat-sans text-sm leading-relaxed text-chat-fg", className)}>
      {icon && <span className="mt-0.5 shrink-0 text-chat-muted [&_svg]:size-4">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div>{children}</div>
        {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
