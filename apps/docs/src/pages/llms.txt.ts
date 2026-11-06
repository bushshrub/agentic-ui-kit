import type { APIRoute } from 'astro';
import { getPages, markdownPath } from '../lib/pages';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

// The index for agents. Format: https://llmstxt.org/
export const GET: APIRoute = async ({ site }) => {
  const pages = await getPages();
  const link = (path: string) => new URL(path.startsWith(BASE) ? path : `${BASE}${path}`, site).href;
  const lines = [
    '# agentic-ui-kit',
    '',
    '> React components for agent chat UIs: streaming messages, tool calls, inline visuals. Storybook: ' + link('/storybook/'),
    '',
    `Each link below is a raw Markdown file. All pages in one file: ${link('/llms-full.txt')}`,
    '',
    '## Docs',
    '',
    ...pages.map((page) => {
      const description = page.data.description ? `: ${page.data.description}` : '';
      return `- [${page.data.title}](${link(markdownPath(page.id))})${description}`;
    }),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
