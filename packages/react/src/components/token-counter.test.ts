import { expect, it } from "vitest";
import { formatTokens } from "./token-counter";

it("formats token counts like the context panel", () => {
  expect([526, 1_400, 33_000, 76_800, 890_200, 1_000_000].map(formatTokens)).toEqual(["526", "1.4k", "33k", "76.8k", "890.2k", "1M"]);
});
