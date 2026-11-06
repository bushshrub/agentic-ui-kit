/**
 * The visualize preset: a tool the model calls to draw an interactive visual inline (like claude.ai's
 * visualize tool), and the design guide to put in the system prompt. The kit's `show_widget` tool view feeds
 * the streaming `widget_code` into a sandboxed WidgetFrame. The backend runs the tool as a no-op ("shown").
 */

/** Input of the visualize tool, as the model writes it. */
export interface VisualizeInput {
  widget_code: string;
  title?: string;
  loading_messages?: string[];
}

/** The tool definition to give the model. Same shape as a page tool's `ToolSpec`. */
export const visualizeTool = {
  name: "show_widget",
  description:
    "Draw an interactive visual inline in your reply: a chart, diagram, map, calendar, calculator, planner. " +
    "Write an HTML fragment or an <svg> in widget_code; it runs in a sandboxed frame that matches the chat's " +
    "theme. Follow the visual design guide in your instructions.",
  inputSchema: {
    type: "object",
    properties: {
      widget_code: {
        type: "string",
        description: "An HTML fragment (no <html>, <head> or <body>) or an <svg>. Inline <style> and <script> are allowed.",
      },
      title: { type: "string", description: "Short snake_case name for the visual, e.g. gym_week." },
      loading_messages: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 4,
        description: "1-4 short lines shown while you write it, e.g. \"Finding free slots\".",
      },
    },
    required: ["widget_code"],
  },
} as const;

/** Design guide for the system prompt when the visualize tool is on. */
export const visualizeGuide = `## Visuals (show_widget)
Use show_widget when a visual says it better than text: data to compare, a plan to adjust, a place to see, a
process to step through. Keep explaining in text around it; the widget is not the whole answer.

How the frame works
- widget_code is a fragment: no <!doctype>, <html>, <head> or <body>. Put <style> first, then markup, then <script>.
- It renders while you write it; scripts run once it is complete, in order. Put scripts last.
- No network unless the host allows it: no fetch, no external images or fonts. Inline your data.
- The background is transparent and the frame sizes itself to your content. Add no outer margin or padding,
  no outer border or card around the whole widget, and no fixed height on the root.
- Two globals: sendPrompt(text) sends a message as the user (for "Add these to my calendar", "Explain this"),
  openLink(url) opens an http(s) link. Prefer local state (JavaScript in the widget) over round trips: filter,
  toggle, recalculate and animate in place; use sendPrompt only for what needs you.

Look
- Use the chat's theme variables, never hard-coded colors or fonts: var(--chat-fg) text, var(--chat-muted) and
  var(--chat-subtle) secondary text, var(--chat-surface) and var(--chat-raised) fills, var(--chat-border) and
  var(--chat-divider) lines, var(--chat-hover) hover, var(--chat-accent) with var(--chat-accent-fg) for the one
  thing that matters most, var(--chat-check) good, var(--chat-warning), var(--chat-danger) bad;
  var(--chat-font-sans), var(--chat-font-mono); var(--chat-ui-font-size), var(--chat-ui-font-size-sm);
  var(--chat-radius-sm), var(--chat-radius-md), var(--chat-radius-lg).
- Quiet by default: thin borders, few fills, one accent. Readable labels, aligned numbers, no decoration.
- Set apart what you added or changed from what was already there: your proposals in the accent with a small
  "New" (or "Changed") tag, existing data quiet. The user must see at a glance what is yours.
- Make it work on a narrow screen (down to 320px wide) and with a keyboard: real <button>s, visible focus.`;

/** What `checkWidgetCode` found. */
export interface WidgetCodeCheck {
  /** Nothing will break: no errors (warnings may remain). */
  ok: boolean;
  /** Things that break the widget in the sandbox. */
  errors: string[];
  /** Things that work but look wrong in the chat, e.g. hard-coded colors. */
  warnings: string[];
  /** A message to return to the model as the tool result. */
  feedback: string;
}

const originOf = (url: string) => {
  try {
    return new URL(url).origin.toLowerCase();
  } catch {
    return undefined;
  }
};

/**
 * Checks widget code before it reaches the user, so a harness can send problems back to the model as the
 * tool result. `allow` is what the host lets widgets load (the same `allow` as the chat's `widgets`).
 */
export function checkWidgetCode(
  html: unknown,
  allow: { resourceDomains?: string[]; connectDomains?: string[] } = {},
  toolName: string = visualizeTool.name,
): WidgetCodeCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (typeof html !== "string" || !html.trim()) {
    errors.push("widget_code: required, an HTML fragment or an <svg>");
  } else {
    if (/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html)) errors.push("Send a fragment: no <!doctype>, <html>, <head> or <body>.");
    const allowed = (allow.resourceDomains ?? []).map((d) => d.toLowerCase().replace(/\/$/, ""));
    const fits = (origin: string) => allowed.some((a) => a === origin || (a.includes("*.") && origin.endsWith(a.slice(a.indexOf("*.") + 1)) && origin.startsWith(a.slice(0, a.indexOf("*.")))));
    const blocked = new Set<string>();
    for (const m of html.matchAll(/(?:src|href)\s*=\s*["']?(https?:\/\/[^"'\s>]+)|url\(\s*["']?(https?:\/\/[^"')\s]+)|@import\s+["'](https?:\/\/[^"']+)/gi)) {
      const origin = originOf(m[1] ?? m[2] ?? m[3] ?? "");
      if (origin && !fits(origin) && !/<a\s[^>]*$/i.test(html.slice(0, m.index))) blocked.add(origin);
    }
    if (blocked.size) {
      errors.push(`Blocked by the sandbox: ${[...blocked].join(", ")}. ${allowed.length ? `Only ${allowed.join(", ")} may be loaded.` : "Nothing external may be loaded."} Inline it instead.`);
    }
    if (!(allow.connectDomains ?? []).length && /\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|EventSource\s*\(/.test(html)) {
      errors.push("Network calls (fetch, XHR, WebSocket) are blocked: inline the data.");
    }
    if (/\b(localStorage|sessionStorage|document\.cookie|indexedDB)\b/.test(html)) {
      errors.push("Storage (localStorage, cookies, indexedDB) is not available in the sandbox: keep state in variables.");
    }
    if (/\b(alert|confirm|prompt)\s*\(/.test(html)) errors.push("alert/confirm/prompt are blocked: show it in the widget, or use sendPrompt(text).");
    if (/<form[\s>]/i.test(html) && /type\s*=\s*["']?submit/i.test(html)) warnings.push("Form submits are blocked: handle the button's click in a script.");
    const colors = new Set([...html.matchAll(/(?<![\w-])(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\))/gi)].map((m) => m[1]!.toLowerCase()));
    if (colors.size) warnings.push(`Hard-coded colors (${[...colors].slice(0, 5).join(", ")}${colors.size > 5 ? ", ..." : ""}): use var(--chat-*) so it matches the theme.`);
  }
  const ok = errors.length === 0;
  const lines = [...errors, ...warnings].map((e) => `- ${e}`).join("\n");
  const feedback = ok && !warnings.length ? "Shown to the user." : ok ? `Shown. To fit the chat better next time:\n${lines}` : `Shown, but it will not work as written. Fix these and call ${toolName} again:\n${lines}`;
  return { ok, errors, warnings, feedback };
}
