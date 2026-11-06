import type { APIRoute } from 'astro';
import { getPages, pageMarkdown } from '../lib/pages';

// All pages in one file, so an agent can read everything with one request.
export const GET: APIRoute = async ({ site }) => {
  const pages = await getPages();
  const body = pages.map((page) => pageMarkdown(page, site)).join('\n---\n\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
