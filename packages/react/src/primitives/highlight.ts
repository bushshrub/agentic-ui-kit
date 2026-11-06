import { useEffect, useState } from "react";
import type { ThemedToken } from "shiki";
import { DEFAULT_CODE_THEMES, useCodeThemes } from "./appearance";

/**
 * Shiki themes for code (default github-light / one-dark-pro, or the host's `codeThemes`). Each token
 * carries both colors as --shiki-light / --shiki-dark, and CSS picks one with light-dark() from the chat
 * theme's color-scheme. Blocks use --chat-code-bg unless `codeThemes.background` is "theme".
 */
type Shiki = typeof import("shiki");

/**
 * Shiki with its JavaScript regex engine, not the default Oniguruma WebAssembly one, so a page needs no
 * `'wasm-unsafe-eval'` in its Content Security Policy. Languages and themes load on demand.
 */
let shiki: Promise<{ lib: Shiki; highlighter: Awaited<ReturnType<Shiki["createHighlighter"]>> }> | undefined;
const loadShiki = () =>
  (shiki ??= (async () => {
    const [lib, { createJavaScriptRegexEngine }] = await Promise.all([import("shiki"), import("shiki/engine/javascript")]);
    const highlighter = await lib.createHighlighter({ themes: [], langs: [], engine: createJavaScriptRegexEngine({ forgiving: true }) });
    return { lib, highlighter };
  })().catch((error) => {
    shiki = undefined;
    throw error;
  }));

/** Highlighted lines of tokens, plus the themes' own background and text color as CSS variables. */
export interface Highlighted {
  lines: ThemedToken[][];
  /** `--shiki-light-bg`, `--shiki-dark-bg`, `--shiki-light` and `--shiki-dark` for the block itself. */
  vars: Record<string, string>;
}

const cache = new Map<string, Highlighted>();
const warned = new Set<string>();

/** The theme id if Shiki bundles it; otherwise the default, with one console.warn per unknown id. */
function pick(id: string | undefined, fallback: string, known: Record<string, unknown>): string {
  if (!id) return fallback;
  if (Object.hasOwn(known, id)) return id;
  if (!warned.has(id)) {
    warned.add(id);
    console.warn(`agentic-ui-kit: unknown Shiki code theme "${id}", using "${fallback}".`);
  }
  return fallback;
}

let failedWarned = false;

/** One console.warn when highlighting breaks (a blocked chunk, a CSP violation), instead of silently showing plain code. */
function warnFailed(error: unknown) {
  if (failedWarned) return;
  failedWarned = true;
  console.warn("agentic-ui-kit: code highlighting failed, showing plain code.", error);
}

/** Parses "--a:#fff;--b:#000" into an object. */
function parseVars(css: string | undefined): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const part of css?.split(";") ?? []) {
    const at = part.indexOf(":");
    if (at > 0) vars[part.slice(0, at).trim()] = part.slice(at + 1).trim();
  }
  return vars;
}

async function highlight(code: string, language: string, light?: string, dark?: string): Promise<Highlighted | undefined> {
  const key = `${light}\n${dark}\n${language}\n${code}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const {
    lib: { bundledLanguages, bundledLanguagesAlias, bundledThemes },
    highlighter,
  } = await loadShiki();
  const lang = language.toLowerCase();
  if (!(lang in bundledLanguages) && !(lang in bundledLanguagesAlias)) return undefined;
  // Themes load on demand inside codeToTokens, like languages; here we only check the ids exist.
  const themes = {
    light: pick(light, DEFAULT_CODE_THEMES.light, bundledThemes),
    dark: pick(dark, DEFAULT_CODE_THEMES.dark, bundledThemes),
  };
  await Promise.all([
    highlighter.loadLanguage(lang as keyof typeof bundledLanguages),
    highlighter.loadTheme(themes.light as keyof typeof bundledThemes, themes.dark as keyof typeof bundledThemes),
  ]);
  const { tokens, bg, fg } = highlighter.codeToTokens(code, { lang: lang as keyof typeof bundledLanguages, themes, defaultColor: false });
  const result = { lines: tokens, vars: { ...parseVars(bg), ...parseVars(fg) } };
  if (cache.size > 200) cache.clear();
  cache.set(key, result);
  return result;
}

/**
 * Highlights `code` in the background, with the themes from the nearest ChatTheme. Returns the latest
 * finished result, so streaming code keeps its colors while the next version is highlighted instead of
 * flashing back to plain text; a theme change re-highlights.
 */
export function useHighlight(code: string, language: string | undefined): Highlighted | undefined {
  const { light, dark } = useCodeThemes();
  const [result, setResult] = useState<Highlighted>();
  useEffect(() => {
    if (!language) return setResult(undefined);
    let cancelled = false;
    highlight(code, language, light, dark).then(
      (r) => !cancelled && setResult(r),
      (error) => {
        warnFailed(error);
        if (!cancelled) setResult(undefined);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [code, language, light, dark]);
  return result;
}
