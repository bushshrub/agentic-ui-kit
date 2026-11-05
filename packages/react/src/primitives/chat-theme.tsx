import { clsx } from "clsx";
import { useCallback, useRef, type ReactNode } from "react";
import { UNSAFE_PortalProvider } from "react-aria";

export interface ChatThemeProps {
  /** Value for `data-chat-theme`, matched by the host's theme CSS. */
  theme?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Applies a chat theme to part of a page. Menus, tooltips and dialogs opened inside render into this
 * element instead of `<body>`, so they get the same theme. An app themed as a whole (variables on
 * `:root`) does not need it.
 */
export function ChatTheme({ theme, children, className }: ChatThemeProps) {
  const portal = useRef<HTMLDivElement>(null);
  const getContainer = useCallback(() => portal.current, []);
  return (
    <div data-chat-theme={theme} className={clsx("bg-chat-bg font-chat-sans text-chat-fg", className)}>
      <UNSAFE_PortalProvider getContainer={getContainer}>{children}</UNSAFE_PortalProvider>
      <div ref={portal} />
    </div>
  );
}
