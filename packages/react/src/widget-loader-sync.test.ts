import { readFileSync } from "node:fs";
import { join } from "node:path";
import { widgetFrameLoader } from "@agentic-ui-kit/core/visuals";
import { expect, it } from "vitest";

it("the playground serves the current widget frame loader", () => {
  const served = readFileSync(join(import.meta.dirname, "../../../apps/playground/public/widget-frame.html"), "utf8");
  expect(served).toBe(widgetFrameLoader);
});
