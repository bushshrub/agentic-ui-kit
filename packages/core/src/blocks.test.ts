import { expect, it } from "vitest";
import { toBlocks, type ActivityPart } from "./blocks";
import type { Part } from "./types";

const thinking = (id: string, status: Part["status"], title?: string): ActivityPart => ({
  type: "thinking",
  id,
  text: "",
  status,
  ...(title !== undefined && { title }),
});
const text = (id: string): Part => ({ type: "text", id, text: "", status: "done" });

it("folds consecutive activity parts into one group", () => {
  const blocks = toBlocks([thinking("a", "done"), thinking("b", "done"), text("t"), thinking("c", "done")]);
  expect(blocks.map((b) => (b.kind === "activity" ? b.parts.map((p) => p.id) : b.id))).toEqual([["a", "b"], "t", ["c"]]);
});
