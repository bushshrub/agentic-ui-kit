import { createMathPlugin } from "@streamdown/math";
import { clsx } from "clsx";
import { Children, createContext, type ComponentProps, type ComponentType, isValidElement, memo, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultComponents, defaultRehypePlugins, Streamdown, type Components } from "streamdown";
import { CodeBlock } from "../primitives/code-block";
import { UiMarkupBlock, useUiMarkupLanguage } from "./ui-tree";
import { useSmoothText } from "../hooks/smooth-text";
import { rehypeWordFade } from "./word-fade";

// Streamdown's sanitizer, adjusted for images: `data:` image sources survive (the image component below
// decides what loads), and `<source>` (a srcset that would fetch on render) is dropped.
type Pluggable = (typeof defaultRehypePlugins)[string];
interface Schema {
  tagNames?: string[];
  protocols?: { src?: string[] };
}
const [sanitize, sanitizeSchema] = defaultRehypePlugins.sanitize as unknown as [Pluggable, Schema];
const rehypePlugins: Pluggable[] = Object.values({
  ...defaultRehypePlugins,
  sanitize: [
    sanitize,
    {
      ...sanitizeSchema,
      tagNames: sanitizeSchema.tagNames?.filter((t) => t !== "source"),
      protocols: { ...sanitizeSchema.protocols, src: [...(sanitizeSchema.protocols?.src ?? []), "data"] },
    },
  ] as Pluggable,
});
const fadePlugins = [...rehypePlugins, rehypeWordFade];

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

// Elements that fetch a URL on render and have no place in a reply; they never reach here past the sanitizer.
const dropped = Object.fromEntries(["source", "video", "audio", "track", "iframe", "embed", "object"].map((t) => [t, () => null]));

const components: Components = {
  ...dropped,
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

/** Draws an image in message markdown your way: an `<img>`, a link, or nothing (return null). Set with `MarkdownLinksProvider`. */
export type RenderImage = (image: { src: string; alt: string }) => ReactNode;

interface Links {
  renderLink?: RenderLink | undefined;
  renderLinkList?: RenderLinkList | undefined;
  renderImage?: RenderImage | undefined;
  imageOrigins?: string[] | "all" | undefined;
}

const LinksContext = createContext<Links | undefined>(undefined);

export function MarkdownLinksProvider({
  renderLink,
  renderLinkList,
  renderImage,
  imageOrigins,
  children,
}: {
  /** Draws single links. */
  renderLink?: RenderLink;
  /** Draws a bullet or numbered list in which every item is a link (and nothing else). */
  renderLinkList?: RenderLinkList;
  /**
   * Draws every image in a reply (markdown or raw HTML) your way. Without it, images load only from
   * `imageOrigins` and otherwise show as a link. Models can be tricked into writing an image whose URL
   * carries private data, and the browser would send it on render.
   */
  renderImage?: RenderImage;
  /**
   * Origins (`"https://cdn.example.com"`) whose images load as `<img>`, or `"all"` for any (not advised for
   * replies built from web pages or other untrusted text). `data:image/` URLs always load. Default: none.
   */
  imageOrigins?: string[] | "all";
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ renderLink, renderLinkList, renderImage, imageOrigins }),
    [renderLink, renderLinkList, renderImage, imageOrigins],
  );
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

const originOf = (url: string, base?: string): string | undefined => {
  try {
    return new URL(url, base).origin;
  } catch {
    return undefined;
  }
};

/** Whether an image may load on render. Relative and protocol-relative URLs count as the page's origin or the one they name. */
function imageAllowed(src: string, origins: string[] | "all" | undefined): boolean {
  if (/^data:image\//i.test(src)) return true;
  if (origins === "all") return /^(https?:)?\/\//i.test(src) || !/^[a-z][a-z\d+.-]*:/i.test(src);
  if (!origins?.length) return false;
  const origin = originOf(src, typeof location === "undefined" ? undefined : location.href);
  return origin !== undefined && /^https?:/.test(origin) && origins.some((o) => (originOf(o) ?? o) === origin);
}

/** What an image the host did not allow becomes: a link to it (alt text or host name), opened only by the reader. */
function ImageLink({ src, alt }: { src: string; alt: string }) {
  const url = URL.canParse(src) ? new URL(src) : undefined;
  if (url?.protocol !== "http:" && url?.protocol !== "https:") return <>{alt}</>;
  return <a href={src} target="_blank" rel="noopener noreferrer">{alt || url.host}</a>;
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
  const { renderLink, renderLinkList, renderImage, imageOrigins } = useContext(LinksContext) ?? {};
  const withLinks = useMemo<Components>(
    () => ({
      ...components,
      img: ({ src, alt }: { src?: string | Blob | undefined; alt?: string | undefined }) => {
        if (typeof src !== "string" || !src) return <>{alt}</>;
        if (renderImage) return <>{renderImage({ src, alt: alt ?? "" })}</>;
        if (imageAllowed(src, imageOrigins)) return <img src={src} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" className="max-w-full rounded-chat-md" />;
        return <ImageLink src={src} alt={alt ?? ""} />;
      },
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
    [renderLink, renderLinkList, renderImage, imageOrigins],
  );
  return (
    <Streamdown
      prefix={PREFIX}
      mode={animating || fade ? "streaming" : "static"}
      rehypePlugins={fade ? fadePlugins : rehypePlugins}
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
