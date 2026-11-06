import { createMathPlugin } from "@streamdown/math";
import { clsx } from "clsx";
import { Children, createContext, type ComponentProps, type ComponentType, isValidElement, memo, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultComponents, defaultRehypePlugins, Streamdown, type Components } from "streamdown";
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

/** A list whose items are all links, as `MarkdownLinksProvider`'s `renderLinkList` receives it. */
export interface LinkList {
  /** True for a numbered list. */
  ordered: boolean;
  /** One entry per item: its target and the link text as rendered (with the fade and any inline math). */
  links: { href: string; children: ReactNode }[];
  /** The list as the kit draws it, to wrap or fall back to. */
  children: ReactNode;
}

/** Draws a list whose items are all links your way, e.g. a list of job links as cards. Return undefined to keep the list. */
export type RenderLinkList = (list: LinkList) => ReactNode | undefined;

interface Links {
  renderLink?: RenderLink | undefined;
  renderLinkList?: RenderLinkList | undefined;
}

const LinksContext = createContext<Links | undefined>(undefined);

export function MarkdownLinksProvider({
  renderLink,
  renderLinkList,
  children,
}: {
  /** Draws single links. */
  renderLink?: RenderLink;
  /** Draws a bullet or numbered list in which every item is a link (and nothing else). */
  renderLinkList?: RenderLinkList;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ renderLink, renderLinkList }), [renderLink, renderLinkList]);
  return <LinksContext.Provider value={value}>{children}</LinksContext.Provider>;
}

/** The rendered link an item consists of: an `a` alone, or alone in its paragraph (a loose list). */
function soleLink(children: ReactNode): { href: string; children: ReactNode } | undefined {
  const nodes = Children.toArray(children).filter((c) => !(typeof c === "string" && !c.trim()));
  if (nodes.length !== 1 || !isValidElement(nodes[0])) return undefined;
  const props = nodes[0].props as { href?: unknown; children?: ReactNode; node?: HastNode & { tagName?: string } };
  if (typeof props.href === "string") return { href: props.href, children: props.children };
  return props.node?.tagName === "p" ? soleLink(props.children) : undefined;
}

type ListProps = ComponentProps<typeof defaultComponents.ul>;

function listOf(ordered: boolean, props: ListProps, renderLinkList: RenderLinkList): ReactNode {
  const Default = (ordered ? defaultComponents.ol : defaultComponents.ul) as ComponentType<ListProps>;
  const { children } = props;
  const items = Children.toArray(children).filter((c) => isValidElement(c));
  const links = items.map((item) => soleLink((item.props as { children?: ReactNode }).children));
  const list = <Default {...props} />;
  if (links.length === 0 || links.some((l) => !l)) return list;
  return renderLinkList({ ordered, links: links as LinkList["links"], children: list }) ?? list;
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
  const { renderLink, renderLinkList } = useContext(LinksContext) ?? {};
  const withLinks = useMemo<Components>(
    () => ({
      ...components,
      ...(renderLink && {
        a: ({ href, children }: { href?: string | undefined; children?: ReactNode }) => {
          const custom = href ? renderLink({ href, children }) : undefined;
          return custom !== undefined ? <>{custom}</> : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
        },
      }),
      ...(renderLinkList && {
        ul: (props: ListProps) => listOf(false, props, renderLinkList),
        ol: (props: ListProps) => listOf(true, props, renderLinkList),
      }),
    }),
    [renderLink, renderLinkList],
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
