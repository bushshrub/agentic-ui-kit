import type { APIRoute, GetStaticPaths } from 'astro';
import { getPages, pageMarkdown, type DocsPage } from '../lib/pages';

// Each page is also served as raw Markdown at `<page>.md`, for agents.
export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await getPages();
  return pages.map((page) => ({ params: { slug: page.id }, props: { page } }));
};

export const GET: APIRoute = ({ props, site }) =>
  new Response(pageMarkdown((props as { page: DocsPage }).page, site), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
