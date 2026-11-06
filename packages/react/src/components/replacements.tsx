import { replacedId, type Message, type ToolCallPart } from "@agentic-ui-kit/core";
import { createContext, useContext, type ReactNode } from "react";
import { Button } from "../primitives/button";
import { useLabels } from "../primitives/labels";

/**
 * In-place updates of drawn visuals: a tool call whose input has `replaces: <id>` takes the place of that
 * earlier call. In the same reply the newest finished call is drawn where the first one was, and the old one
 * stays (dimmed) until the new one's input is complete. A call replaced from a later reply folds into a link.
 */

/** Ready to take the old one's place: its input is complete and it didn't fail. */
export const isReady = (p: ToolCallPart) => p.status !== "streaming" && p.status !== "input" && p.status !== "error";

const callsOf = (m: Message) => m.parts.filter((p): p is ToolCallPart => p.type === "tool_call");
const replaces = (p: ToolCallPart) => replacedId(p.input ?? p.partialInput);

/** One reply's chains: each call's first call (where the chain is drawn) and each first call's chain, in order. */
export function chainsOf(message: Message) {
  const first = new Map<string, string>();
  const chains = new Map<string, ToolCallPart[]>();
  for (const call of callsOf(message)) {
    const r = replaces(call);
    const root = r !== undefined && first.has(r) ? first.get(r)! : call.id;
    first.set(call.id, root);
    chains.set(root, [...(chains.get(root) ?? []), call]);
  }
  return { first, chains };
}

/** Calls replaced by a finished call in a later reply: replaced id → the newest such call. */
export function laterReplacements(messages: readonly Message[]): Map<string, ToolCallPart> {
  const later = new Map<string, ToolCallPart>();
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    const own = new Set(callsOf(m).map((c) => c.id));
    for (const call of callsOf(m)) {
      const r = replaces(call);
      if (r !== undefined && !own.has(r) && isReady(call)) later.set(r, call);
    }
  }
  return later;
}

const LaterContext = createContext<ReadonlyMap<string, ToolCallPart>>(new Map());

export function LaterReplacements({ value, children }: { value: ReadonlyMap<string, ToolCallPart>; children: ReactNode }) {
  return <LaterContext.Provider value={value}>{children}</LaterContext.Provider>;
}

/** The call in a later reply that replaces any call of this chain, if there is one. */
export function useLaterReplacement(chain: readonly ToolCallPart[]): ToolCallPart | undefined {
  const later = useContext(LaterContext);
  for (let i = chain.length - 1; i >= 0; i--) {
    const by = later.get(chain[i]!.id);
    if (by) return by;
  }
  return undefined;
}

/** The DOM id of a drawn tool call, for the "Updated below" link. */
export const toolAnchor = (id: string) => `chat-tool-${id}`;

/** Draws a chain: the newest finished call (dimmed while a newer one streams), or a link to its later update. */
export function ToolChain({ chain, draw }: { chain: readonly ToolCallPart[]; draw: (part: ToolCallPart) => ReactNode }) {
  const labels = useLabels();
  const later = useLaterReplacement(chain);
  const shown = chain.findLast(isReady) ?? chain[0]!;
  const updating = chain.indexOf(shown) < chain.length - 1 && chain.at(-1)!.status !== "error";
  if (later) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="self-start text-chat-muted data-hovered:text-chat-fg"
        onPress={() => document.getElementById(toolAnchor(later.id))?.scrollIntoView({ behavior: "smooth", block: "center" })}
      >
        {labels.visualUpdated}
      </Button>
    );
  }
  return (
    <div id={toolAnchor(chain[0]!.id)} aria-busy={updating || undefined} className={updating ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <div key={shown.id}>{draw(shown)}</div>
      {updating && <p className="chat-shimmer mt-1 font-chat-sans text-(length:--chat-ui-font-size-sm) text-chat-muted">{labels.visualUpdating}</p>}
    </div>
  );
}
