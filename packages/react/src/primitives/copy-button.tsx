import { useState } from "react";
import { IconButton } from "./button";
import { useIcons } from "./icons";
import { useLabels } from "./labels";

/** Copies `text`; shows a check for a moment after. */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const icons = useIcons();
  const labels = useLabels();
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      label={copied ? labels.copied : labels.copy}
      size="sm"
      {...(className && { className })}
      onPress={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? icons.copied : icons.copy}
    </IconButton>
  );
}
