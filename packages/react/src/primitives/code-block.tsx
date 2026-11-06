import type React from "react";
import { clsx } from "clsx";
import { Fragment } from "react";
import { useCodeThemes } from "./appearance";
import { useHighlight } from "./highlight";

export interface CodeBlockProps {
  code: string;
  /** Language for highlighting ("bash", "tsx"). Unknown or missing languages show plain text. */
  language?: string;
  /** Small caption above the code. Defaults to the language. Pass "" for none. */
  label?: string;
  /** "boxed" for code in a message (bordered box); "plain" inside tool details. */
  variant?: "boxed" | "plain";
  className?: string;
}

/** Monospace code with Shiki highlighting, scrolling past a fixed height. */
export function CodeBlock({ code, language, label = language, variant = "plain", className }: CodeBlockProps) {
  const result = useHighlight(code, language);
  const lines = result?.lines;
  const themeBackground = useCodeThemes().background === "theme" && variant === "boxed" && !!result;
  // Highlighting lags the text while streaming: keep the colored part and show the newest text plain after it.
  const done = lines?.map((l) => l.map((t) => t.content).join("")).join("\n");
  const highlighted = lines && done !== undefined && code.startsWith(done) ? lines : undefined;
  const tail = highlighted ? code.slice(done!.length) : "";
  return (
    <div
      data-chat-code-block
      data-chat-code-bg={themeBackground ? "theme" : undefined}
      style={themeBackground ? (result.vars as React.CSSProperties) : undefined}
      className={clsx(
        variant === "boxed" && "my-4 rounded-chat-md border border-chat-code-border bg-chat-code-bg px-4 py-3.5",
        className,
      )}
    >
      {label && <div className="mb-3 font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle">{label}</div>}
      <pre
        className={clsx(
          "overflow-auto font-chat-mono text-(length:--chat-code-font-size) leading-[1.75] whitespace-pre text-chat-fg",
          variant === "plain" && "max-h-56",
          "[scrollbar-color:var(--chat-border-strong)_transparent] [scrollbar-width:thin]",
        )}
      >
        <code>
          {highlighted
            ? highlighted.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && "\n"}
                  {line.map((token, j) => (
                    <span key={j} className="chat-code-token" style={token.htmlStyle as React.CSSProperties}>
                      {token.content}
                    </span>
                  ))}
                </Fragment>
              ))
            : code}
          {tail}
        </code>
      </pre>
    </div>
  );
}
