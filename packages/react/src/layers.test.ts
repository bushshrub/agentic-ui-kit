/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
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

// Inline visuals are opt-in: nothing the main entries import may reach them.
function reachable(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    for (const [, spec] of source.matchAll(/(?:from|import\()\s*"([^"]+)"/g)) {
      if (spec!.startsWith("@agentic-ui-kit/core/visuals")) {
        seen.add(spec!);
        continue;
      }
      const base = spec === "@agentic-ui-kit/core" ? join(import.meta.dirname, "../../core/src/index") : spec!.startsWith(".") ? resolve(dirname(file), spec!) : undefined;
      const next = base && [".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find(existsSync);
      if (next) queue.push(next);
    }
  }
  return [...seen];
}

describe("visuals are opt-in", () => {
  const visual = /\/visuals\/|\/core\/src\/(visualize|widget-loader|replaces|ui-tree|ui-markup|ui-components)\.ts$|^@agentic-ui-kit\/core\/visuals/;
  for (const entry of ["index.ts", "core.ts"]) {
    it(`${entry} does not reach a visuals module`, () => {
      const files = reachable(join(import.meta.dirname, entry));
      expect(files.length).toBeGreaterThan(5);
      expect(files.filter((f) => visual.test(f)).map((f) => relative(join(import.meta.dirname, ".."), f))).toEqual([]);
    });
  }
});
