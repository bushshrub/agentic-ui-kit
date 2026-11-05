import { clsx } from "clsx";

/** The small filled triangle claude.ai uses after expandable labels. Points right; rotate to point down. */
export function Caret({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 8 8"
      className={clsx("size-2 shrink-0 fill-current transition-transform duration-150", className)}
    >
      <path d="M2 1.2 6.2 4 2 6.8z" />
    </svg>
  );
}
