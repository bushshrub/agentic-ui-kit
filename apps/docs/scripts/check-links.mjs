// Checks the internal links in dist/. No network. Run after `pnpm build`.
// HTML files: href and src attributes. Markdown files: [text](url) links.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const DIST = resolve(process.argv[2] ?? 'dist');
const SITE = 'https://bushshrub.github.io';
// Served under this path, so root-relative links must start with it. dist/ holds the files without it.
const BASE = '/agentic-ui-kit';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function resolves(pathname) {
  const clean = decodeURIComponent(pathname);
  const target = join(DIST, clean);
  if (!target.startsWith(DIST)) return false;
  if (existsSync(target) && statSync(target).isFile()) return true;
  return existsSync(join(target, 'index.html'));
}

function check(url, file, errors) {
  let link = url.trim();
  if (link.startsWith(SITE)) link = link.slice(SITE.length) || '/';
  if (!link || /^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('//')) return;
  const [withoutHash] = link.split('#');
  const [pathname] = withoutHash.split('?');
  if (!pathname) return;
  let absolute = pathname;
  if (pathname.startsWith('/')) {
    if (pathname !== BASE && !pathname.startsWith(`${BASE}/`)) {
      errors.push(`${file.slice(DIST.length)}: link outside ${BASE}: ${url}`);
      return;
    }
    absolute = pathname.slice(BASE.length) || '/';
  } else {
    absolute = join(dirname(file.slice(DIST.length)), pathname);
  }
  if (absolute.startsWith('/storybook') && !existsSync(join(DIST, 'storybook'))) return; // CI builds it after the docs
  if (!resolves(absolute)) errors.push(`${file.slice(DIST.length)}: broken link ${url}`);
}

const errors = [];
let count = 0;
for (const file of walk(DIST)) {
  if (file.endsWith('/404.html')) continue; // its links are for any missing path
  if (file.endsWith('.html')) {
    const html = readFileSync(file, 'utf8');
    for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      check(url, file, errors);
      count++;
    }
  } else if (file.endsWith('.md') || file.endsWith('.txt')) {
    const text = readFileSync(file, 'utf8');
    for (const [, url] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      check(url, file, errors);
      count++;
    }
  }
}

if (errors.length > 0) {
  console.error([...new Set(errors)].join('\n'));
  console.error(`${errors.length} broken link(s).`);
  process.exit(1);
}
console.log(`Checked ${count} links in ${DIST}. No broken links.`);
