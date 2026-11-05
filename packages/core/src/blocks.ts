import type { Part, ThinkingPart, ToolCallPart } from "./types";

export type ActivityPart = ThinkingPart | ToolCallPart;

/**
 * How an assistant message is laid out: runs of consecutive thinking and tool-call parts fold into one
 * activity group (the "Recalled memory ▾" dropdown); every other part stands alone. Tool calls for which
 * `standalone` is true stand alone too (`kind: "tool"`), e.g. a question's answers or a chart.
 */
export type Block =
  | { kind: "activity"; id: string; parts: ActivityPart[] }
  | { kind: "tool"; id: string; part: ToolCallPart }
  | { kind: "part"; id: string; part: Exclude<Part, ActivityPart> };

export function isActivityPart(part: Part): part is ActivityPart {
  return part.type === "thinking" || part.type === "tool_call";
}

export function toBlocks(parts: readonly Part[], standalone?: (part: ToolCallPart) => boolean): Block[] {
  const blocks: Block[] = [];
  for (const part of parts) {
    if (part.type === "tool_call" && standalone?.(part)) {
      blocks.push({ kind: "tool", id: part.id, part });
      continue;
    }
    if (!isActivityPart(part)) {
      blocks.push({ kind: "part", id: part.id, part });
      continue;
    }
    const last = blocks.at(-1);
    if (last?.kind === "activity") last.parts.push(part);
    else blocks.push({ kind: "activity", id: part.id, parts: [part] });
  }
  return blocks;
}
