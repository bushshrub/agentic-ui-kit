/**
 * Rehype plugin that wraps each word of prose in `<span class="chat-word">`. CSS fades a span in when it
 * mounts. React keeps the spans already on screen as the text grows, so a word fades once and is never cut
 * short or restarted; words revealed together fade together.
 *
 * Code, math internals and SVG are left alone. A math element as a whole gets the class, so a formula
 * fades in as one piece.
 */

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown> & { className?: unknown };
  children?: HastNode[];
}

const OPAQUE_TAGS = new Set(["code", "pre", "svg", "math", "script", "style"]);

function classes(node: HastNode): string[] {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" ? value.split(/\s+/) : [];
}

function isMath(node: HastNode): boolean {
  return classes(node).some((c) => c === "katex" || c === "katex-display" || c.startsWith("math-") || c === "language-math");
}

function wordSpan(word: string): HastNode {
  return { type: "element", tagName: "span", properties: { className: ["chat-word"] }, children: [{ type: "text", value: word }] };
}

function wrap(node: HastNode): void {
  if (!node.children) return;
  const out: HastNode[] = [];
  for (const child of node.children) {
    if (child.type === "text") {
      for (const piece of (child.value ?? "").split(/(\s+)/)) {
        if (!piece) continue;
        out.push(/^\s+$/.test(piece) ? { type: "text", value: piece } : wordSpan(piece));
      }
      continue;
    }
    if (child.type === "element") {
      if (isMath(child)) {
        child.properties = { ...child.properties, className: [...classes(child), "chat-word"] };
      } else if (!OPAQUE_TAGS.has(child.tagName ?? "")) {
        wrap(child);
      }
    }
    out.push(child);
  }
  node.children = out;
}

export function rehypeWordFade() {
  return (tree: HastNode) => wrap(tree);
}
