import { cx } from "./cx";
import { useId, type ReactElement, type ReactNode } from "react";
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

/** Press handlers dropped from a button that is disabled with a reason; it only looks and announces as disabled. */
const pressHandlers = ["onPress", "onPressStart", "onPressEnd", "onPressChange", "onPressUp", "onClick"] as const;

/**
 * A disabled button that still explains itself. React Aria's `isDisabled` makes the button unfocusable and
 * hoverable-less, so there'd be nothing to hang a tooltip on. With a reason the button instead stays focusable
 * with `aria-disabled`, loses its press handlers and never submits a form, and the reason is shown as a tooltip
 * and read as its description.
 */
function useDisabledReason<P extends AriaButtonProps>(props: P, disabledReason: ReactNode) {
  const id = useId();
  const active = Boolean(props.isDisabled && disabledReason);
  if (!active) return { active, props, reasonId: undefined };
  const rest: Record<string, unknown> = { ...(props as Record<string, unknown>), isDisabled: false, type: "button" };
  for (const h of pressHandlers) delete rest[h];
  rest["aria-disabled"] = true;
  rest["data-disabled"] = true;
  rest["aria-describedby"] = [props["aria-describedby"], id].filter(Boolean).join(" ");
  return { active, props: rest as P, reasonId: id };
}

/** Hover and press styles are dropped while a button is disabled with a reason, to look as disabled as one that is. */
const noInteraction = (classes: string) => classes.replace(/data-(hovered|pressed):\S+\s*/g, "");

function WithReason({ active, reasonId, reason, children }: { active: boolean; reasonId: string | undefined; reason: ReactNode; children: ReactElement }) {
  if (!active) return children;
  return (
    <>
      <Tooltip content={reason}>{children}</Tooltip>
      <span id={reasonId} hidden>
        {reason}
      </span>
    </>
  );
}

export interface ButtonProps extends Omit<AriaButtonProps, "className"> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /**
   * Why the button is disabled. Only used with `isDisabled`: the button then stays focusable (`aria-disabled`,
   * no press handlers, never submits), shows the reason in a tooltip on hover and focus, and exposes it as its
   * accessible description.
   */
  disabledReason?: ReactNode;
  className?: string;
}

export function Button({ variant = "ghost", size = "md", className, disabledReason, ...rest }: ButtonProps) {
  const { active, props, reasonId } = useDisabledReason(rest, disabledReason);
  const button = (
    <AriaButton
      {...props}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center rounded-chat-sm font-chat-sans whitespace-nowrap transition-colors select-none [&_svg]:size-4 [&_svg]:shrink-0",
        "data-disabled:cursor-default data-disabled:opacity-40",
        focusRing,
        active ? noInteraction(variants[variant]) : variants[variant],
        sizes[size],
        className,
      )}
    />
  );
  return (
    <WithReason active={active} reasonId={reasonId} reason={disabledReason}>
      {button}
    </WithReason>
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
  /** Why the button is disabled; see `Button`. Replaces the label tooltip while the button is disabled. */
  disabledReason?: ReactNode;
  className?: string;
}

export function IconButton({ label, variant = "ghost", size = "md", tooltip = true, className, disabledReason, ...rest }: IconButtonProps) {
  const { active, props, reasonId } = useDisabledReason(rest, disabledReason);
  const button = (
    <AriaButton
      {...props}
      aria-label={label}
      className={cx(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-chat-sm transition-colors select-none",
        "data-disabled:cursor-default data-disabled:opacity-40 [&_svg]:size-4",
        focusRing,
        active ? noInteraction(variants[variant]) : variants[variant],
        // Quiet until hovered; the filled variants keep their own text color.
        variant === "ghost" && (active ? "text-chat-muted" : "text-chat-muted data-hovered:text-chat-fg"),
        // Touch screens get bigger targets (40px for md).
        size === "sm" ? "size-7 [@media(pointer:coarse)]:size-9" : "size-8 [@media(pointer:coarse)]:size-10",
        className,
      )}
    />
  );
  if (active) {
    return (
      <WithReason active reasonId={reasonId} reason={disabledReason}>
        {button}
      </WithReason>
    );
  }
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
