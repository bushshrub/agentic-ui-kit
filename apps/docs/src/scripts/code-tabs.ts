// Puts each code block in a frame with a tab bar.
// Code blocks that follow each other become one frame with one tab for each language.
// The Markdown stays plain: agents still get normal fenced code blocks.

const LABELS: Record<string, string> = {
  sh: 'Shell',
  bash: 'Shell',
  python: 'Python',
  py: 'Python',
  js: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  css: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  txt: 'Text',
  plaintext: 'Text',
};

function label(block: Element): string {
  // A block with a title uses the title as its label.
  const title = block.querySelector('figcaption.header .title')?.textContent?.trim();
  if (title) return title;
  const language = block.querySelector('pre')?.getAttribute('data-language') ?? 'txt';
  // A curl command is the "cURL" tab, the same as most API docs.
  if (language === 'sh' && block.textContent?.trimStart().startsWith('curl')) return 'cURL';
  return LABELS[language] ?? language;
}

function isCodeBlock(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.classList.contains('expressive-code');
}

let groupCount = 0;

function makeGroup(blocks: HTMLElement[]) {
  const group = document.createElement('div');
  group.className = 'code-group';
  const bar = document.createElement('div');
  bar.className = 'code-tabs';
  blocks[0].before(group);
  group.append(bar);

  // One block is not a set of tabs: show its label as plain text.
  if (blocks.length === 1) {
    const text = document.createElement('span');
    text.className = 'code-label';
    text.textContent = label(blocks[0]);
    bar.append(text);
    group.append(blocks[0]);
    return;
  }

  const id = `code-group-${groupCount++}`;
  bar.setAttribute('role', 'tablist');
  const tabs: HTMLButtonElement[] = [];

  function select(index: number, focus = false) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      blocks[i].hidden = !active;
    });
    if (focus) tabs[index].focus();
  }

  blocks.forEach((block, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `${id}-tab-${index}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${id}-panel-${index}`);
    tab.textContent = label(block);
    block.id = `${id}-panel-${index}`;
    block.setAttribute('role', 'tabpanel');
    block.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      const target =
        event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
        : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : event.key === 'Home' ? 0
        : event.key === 'End' ? last
        : -1;
      if (target === -1) return;
      event.preventDefault();
      select(target, true);
    });
    tabs.push(tab);
    bar.append(tab);
    group.append(block);
  });
  select(0);
}

for (const container of document.querySelectorAll('.sl-markdown-content, [data-code-tabs]')) {
  const children = [...container.children];
  let run: HTMLElement[] = [];
  for (const child of [...children, null]) {
    if (isCodeBlock(child)) {
      run.push(child);
      continue;
    }
    if (run.length > 0) makeGroup(run);
    run = [];
  }
}
