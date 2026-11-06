import { clsx } from "clsx";
import { useIcons, IconSlot } from "../primitives/icons";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../primitives/appearance";
import { useLabels } from "../primitives/labels";

/** Compact token count: 526, 1.4k, 33k, 76.8k, 1M. */
export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${trim(n / 1000)}k`;
  return `${trim(n / 1_000_000)}M`;
}

function trim(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

/**
 * Follows `target` with a number that counts up smoothly instead of jumping. Each frame closes part of the
 * gap, so bursts of tokens roll in rather than land at once. Jumps straight there with reduced motion.
 */
export function useCountUp(target: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const prefersReducedMotion = useReducedMotion();
  useEffect(() => {
    if (prefersReducedMotion()) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(Math.max(now - last, 0), 100);
      last = now;
      const gap = target - valueRef.current;
      // Close ~90% of the gap per 250ms, at least one token per frame, never past the target.
      const move = Math.min(Math.max(Math.abs(gap) * (1 - Math.pow(0.1, dt / 250)), 1), Math.abs(gap));
      const next = Math.abs(gap) < 1 ? target : valueRef.current + Math.sign(gap) * move;
      valueRef.current = next;
      setValue(next);
      if (next !== target) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, prefersReducedMotion]);
  return Math.round(value);
}

export interface TokenCounterProps {
  /** Tokens so far, e.g. from `activityTokens(parts)` or `outputTokens(message)`. */
  tokens: number;
  /** "standalone": "↓ 1.2k tokens". "inline": "(1.2k tokens)", for inside a heading. */
  variant?: "standalone" | "inline";
  className?: string;
}

/** A token count that counts up as `tokens` grows and holds still when it stops growing. */
export function TokenCounter({ tokens, variant = "standalone", className }: TokenCounterProps) {
  const icons = useIcons();
  const shown = useCountUp(tokens);
  const labels = useLabels();
  if (variant === "inline") {
    return <span className={clsx("text-chat-subtle tabular-nums", className)}>({labels.tokenCount(formatTokens(shown))})</span>;
  }
  return (
    <span className={clsx("inline-flex items-center gap-1 font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle tabular-nums", className)}>
      <IconSlot className="[&_svg]:size-3">{icons.tokens}</IconSlot>
      {labels.tokenCount(formatTokens(shown))}
    </span>
  );
}
