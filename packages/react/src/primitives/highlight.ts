import { useEffect, useState } from "react";
import type { ThemedToken } from "shiki";

/**
 * Shiki themes for code. Each token carries both colors as --shiki-light / --shiki-dark, and CSS picks one
 * with light-dark() from the chat theme's color-scheme. Backgrounds are ignored; blocks use --chat-code-bg.
 */
const THEMES = { light: "github-light", dark: "one-dark-pro" } as const;

type Shiki = typeof import("shiki");

let shiki: Promise<Shiki> | undefined;
const loadShiki = () => (shiki ??= import("shiki"));

/** Highlighted lines of tokens, or undefined while loading or for languages Shiki does not know. */
export type HighlightedLines = ThemedToken[][];

const cache = new Map<string, HighlightedLines>();

async function highlight(code: string, language: string): Promise<HighlightedLines | undefined> {
  const key = `${language}\n${code}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { codeToTokens, bundledLanguages, bundledLanguagesAlias } = await loadShiki();
  const lang = language.toLowerCase();
  if (!(lang in bundledLanguages) && !(lang in bundledLanguagesAlias)) return undefined;
  const { tokens } = await codeToTokens(code, { lang: lang as keyof typeof bundledLanguages, themes: THEMES, defaultColor: false });
  if (cache.size > 200) cache.clear();
  cache.set(key, tokens);
  return tokens;
}

/**
 * Highlights `code` in the background. Returns the latest finished result, so streaming code keeps its
 * colors while the next version is highlighted instead of flashing back to plain text.
 */
export function useHighlight(code: string, language: string | undefined): HighlightedLines | undefined {
  const [lines, setLines] = useState<HighlightedLines>();
  useEffect(() => {
    if (!language) return setLines(undefined);
    let cancelled = false;
    highlight(code, language).then(
      (result) => !cancelled && setLines(result),
      () => !cancelled && setLines(undefined),
    );
    return () => {
      cancelled = true;
    };
  }, [code, language]);
  return lines;
}
