/**
 * UI as JSX in the reply: the model writes a ```ui fenced block in its normal text, e.g.
 *
 *   <State tab="stills" />
 *   <Card title="Pixel 9 Pro"><Metric label="Zoom" value="5x" /></Card>
 *
 * Every model has seen a lot of JSX; it streams element by element and needs no JSON escaping. The parser is
 * lenient where the intent is clear (JS-style objects, `{$state.k}`, `{"$state":"k"}`, text children) and
 * tolerates a block cut short while it streams.
 */
import { checkUiTree, type UiComponentSpec, type UiNode } from "./ui-tree";

export interface UiMarkup {
  /** Top-level elements, in order. */
  nodes: UiNode[];
  /** Starting state from `<State key={value} />`. */
  state: Record<string, unknown>;
  /** What could not be read, with line numbers. */
  errors: string[];
  /** The block ended with elements still open (it is streaming, or the model forgot to close them). */
  complete: boolean;
  /** The line a node starts on (1-based), for messages. */
  lineOf: (node: UiNode) => number | undefined;
}

/** The fence language the kit draws as UI. */
export const uiMarkupLanguage = "ui";

/** Reads a value written inside `{…}`: JSON, or a JS literal (unquoted keys, single quotes, trailing commas). */
export function readUiValue(source: string): { value?: unknown; error?: string } {
  const text = source.trim();
  const ref = /^\$?state\.([\w-]+)$/.exec(text);
  if (ref) return { value: { $state: ref[1] } };
  try {
    return { value: JSON.parse(text) };
  } catch {}
  // `{"$state":"tab"}` inside attr={…} arrives without its own braces.
  if (/^"[^"]+"\s*:/.test(text)) {
    try {
      return { value: JSON.parse(`{${text}}`) };
    } catch {}
  }
  let i = 0;
  const fail = (what: string): never => {
    throw new Error(`${what} at "${text.slice(Math.max(0, i - 10), i + 10)}"`);
  };
  const space = () => {
    while (i < text.length && /\s/.test(text[i]!)) i++;
  };
  const value = (): unknown => {
    space();
    const c = text[i];
    if (c === "{") {
      i++;
      const out: Record<string, unknown> = {};
      for (;;) {
        space();
        if (text[i] === "}") return i++, out;
        const key = text[i] === '"' || text[i] === "'" ? (str() as string) : word();
        space();
        if (text[i++] !== ":") fail("expected :");
        out[key] = value();
        space();
        if (text[i] === ",") i++;
        else if (text[i] !== "}") fail("expected , or }");
      }
    }
    if (c === "[") {
      i++;
      const out: unknown[] = [];
      for (;;) {
        space();
        if (text[i] === "]") return i++, out;
        out.push(value());
        space();
        if (text[i] === ",") i++;
        else if (text[i] !== "]") fail("expected , or ]");
      }
    }
    if (c === '"' || c === "'" || c === "`") return str();
    const w = word();
    if (w === "true") return true;
    if (w === "false") return false;
    if (w === "null" || w === "undefined") return null;
    const ref = /^\$?state\.([\w-]+)$/.exec(w);
    if (ref) return { $state: ref[1] };
    if (/^-?\d/.test(w) && !Number.isNaN(Number(w))) return Number(w);
    return fail(w ? `unknown name ${w} (JavaScript expressions are not run; write the value out)` : "expected a value");
  };
  const word = () => {
    const m = /^[\w$.+-]+/.exec(text.slice(i));
    if (!m) return "";
    i += m[0].length;
    return m[0];
  };
  const str = () => {
    const q = text[i++]!;
    let out = "";
    while (i < text.length && text[i] !== q) {
      if (text[i] === "\\") {
        const e = text[++i]!;
        out += e === "n" ? "\n" : e === "t" ? "\t" : e;
      } else out += text[i];
      i++;
    }
    if (text[i++] !== q) fail("unclosed string");
    return out;
  };
  try {
    const v = value();
    space();
    if (i < text.length) fail("unexpected text");
    return { value: v };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

interface Open {
  node: UiNode;
  text: string[];
}

/** Parses UI markup (the inside of a ```ui block). Safe on any prefix of it. */
export function parseUiMarkup(source: string): UiMarkup {
  const lines = new WeakMap<UiNode, number>();
  const errors: string[] = [];
  const state: Record<string, unknown> = {};
  const top: UiNode[] = [];
  const stack: Open[] = [];
  let i = 0;
  const lineAt = (at: number) => source.slice(0, at).split("\n").length;
  const add = (node: UiNode) => (stack.length ? (stack.at(-1)!.node.children ??= []).push(node) : top.push(node));

  // Finds the end of an attribute's {…}, skipping strings; -1 if it isn't closed yet.
  const braceEnd = (from: number) => {
    let depth = 0;
    for (let j = from; j < source.length; j++) {
      const c = source[j];
      if (c === '"' || c === "'" || c === "`") {
        for (j++; j < source.length && source[j] !== c; j++) if (source[j] === "\\") j++;
      } else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return j;
    }
    return -1;
  };

  const flushText = (end: number) => {
    const open = stack.at(-1);
    const text = source.slice(i, end);
    if (!text.trim()) return;
    if (open) open.text.push(text);
    else errors.push(`line ${lineAt(i)}: text outside any component (put it in a component, e.g. <Text text="…" />)`);
  };

  const close = (open: Open) => {
    const text = open.text.join("").replace(/\s+/g, " ").trim();
    if (text && !open.node.children?.length) {
      const props = (open.node.props ??= {});
      if (!("text" in props)) props.text = text;
    }
  };

  while (i < source.length) {
    const lt = source.indexOf("<", i);
    const brace = source.indexOf("{", i);
    if (brace >= 0 && (lt < 0 || brace < lt) && stack.length) {
      // A `{…}` child: a comment is fine, anything else is JavaScript we don't run.
      const end = braceEnd(brace);
      flushText(brace);
      const inner = source.slice(brace + 1, end < 0 ? undefined : end).trim();
      if (end >= 0 && !/^\/\*[\s\S]*\*\/$/.test(inner)) {
        const { value, error } = readUiValue(inner);
        if (typeof value === "string") stack.at(-1)!.text.push(value);
        else errors.push(`line ${lineAt(brace)}: {${inner.slice(0, 40)}} as a child is not supported${error ? ` (${error})` : ""}; write the elements out`);
      }
      if (end < 0) break;
      i = end + 1;
      continue;
    }
    if (lt < 0) {
      flushText(source.length);
      i = source.length;
      break;
    }
    flushText(lt);
    i = lt;
    if (source.startsWith("<!--", i)) {
      const end = source.indexOf("-->", i);
      if (end < 0) break;
      i = end + 3;
      continue;
    }
    const closing = /^<\/\s*([A-Za-z][\w.]*)?\s*>/.exec(source.slice(i));
    if (closing) {
      const name = closing[1];
      const at = name ? stack.map((o) => o.node.component).lastIndexOf(name) : stack.length - 1;
      if (at < 0) errors.push(`line ${lineAt(i)}: </${name}> closes nothing`);
      else {
        for (const open of stack.splice(at).reverse()) {
          if (open !== stack[at] && open.node.component !== name && name) errors.push(`line ${lineAt(i)}: <${open.node.component}> was not closed before </${name}>`);
          close(open);
        }
      }
      i += closing[0].length;
      continue;
    }
    if (/^<\/[^>]*$/.test(source.slice(i))) break; // a closing tag still arriving
    const name = /^<([A-Za-z][\w.]*)/.exec(source.slice(i));
    if (!name) {
      // `<` in text, e.g. "a < b".
      const open = stack.at(-1);
      if (open) open.text.push("<");
      i++;
      continue;
    }
    const start = i;
    let j = i + name[0].length;
    const props: Record<string, unknown> = {};
    let done: "open" | "self" | undefined;
    let cut = false;
    while (j < source.length) {
      const ws = /^\s*/.exec(source.slice(j))![0].length;
      j += ws;
      if (source.startsWith("/>", j)) {
        done = "self";
        j += 2;
        break;
      }
      if (source[j] === "/" && j === source.length - 1) break; // "/>" still arriving
      if (source[j] === ">") {
        done = "open";
        j++;
        break;
      }
      const attr = /^([A-Za-z_$][\w$:-]*)/.exec(source.slice(j));
      if (!attr) {
        if (j < source.length) errors.push(`line ${lineAt(j)}: <${name[1]}>: unexpected "${source[j]}"`);
        j++;
        continue;
      }
      j += attr[0].length;
      const key = attr[1]!;
      const eq = /^\s*=\s*/.exec(source.slice(j));
      if (!eq) {
        props[key] = true;
        continue;
      }
      j += eq[0].length;
      const q = source[j];
      if (q === '"' || q === "'") {
        const end = source.indexOf(q, j + 1);
        if (end < 0) {
          cut = true;
          break;
        }
        props[key] = source.slice(j + 1, end);
        j = end + 1;
      } else if (q === "{") {
        const end = braceEnd(j);
        if (end < 0) {
          cut = true;
          break;
        }
        const { value, error } = readUiValue(source.slice(j + 1, end));
        if (error) errors.push(`line ${lineAt(j)}: <${name[1]}> ${key}: can't read {${source.slice(j + 1, end).slice(0, 60)}}: ${error}`);
        else props[key] = value;
        j = end + 1;
      } else if (q === undefined) {
        cut = true;
        break;
      } else {
        const bare = /^[^\s/>]+/.exec(source.slice(j))![0];
        props[key] = bare;
        j += bare.length;
      }
    }
    if (cut || !done) break; // the tag is still arriving: leave it out until it is whole
    i = j;
    if (name[1] === "State") {
      if (stack.length) errors.push(`line ${lineAt(start)}: <State> goes at the top, outside other components`);
      Object.assign(state, props);
      if (done === "open") stack.push({ node: { component: "State" }, text: [] }); // tolerate <State …></State>
      continue;
    }
    const node: UiNode = { component: name[1]!, ...(Object.keys(props).length && { props }) };
    lines.set(node, lineAt(start));
    add(node);
    if (done === "open") stack.push({ node, text: [] });
  }
  const complete = stack.filter((o) => o.node.component !== "State").length === 0;
  for (const open of stack.reverse()) close(open);
  return { nodes: top, state, errors, complete, lineOf: (node) => lines.get(node) };
}

/** A ```ui block found in reply text. */
export interface UiMarkupBlock {
  /** The block's markup, without the fences. */
  source: string;
  /** Where the block's content starts in the text. */
  offset: number;
  /** The closing fence has arrived. */
  closed: boolean;
}

/** Finds the ```ui blocks in reply text (the last may still be open while it streams). */
export function findUiBlocks(text: string, language = uiMarkupLanguage): UiMarkupBlock[] {
  const blocks: UiMarkupBlock[] = [];
  const open = new RegExp("^([ \\t]*)(`{3,}|~{3,})[ \\t]*" + language.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[ \\t]*$", "gm");
  for (let m; (m = open.exec(text)); ) {
    const start = m.index + m[0].length + 1;
    const fence = m[2]!;
    const close = new RegExp("^[ \\t]*" + fence[0] + "{" + fence.length + ",}[ \\t]*$", "m").exec(text.slice(start));
    const end = close ? start + close.index : text.length;
    blocks.push({ source: text.slice(start, end), offset: start, closed: !!close });
    if (!close) break;
    open.lastIndex = end + close[0].length;
  }
  return blocks;
}

/** What `checkUiMarkup` found in a reply. */
export interface UiMarkupCheck {
  /** Every ```ui block will show as written. */
  ok: boolean;
  /** One line per problem: block, line and component. */
  errors: string[];
  /** A message for the model, e.g. appended after its reply, so it fixes the block next time; empty when ok. */
  feedback: string;
}

/**
 * Checks the ```ui blocks in a finished reply against the host's components, so the harness can tell the
 * model what to fix (in its own words: line numbers, "did you mean", the props a component takes).
 */
export function checkUiMarkup(text: string, components: readonly UiComponentSpec[], language = uiMarkupLanguage): UiMarkupCheck {
  const blocks = findUiBlocks(text, language);
  const errors: string[] = [];
  blocks.forEach((block, n) => {
    const where = blocks.length > 1 ? `block ${n + 1}, ` : "";
    const parsed = parseUiMarkup(block.source);
    for (const e of parsed.errors) errors.push(where + e);
    if (!block.closed) errors.push(`${where}the block is not closed with \`\`\``);
    else if (!parsed.complete) errors.push(`${where}some elements are not closed`);
    if (!parsed.nodes.length) errors.push(`${where}no components in the block`);
    const check = checkUiTree({ root: parsed.nodes, state: parsed.state }, components, {
      where: (node, path) => {
        const line = isNode(node) ? parsed.lineOf(node) : undefined;
        const name = isNode(node) ? `<${node.component}>` : path;
        return `${where}${line ? `line ${line} ` : ""}${name}`;
      },
    });
    errors.push(...check.errors);
  });
  const ok = errors.length === 0;
  const feedback = ok
    ? ""
    : `The \`\`\`${language} block in your last reply did not fully show. Problems:\n` +
      errors.slice(0, 20).map((e) => `- ${e}`).join("\n") +
      (errors.length > 20 ? `\n- ...and ${errors.length - 20} more` : "") +
      `\nWhen you next write UI, avoid these. If the user still needs it, write the block again, fixed.`;
  return { ok, errors, feedback };
}

const isNode = (v: unknown): v is UiNode => typeof v === "object" && v !== null && !Array.isArray(v) && typeof (v as UiNode).component === "string";

// A short type hint for a prop, as the model would write it: "…", {number}, {[{label, detail?}]}.
function hint(schema: Record<string, unknown> | undefined, inner = false): string {
  const s = schema ?? {};
  if (Array.isArray(s.enum)) return s.enum.map((e) => JSON.stringify(e)).join("|");
  if (Array.isArray(s.anyOf)) return inner ? "action" : "{action}";
  const type = Array.isArray(s.type) ? s.type[0] : s.type;
  const wrap = (v: string) => (inner ? v : `{${v}}`);
  if (type === "string") return inner ? "text" : '"…"';
  if (type === "number" || type === "integer") return wrap("number");
  if (type === "boolean") return wrap("true|false");
  if (type === "array") return wrap(`[${hint(s.items as Record<string, unknown>, true)}, …]`);
  if (type === "object" && s.properties) {
    const req = new Set((s.required as string[]) ?? []);
    return wrap(`{${Object.keys(s.properties).map((k) => k + (req.has(k) ? "" : "?")).join(", ")}}`);
  }
  return wrap("value");
}

/**
 * A suggested system-prompt section that teaches the model to write ```ui blocks with your components.
 * It only depends on the components, so it stays byte-stable across turns (good for the prompt cache).
 */
export function uiMarkupGuide(components: readonly UiComponentSpec[], language = uiMarkupLanguage): string {
  const line = (c: UiComponentSpec) => {
    const props = (c.props?.properties ?? {}) as Record<string, Record<string, unknown>>;
    const req = new Set((c.props?.required as string[]) ?? []);
    const attrs = Object.entries(props).map(([k, v]) => `${k}${req.has(k) ? "" : "?"}=${hint(v)}`);
    const tag = `<${c.name}${attrs.length ? " " + attrs.join(" ") : ""}${c.children ? `>…</${c.name}>` : " />"}`;
    return `- ${tag}\n  ${c.description}`;
  };
  return `## Interactive UI in your reply
When a visual helps more than text (options to compare, a plan, a checklist, numbers at a glance), write a
\`\`\`${language} fenced block in your reply. It holds JSX made of only these components:
${components.map(line).join("\n")}

How to write it
- Plain JSX: strings as attr="text"; numbers, lists and objects in braces, e.g. items={[{"label": "Tent"}]}.
- Components marked >…< take other components inside them; the rest close with />.
- Actions (for onPress and similar): {"action":"send","text":"…"} sends that text to you as the user;
  {"action":"set","key":"k","value":…} changes local state; {"action":"open","url":"https://…"};
  {"action":"copy","text":"…"}.
- Local state: start values on the first line, <State tab="overview" />; read one with attr={$state.tab}.
- No JavaScript: no .map(), no variables, no functions. Write every element out.
- Keep explaining in text around the block. One block per answer, unless the user asks for more.`;
}
