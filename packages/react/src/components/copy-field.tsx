import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { Button } from "../primitives/button";
import { IconSlot, useIcons } from "../primitives/icons";
import { useLabels } from "../primitives/labels";

export interface CopyFieldProps {
  /** The text shown and copied, e.g. a share link. */
  value: string;
  /** Accessible name of the input. Default: the `copyFieldLabel` label ("Link"). */
  "aria-label"?: string;
  /** Called after the text reached the clipboard. */
  onCopy?: () => void;
  className?: string;
}

/** How long "Copied" stays before the button reads "Copy" again. */
const COPIED_MS = 2000;

/**
 * A read-only, selectable field with a Copy button, for share links. The button says "Copied" for about two
 * seconds (and announces it to screen readers). Where the clipboard is unavailable or refuses, it selects the
 * text instead so the reader can copy it by hand.
 */
export function CopyField({ value, "aria-label": ariaLabel, onCopy, className }: CopyFieldProps) {
  const icons = useIcons();
  const labels = useLabels();
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(value);
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }
    setCopied(true);
    onCopy?.();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <div className={clsx("flex items-center gap-2 font-chat-sans", className)}>
      <input
        ref={inputRef}
        readOnly
        value={value}
        aria-label={ariaLabel ?? labels.copyFieldLabel}
        onFocus={(e) => e.currentTarget.select()}
        className="h-9 min-w-0 flex-1 rounded-chat-md border border-chat-border bg-chat-bg px-3 text-(length:--chat-ui-font-size) text-chat-fg outline-none focus:border-chat-border-strong"
      />
      <Button variant="subtle" size="lg" onPress={() => void copy()}>
        <IconSlot>{copied ? icons.copied : icons.copy}</IconSlot>
        {copied ? labels.copied : labels.copy}
      </Button>
      <span role="status" className="sr-only">
        {copied ? labels.copied : ""}
      </span>
    </div>
  );
}
