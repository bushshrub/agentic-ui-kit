/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Each layer may import only from the layers before it (see index.ts).
const layers = ["primitives", "hooks", "components", "views"];

describe("layers", () => {
  for (const [rank, layer] of layers.entries()) {
    it(`${layer} imports nothing above it`, () => {
      const dir = join(import.meta.dirname, layer);
      const bad: string[] = [];
      for (const file of readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."))) {
        const source = readFileSync(join(dir, file), "utf8");
        for (const [, target] of source.matchAll(/from "\.\.\/(\w+)\//g)) {
          if (layers.indexOf(target!) > rank) bad.push(`${layer}/${file} -> ${target}`);
        }
      }
      expect(bad).toEqual([]);
    });
  }
});
