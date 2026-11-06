import { clsx } from "clsx";
import { useCallback, useRef, type ReactNode } from "react";
import { UNSAFE_PortalProvider } from "react-aria";
import { AppearanceProvider, type ChatMotion, type CodeThemes } from "./appearance";
import { IconsProvider, type ChatIcons } from "./icons";
import { LabelsProvider, type ChatLabels } from "./labels";

export interface ChatThemeProps {
  /** Value for `data-chat-theme`, matched by the host's theme CSS. */
  theme?: string;
  /** Shiki themes for code blocks and Markdown fences, e.g. `{ light: "catppuccin-latte", dark: "dracula" }`. */
  codeThemes?: CodeThemes;
  /**
   * "system" (default) follows the OS reduced-motion setting; "reduce" applies the reduced rules even without
   * it; "full" keeps animations even with it. An app that does not use ChatTheme can put
   * `data-chat-motion="reduce"` (or "full") on <html> instead: the CSS and the JS checks both honor it.
   */
  motion?: ChatMotion;
  /**
   * Overrides for the kit's UI strings, to reword or translate it. Merged over the parent ChatTheme's labels,
   * then over the English defaults. Functions take the values that go into the text.
   */
  labels?: Partial<ChatLabels>;
  /**
   * Overrides for the kit's icons (SVG elements). Merged over the parent ChatTheme's icons, then over the
   * Lucide defaults.
   */
  icons?: Partial<ChatIcons>;
  children: ReactNode;
  className?: string;
}

/**
 * Applies a chat theme to part of a page. Menus, tooltips and dialogs opened inside render into this
 * element instead of `<body>`, so they get the same theme. An app themed as a whole (variables on
 * `:root`) does not need it for colors, but still uses it for `codeThemes` and `motion`. The element is
 * `height: 100%` of its parent by default (so `ChatView` has a height without Tailwind); a `className` such
 * as `h-screen`, or a style rule of your own, replaces that.
 */
export function ChatTheme({ theme, codeThemes, motion, labels, icons, children, className }: ChatThemeProps) {
  const portal = useRef<HTMLDivElement>(null);
  const getContainer = useCallback(() => portal.current, []);
  return (
    <div
      data-chat-root=""
      data-chat-theme={theme}
      data-chat-motion={motion}
      className={clsx("bg-chat-bg font-chat-sans text-chat-fg", className)}
    >
      <AppearanceProvider codeThemes={codeThemes} motion={motion}>
        <LabelsProvider labels={labels}>
          <IconsProvider icons={icons}>
            <UNSAFE_PortalProvider getContainer={getContainer}>{children}</UNSAFE_PortalProvider>
          </IconsProvider>
        </LabelsProvider>
      </AppearanceProvider>
      <div ref={portal} />
    </div>
  );
}
