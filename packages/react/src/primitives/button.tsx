import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from "react-aria-components";
import { Tooltip } from "./tooltip";

const focusRing = "outline-none data-focus-visible:ring-2 data-focus-visible:ring-chat-focus";

const variants = {
  /** Plain text button, highlights on hover. Sidebar rows, header buttons. */
  ghost: "text-chat-fg data-hovered:bg-chat-hover data-pressed:bg-chat-selected",
  /** Filled with the surface color, e.g. the selected Chat/Cowork toggle. */
  subtle: "bg-chat-surface text-chat-fg data-hovered:bg-chat-hover data-pressed:bg-chat-selected",
  /** The send button. */
  primary: "bg-chat-accent text-chat-accent-fg data-hovered:brightness-110 data-pressed:brightness-95",
};

const sizes = {
  sm: "h-7 gap-1.5 px-2 text-sm [@media(pointer:coarse)]:h-9",
  md: "h-8 gap-2 px-2.5 text-sm [@media(pointer:coarse)]:h-10",
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
        "inline-flex cursor-pointer items-center rounded-chat-sm font-chat-sans whitespace-nowrap transition-colors select-none",
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
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-chat-sm text-chat-muted transition-colors select-none",
        "data-hovered:text-chat-fg data-disabled:cursor-default data-disabled:opacity-40 [&_svg]:size-4",
        focusRing,
        variants[variant],
        variant === "ghost" && "text-chat-muted",
        // Touch screens get bigger targets (40px for md).
        size === "sm" ? "size-7 [@media(pointer:coarse)]:size-9" : "size-8 [@media(pointer:coarse)]:size-10",
        className,
      )}
    />
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
