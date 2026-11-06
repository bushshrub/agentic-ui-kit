import { createMathPlugin } from "@streamdown/math";
import { clsx } from "clsx";
import { createContext, memo, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultRehypePlugins, Streamdown, type Components } from "streamdown";
import { CodeBlock } from "../primitives/code-block";
import { UiMarkupBlock, useUiMarkupLanguage } from "./ui-tree";
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
  position?: { start: { line: number; offset?: number }; end: { line: number } };
}

function textOf(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

// Which message the markdown belongs to, so its ```ui blocks keep their state; unset, they show as code.
const BlockContext = createContext<{ id: string; streaming: boolean } | undefined>(undefined);

function Code({ node, className, children }: { node?: unknown; className?: string | undefined; children?: ReactNode }) {
  const hast = node as HastNode | undefined;
  const language = /language-([\w+#-]+)/.exec(className ?? "")?.[1];
  const ui = useUiMarkupLanguage();
  const block = useContext(BlockContext);
  const multiline = hast?.position && hast.position.start.line !== hast.position.end.line;
  if (!language && !multiline) return <code data-chat-inline-code>{children}</code>;
  const code = textOf(hast).replace(/\n$/, "");
  // The block's start line stays put while it streams, so it keys the block's state.
  if (block && ui && language === ui) return <UiMarkupBlock id={`${block.id}:${hast?.position?.start.line ?? 0}`} source={code} streaming={block.streaming} />;
  return <CodeBlock variant="boxed" code={code} {...(language && { language })} />;
}

const components: Components = {
  // Fenced blocks render as our CodeBlock; `pre` only passes through so the block is not nested in a pre.
  pre: ({ children }) => <>{children}</>,
  code: ({ node, className, children }) => <Code node={node} className={className} children={children} />,
};

/**
 * Draws some links in message markdown your way, e.g. a job link as a job row. Return undefined to keep the
 * kit's link. Set with `MarkdownLinksProvider`.
 */
export type RenderLink = (link: { href: string; children: ReactNode }) => ReactNode | undefined;

const LinksContext = createContext<RenderLink | undefined>(undefined);

export function MarkdownLinksProvider({ renderLink, children }: { renderLink: RenderLink; children: ReactNode }) {
  return <LinksContext.Provider value={renderLink}>{children}</LinksContext.Provider>;
}

export interface MarkdownProps {
  children: string;
  /** While true, text is paced and new words fade in; unfinished markdown is completed for display. */
  streaming?: boolean;
  className?: string;
  /**
   * The text part's id. With it, ```ui blocks are drawn with the components of the surrounding
   * `UiComponentsProvider` (their state is keyed by it); without it, they show as code.
   */
  partId?: string;
}

/** Message markdown: GFM, KaTeX math ($…$ and $$…$$), Shiki code blocks, smooth fade-in while streaming. */
export function Markdown({ children, streaming = false, className, partId }: MarkdownProps) {
  const text = useSmoothText(children, streaming);
  const animating = streaming || text.length < children.length;
  // Text that streamed in keeps its word spans after the stream ends, so the last words finish fading.
  // Messages loaded from history never get them.
  const [streamed, setStreamed] = useState(streaming);
  if (streaming && !streamed) setStreamed(true);
  return (
    <div className={clsx("chat-markdown", streamed && "chat-fade", className)}>
      <BlockScope id={partId} streaming={animating}>
        <MarkdownBody text={text} animating={animating} fade={streamed} />
      </BlockScope>
    </div>
  );
}

function BlockScope({ id, streaming, children }: { id: string | undefined; streaming: boolean; children: ReactNode }) {
  const value = useMemo(() => (id ? { id, streaming } : undefined), [id, streaming]);
  return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>;
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
  const renderLink = useContext(LinksContext);
  const withLinks = useMemo<Components>(
    () =>
      renderLink
        ? {
            ...components,
            a: ({ href, children }) => {
              const custom = href ? renderLink({ href, children }) : undefined;
              return custom !== undefined ? <>{custom}</> : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
            },
          }
        : components,
    [renderLink],
  );
  return (
    <Streamdown
      prefix={PREFIX}
      mode={animating || fade ? "streaming" : "static"}
      {...(fade && { rehypePlugins: fadePlugins })}
      plugins={{ math }}
      components={withLinks}
      controls={false}
      lineNumbers={false}
      linkSafety={{ enabled: false }}
    >
      {text}
    </Streamdown>
  );
});
