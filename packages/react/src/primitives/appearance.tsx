import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

/** Shiki theme ids (any bundled theme: "dracula", "catppuccin-latte", "github-dark", ...). */
export interface CodeThemes {
  /** Theme used where the chat theme's color-scheme is light. Default "github-light". */
  light?: string;
  /** Theme used where the color-scheme is dark. Default "one-dark-pro". */
  dark?: string;
  /**
   * Where a boxed code block gets its background: "kit" uses `--chat-code-bg` (default, so existing hosts do
   * not change); "theme" uses the Shiki theme's own background and text color.
   */
  background?: "kit" | "theme";
}

/** "system" follows the OS reduced-motion setting; "reduce" always reduces; "full" keeps animations. */
export type ChatMotion = "system" | "reduce" | "full";

export const DEFAULT_CODE_THEMES = { light: "github-light", dark: "one-dark-pro" } as const;

interface Appearance {
  codeThemes?: CodeThemes | undefined;
  motion?: ChatMotion | undefined;
}

const AppearanceContext = createContext<Appearance>({});

export function AppearanceProvider({ codeThemes, motion, children }: Appearance & { children: ReactNode }) {
  const { light, dark, background } = codeThemes ?? {};
  // Keyed on the values, so an inline `codeThemes={{ ... }}` does not change the context every render.
  const value = useMemo(
    () => ({
      codeThemes: { ...(light && { light }), ...(dark && { dark }), ...(background && { background }) },
      motion,
    }),
    [light, dark, background, motion],
  );
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useCodeThemes(): CodeThemes {
  return useContext(AppearanceContext).codeThemes ?? {};
}

/**
 * Whether motion should be reduced, for a given `motion` setting. "system" also honors
 * `data-chat-motion` on <html> (for hosts that do not use ChatTheme), then the OS media query.
 */
export function shouldReduceMotion(motion: ChatMotion = "system"): boolean {
  if (motion !== "system") return motion === "reduce";
  if (typeof document !== "undefined") {
    const root = document.documentElement.getAttribute("data-chat-motion");
    if (root === "reduce" || root === "full") return root === "reduce";
  }
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns a function that tells, at call time, whether JS-driven animation (text streaming, counters)
 * should be skipped. Call it inside effects. The CSS side uses the same setting through `data-chat-motion`.
 */
export function useReducedMotion(): () => boolean {
  const { motion } = useContext(AppearanceContext);
  return useCallback(() => shouldReduceMotion(motion), [motion]);
}
