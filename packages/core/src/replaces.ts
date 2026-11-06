/**
 * Updating a visual in place: the drawing tools (show_widget, show_ui, render_ui) take an optional
 * `replaces`, the id of an earlier call of theirs. The kit draws the new call where the old one was (same
 * reply) or folds the old one into a link to the new one (earlier reply). The model sees its own call ids in
 * the history, so keep tool call ids when you send the history back.
 */

/** The `replaces` input property, shared by the drawing tools. */
export const replacesProperty = {
  type: "string",
  description:
    "Id of an earlier call of this tool whose visual this one updates in place: after a fix, or when the user asks for a change. Leave it out for a new visual.",
} as const;

/** One line for a drawing tool's description or guide. */
export const replacesGuide =
  "To change a visual you already drew (a fix, or the user asks for a change), call the tool again with `replaces` set to that call's id: it is redrawn in place. Never draw a second copy without it.";

/** The id a drawing tool call replaces, from its (streaming) input; undefined if none. */
export function replacedId(input: unknown): string | undefined {
  const r = (input as { replaces?: unknown } | null | undefined)?.replaces;
  return typeof r === "string" && r ? r : undefined;
}
