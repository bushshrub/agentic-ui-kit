import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { Tooltip } from "./tooltip";

const focusRing = "outline-none data-focus-visible:ring-2 data-focus-visible:ring-chat-focus";

const variants = {
  /** Plain text button, highlights on hover. Sidebar rows, header buttons. */
  ghost: "text-chat-fg data-hovered:bg-chat-hover data-pressed:bg-chat-selected",
  /** Filled with the surface color, e.g. the selected Chat/Cowork toggle. */
  subtle: "bg-chat-surface font-medium text-chat-fg data-hovered:bg-chat-hover data-pressed:bg-chat-selected",
  /** A thin border, no fill: secondary actions next to a primary one, e.g. Cancel or Share. */
  outline: "border border-chat-border-strong font-medium text-chat-fg data-hovered:bg-chat-hover data-pressed:bg-chat-selected",
  /** The send button and the one main action of a dialog. */
  primary: "bg-chat-accent font-medium text-chat-accent-fg data-hovered:brightness-110 data-pressed:brightness-95",
  /**
   * Destructive confirmations, e.g. Delete chat. Fill --chat-danger-bg (default: --chat-danger, darkened so it
   * doesn't read as the accent), text --chat-danger-fg (default white).
   */
  danger: "bg-[var(--chat-danger-bg,color-mix(in_srgb,var(--chat-danger)_70%,black))] font-medium text-[var(--chat-danger-fg,#fff)] data-hovered:brightness-110 data-pressed:brightness-95",
};

const sizes = {
  sm: "h-7 gap-1.5 px-2 text-(length:--chat-ui-font-size) leading-5 [@media(pointer:coarse)]:h-9",
  md: "h-8 gap-2 px-2.5 text-(length:--chat-ui-font-size) leading-5 [@media(pointer:coarse)]:h-10",
  /** Dialog and empty-state actions. */
  lg: "h-9 gap-2 px-3.5 text-(length:--chat-ui-font-size) leading-5 [@media(pointer:coarse)]:h-11",
};

export interface ButtonProps extends Omit<AriaButtonProps, "className"> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
}

export function Button({ variant = "ghost", size = "md", className, ...props }: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={clsx(
        "inline-flex cursor-pointer items-center rounded-chat-sm font-chat-sans whitespace-nowrap transition-colors select-none [&_svg]:size-4 [&_svg]:shrink-0",
        "data-disabled:cursor-default data-disabled:opacity-40",
        focusRing,
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}

export interface IconButtonProps extends Omit<AriaButtonProps, "className" | "children"> {
  /** Accessible name, also shown as the tooltip. */
  label: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: "sm" | "md";
  /** Show the label as a tooltip on hover. On by default. */
  tooltip?: boolean;
  className?: string;
}

export function IconButton({ label, variant = "ghost", size = "md", tooltip = true, className, ...props }: IconButtonProps) {
  const button = (
    <AriaButton
      {...props}
      aria-label={label}
      className={clsx(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-chat-sm transition-colors select-none",
        "data-disabled:cursor-default data-disabled:opacity-40 [&_svg]:size-4",
        focusRing,
        variants[variant],
        // Quiet until hovered; the filled variants keep their own text color.
        variant === "ghost" && "text-chat-muted data-hovered:text-chat-fg",
        // Touch screens get bigger targets (40px for md).
        size === "sm" ? "size-7 [@media(pointer:coarse)]:size-9" : "size-8 [@media(pointer:coarse)]:size-10",
        className,
      )}
    />
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
