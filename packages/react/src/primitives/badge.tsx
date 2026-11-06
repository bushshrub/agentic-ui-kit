import { clsx } from "clsx";
import type { ReactNode } from "react";

const tones = {
  /** Outlined, e.g. "Recommended". */
  outline: "border border-chat-border-strong text-chat-muted",
  /** Amber, e.g. "5.5× or more usage". */
  warning: "bg-chat-warning-bg text-chat-warning",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: keyof typeof tones;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ children, tone = "outline", icon, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-px font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 whitespace-nowrap [&_svg]:size-3",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
