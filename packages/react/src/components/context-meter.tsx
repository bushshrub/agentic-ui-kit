import type { ContextUsage } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Dialog, DialogTrigger } from "react-aria-components";
import { Button } from "../primitives/button";
import { useLabels } from "../primitives/labels";
import { Popover } from "../primitives/menu";
import { Tooltip } from "../primitives/tooltip";
import { ContextPanel, contextTotals } from "./context-panel";
import { formatTokens } from "./token-counter";

export interface ContextMeterProps {
  /** The same numbers ContextPanel takes. The ring fills to used/limit. */
  usage: ContextUsage;
  /** Replaces the tooltip text ("Context: 13.8k / 200k (7%)"). The accessible name stays the summary. */
  tooltip?: ReactNode;
  /** An extra line under the tooltip text, e.g. "Older messages will be summarized soon". */
  tooltipNote?: ReactNode;
  /** The numbers are not in yet: the ring spins and the panel does not open. */
  isLoading?: boolean;
  /** Fraction of the window from which the ring turns to the warning color. Default 0.75. */
  warnAt?: number;
  /** Fraction of the window from which the ring turns to the danger color. Default 0.9. */
  dangerAt?: number;
  /** Where the panel opens, relative to the ring. Default "top end". */
  placement?: "top" | "top start" | "top end" | "bottom" | "bottom start" | "bottom end";
  className?: string;
}

const SIZE = 16;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A small progress ring for the composer toolbar, filled to the share of the context window in use (accent,
 * then warning, then danger). Hover for the numbers; click or Enter opens the ContextPanel above it.
 */
export function ContextMeter({
  usage,
  tooltip,
  tooltipNote,
  isLoading = false,
  warnAt = 0.75,
  dangerAt = 0.9,
  placement = "top end",
  className,
}: ContextMeterProps) {
  const labels = useLabels();
  const { used } = contextTotals(usage);
  const fraction = usage.limit > 0 ? Math.min(used / usage.limit, 1) : 0;
  const summary = isLoading
    ? labels.contextLoading
    : labels.contextSummary(formatTokens(used), formatTokens(usage.limit), Math.round(fraction * 100));
  const color = fraction >= dangerAt ? "text-chat-danger" : fraction >= warnAt ? "text-chat-warning" : "text-chat-accent";

  const button = (
    <Button
      variant="ghost"
      size="sm"
      aria-label={summary}
      isDisabled={isLoading}
      className={clsx("size-7 justify-center px-0 text-chat-muted", isLoading && "data-disabled:opacity-100", className)}
    >
      <svg
        aria-hidden
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={clsx("size-4", isLoading && "motion-safe:animate-spin")}
        fill="none"
        strokeWidth={STROKE}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="var(--chat-raised)" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - (isLoading ? 0.25 : fraction))}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className={clsx(color, "transition-[stroke-dashoffset]")}
        />
      </svg>
    </Button>
  );

  return (
    <DialogTrigger>
      <Tooltip
        content={
          <>
            <div>{tooltip ?? summary}</div>
            {tooltipNote && <div className="text-chat-muted">{tooltipNote}</div>}
          </>
        }
      >
        {button}
      </Tooltip>
      <Popover placement={placement} className="w-80 overflow-auto p-3">
        <Dialog aria-label={labels.context} className="outline-none">
          <ContextPanel usage={usage} />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
