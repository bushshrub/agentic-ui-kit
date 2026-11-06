import { getCollection, type CollectionEntry } from 'astro:content';

export type DocsPage = CollectionEntry<'docs'>;

// The order of the sidebar. Pages in other folders come last.
const SECTION_ORDER = ['', 'get-started', 'inline-visuals', 'custom-harness', 'reference'];

// The site is served under a base path (`/agentic-ui-kit`), without a trailing slash.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function section(page: DocsPage): string {
  return page.id === 'index' ? '' : page.id.split('/')[0];
}

function sectionIndex(page: DocsPage): number {
  const index = SECTION_ORDER.indexOf(section(page));
  return index === -1 ? SECTION_ORDER.length : index;
}

/** All pages, in sidebar order. */
export async function getPages(): Promise<DocsPage[]> {
  const pages = await getCollection('docs', (page) => !page.data.draft);
  return pages.sort(
    (a, b) =>
      sectionIndex(a) - sectionIndex(b) ||
      (a.data.sidebar.order ?? 999) - (b.data.sidebar.order ?? 999) ||
      a.id.localeCompare(b.id),
  );
}

/** The path of the raw Markdown file for a page, for example `/agentic-ui-kit/get-started/install.md`. */
export function markdownPath(id: string): string {
  return id === 'index' || id === '' ? `${BASE}/index.md` : `${BASE}/${id}.md`;
}

/**
 * Makes root-relative links absolute. A link to a page points at its Markdown file.
 * Example: `](/reference/overview/#rules)` becomes `](https://bushshrub.github.io/agentic-ui-kit/reference/overview.md#rules)`.
 */
export function absoluteLinks(markdown: string, site: URL | undefined): string {
  const origin = (site ?? new URL('https://bushshrub.github.io')).origin;
  return markdown.replace(/\]\(\/(?!\/)([^)\s#]*)(#[^)\s]*)?\)/g, (_match, path: string, hash = '') => {
    let target = path;
    if (target === '') target = 'index.md';
    else if (target.endsWith('/')) target = `${target.slice(0, -1)}.md`;
    return `](${origin}${BASE}/${target}${hash})`;
  });
}

/** The page as one Markdown document: title, description, source URL, then the body. */
export function pageMarkdown(page: DocsPage, site: URL | undefined): string {
  const url = new URL(page.id === 'index' ? `${BASE}/` : `${BASE}/${page.id}/`, site).href;
  const lines = [`# ${page.data.title}`, ''];
  if (page.data.description) lines.push(`> ${page.data.description}`, '');
  lines.push(`Source: ${url}`, '', absoluteLinks((page.body ?? '').trim(), site), '');
  return lines.join('\n');
}
