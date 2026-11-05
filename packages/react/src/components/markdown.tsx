import { createMathPlugin } from "@streamdown/math";
import { clsx } from "clsx";
import { memo, useState, type ReactNode } from "react";
import { defaultRehypePlugins, Streamdown, type Components } from "streamdown";
import { CodeBlock } from "../primitives/code-block";
import { useSmoothText } from "../hooks/smooth-text";
import { rehypeWordFade } from "./word-fade";

const fadePlugins = [...Object.values(defaultRehypePlugins), rehypeWordFade];

const math = createMathPlugin({ singleDollarTextMath: true });

/** Streamdown's own utility classes get this prefix, so neither they nor the host's classes apply. */
const PREFIX = "llmchat";

interface HastNode {
  type: string;
  value?: string;
  children?: HastNode[];
  position?: { start: { line: number }; end: { line: number } };
}

function textOf(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

const components: Components = {
  // Fenced blocks render as our CodeBlock; `pre` only passes through so the block is not nested in a pre.
  pre: ({ children }) => <>{children}</>,
  code: ({ node, className, children }) => {
    const hast = node as HastNode | undefined;
    const language = /language-([\w+#-]+)/.exec(className ?? "")?.[1];
    const multiline = hast?.position && hast.position.start.line !== hast.position.end.line;
    if (!language && !multiline) return <code data-chat-inline-code>{children}</code>;
    return <CodeBlock variant="boxed" code={textOf(hast).replace(/\n$/, "")} {...(language && { language })} />;
  },
};

export interface MarkdownProps {
  children: string;
  /** While true, text is paced and new words fade in; unfinished markdown is completed for display. */
  streaming?: boolean;
  className?: string;
}

/** Message markdown: GFM, KaTeX math ($…$ and $$…$$), Shiki code blocks, smooth fade-in while streaming. */
export function Markdown({ children, streaming = false, className }: MarkdownProps) {
  const text = useSmoothText(children, streaming);
  const animating = streaming || text.length < children.length;
  // Text that streamed in keeps its word spans after the stream ends, so the last words finish fading.
  // Messages loaded from history never get them.
  const [streamed, setStreamed] = useState(streaming);
  if (streaming && !streamed) setStreamed(true);
  return (
    <div className={clsx("chat-markdown", streamed && "chat-fade", className)}>
      <MarkdownBody text={text} animating={animating} fade={streamed} />
    </div>
  );
}

const MarkdownBody = memo(function MarkdownBody({
  text,
  animating,
  fade,
}: {
  text: string;
  animating: boolean;
  fade: boolean;
}): ReactNode {
  return (
    <Streamdown
      prefix={PREFIX}
      mode={animating || fade ? "streaming" : "static"}
      {...(fade && { rehypePlugins: fadePlugins })}
      plugins={{ math }}
      components={components}
      controls={false}
      lineNumbers={false}
      linkSafety={{ enabled: false }}
    >
      {text}
    </Streamdown>
  );
});
