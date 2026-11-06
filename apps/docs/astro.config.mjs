// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';
import starlightTypeDoc from 'starlight-typedoc';

const repoRoot = new URL('../../', import.meta.url).pathname;

const base = '/agentic-ui-kit';

// Astro does not add the base to links and images written in Markdown. Pages link to each other as `/get-started/install/`;
// this puts the base in front when the page is built.
const withBase = (url) => (url.startsWith('/') && !url.startsWith('//') && !url.startsWith(`${base}/`) ? base + url : url);
const baseLinks = {
  name: 'base-links',
  link(node, ctx) {
    ctx.replaceNode(node, { type: 'link', url: withBase(node.url), title: node.title, children: node.children });
  },
  image(node, ctx) {
    ctx.replaceNode(node, { type: 'image', url: withBase(node.url), title: node.title, alt: node.alt });
  },
};

export default defineConfig({
  site: 'https://bushshrub.github.io',
  base,
  markdown: { processor: satteri({ mdastPlugins: [baseLinks] }) },
  integrations: [
    starlight({
      title: 'agentic-ui-kit',
      description: 'React components for agent chat UIs: streaming messages, tool calls, inline visuals.',
      favicon: '/favicon.svg',
      logo: { src: './src/assets/logo.svg', alt: 'agentic-ui-kit' },
      customCss: [
        '@fontsource-variable/inter',
        '@fontsource-variable/source-serif-4',
        '@fontsource-variable/jetbrains-mono',
        './src/styles/custom.css',
      ],
      components: {
        Header: './src/components/Header.astro',
        Hero: './src/components/Hero.astro',
        MarkdownContent: './src/components/MarkdownContent.astro',
        PageTitle: './src/components/PageTitle.astro',
        Sidebar: './src/components/Sidebar.astro',
      },
      head: [
        // Tell agents where the Markdown index is.
        { tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', title: 'llms.txt', href: `${base}/llms.txt` } },
      ],
      expressiveCode: {
        themes: ['github-dark-default', 'github-light-default'],
        defaultProps: { frame: 'code' },
        styleOverrides: {
          borderRadius: '0',
          borderWidth: '0',
          codeBackground: 'var(--kit-code-bg)',
          codeFontFamily: 'var(--sl-font-mono)',
          codeFontSize: '0.8125rem',
          codeLineHeight: '1.65',
          codePaddingBlock: '1rem',
          codePaddingInline: '1rem',
          frames: {
            frameBoxShadowCssValue: 'none',
            editorBackground: 'var(--kit-code-bg)',
            editorTabBarBackground: 'var(--kit-code-bg)',
            editorTabBarBorderBottomColor: 'transparent',
            terminalBackground: 'var(--kit-code-bg)',
            terminalTitlebarBackground: 'var(--kit-code-bg)',
            terminalTitlebarBorderBottomColor: 'transparent',
            inlineButtonBorder: 'transparent',
            inlineButtonBackground: 'var(--sl-color-gray-5)',
          },
        },
      },
      plugins: [
        starlightTypeDoc({
          entryPoints: [`${repoRoot}packages/react`, `${repoRoot}packages/core`],
          output: 'reference/api',
          sidebar: { label: 'API reference', collapsed: true },
          typeDoc: { plugin: [new URL('./scripts/typedoc-module-names.mjs', import.meta.url).pathname], entryPointStrategy: 'packages', packageOptions: { entryPoints: ['src/index.ts'], tsconfig: 'tsconfig.json' }, excludeExternals: true, excludePrivate: true, excludeInternal: true, readme: new URL('./scripts/api-readme.md', import.meta.url).pathname },
        }),
        starlightSidebarTopics([
          {
            label: 'Guides',
            link: '/get-started/install/',
            items: [
              { label: 'Get started', items: [{ autogenerate: { directory: 'get-started' } }] },
              { label: 'Examples', items: [{ autogenerate: { directory: 'examples' } }] },
              { label: 'Inline visuals', items: [{ autogenerate: { directory: 'inline-visuals' } }] },
              { label: 'Custom harness', items: [{ autogenerate: { directory: 'custom-harness' } }] },
            ],
          },
          {
            label: 'Reference',
            link: '/reference/whats-in-the-kit/',
            items: [
              {
                label: 'Reference',
                items: [
                  'reference/whats-in-the-kit',
                  'reference/what-you-can-change',
                  'reference/development',
                  { label: 'API reference', slug: 'reference/api/readme' },
                  { label: 'Packages', slug: 'reference/api/packages' },
                  { label: 'agentic-ui-kit (React)', collapsed: true, items: [{ autogenerate: { directory: 'reference/api/agentic-ui-kit', collapsed: true } }] },
                  { label: 'agentic-ui-kit/core', collapsed: true, items: [{ autogenerate: { directory: 'reference/api/@agentic-ui-kit/core', collapsed: true } }] },
                ],
              },
            ],
          },
        ]),
      ],
    }),
  ],
});
