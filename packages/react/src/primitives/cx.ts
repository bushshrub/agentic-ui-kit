import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Tailwind-merge only knows the stock theme scales. The kit's own radius, shadow and animation names
// (see @theme in styles.css) are registered here so that e.g. `rounded-none` or `shadow-none` from a caller
// replaces `rounded-chat-sm` instead of sitting beside it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["chat-sm", "chat-md", "chat-lg", "chat-popover"],
      shadow: ["chat-popover"],
      animate: [
        "chat-in",
        "chat-out",
        "chat-fade-in",
        "chat-fade-out",
        "chat-drawer-in",
        "chat-drawer-out",
        "chat-drawer-in-right",
        "chat-drawer-out-right",
        "chat-sheet-in",
        "chat-sheet-out",
      ],
    },
  },
});

/** `clsx` plus tailwind-merge: later classes win over earlier ones that set the same property, so a caller's `h-7` or `rounded-none` beats the kit's. */
export function cx(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
