// Builds the publishable package into dist/: ESM + types (core inlined), and two stylesheets.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { build } from "tsdown";

rmSync("dist", { recursive: true, force: true });
await build({ entry: { index: "src/index.ts", core: "src/core.ts", visuals: "src/visuals/index.ts", "visuals-core": "src/visuals/core.ts" }, format: "esm", dts: false, platform: "neutral", outDir: "dist", logLevel: "warn" });

// Types: tsc emits dist/types/{react,core}/src; the internal core package becomes a relative import.
execFileSync("tsc", ["-p", "tsconfig.build.json", "--outDir", "dist/types"], { stdio: "inherit" });
const coreIndex = "dist/types/core/src/index.js";
const coreVisuals = "dist/types/core/src/visuals.js";
for (const file of readdirSync("dist/types/react/src", { recursive: true, withFileTypes: false })) {
  if (!String(file).endsWith(".d.ts")) continue;
  const path = join("dist/types/react/src", String(file));
  const rel = (target) => {
    const to = relative(dirname(path), target);
    return JSON.stringify(to.startsWith(".") ? to : `./${to}`);
  };
  const text = readFileSync(path, "utf8").replaceAll('"@agentic-ui-kit/core"', rel(coreIndex)).replaceAll('"@agentic-ui-kit/core/visuals"', rel(coreVisuals));
  writeFileSync(path, text);
}

// The React entries use hooks and context: mark them for frameworks with server components.
for (const file of ["dist/index.js", "dist/visuals.js"]) writeFileSync(file, `"use client";\n${readFileSync(file, "utf8")}`);

// tailwind.css: for hosts on Tailwind v4. Their build generates the utilities from dist/*.js.
const source = readFileSync("src/styles.css", "utf8");
writeFileSync("dist/tailwind.css", source);

// styles.css: precompiled for hosts without Tailwind. KaTeX stays an import so its font URLs resolve.
const katex = '@import "katex/dist/katex.min.css";';
mkdirSync(".build", { recursive: true });
writeFileSync(".build/kit.css", source.replace(katex, "").replace('@source "./";', '@source "../dist";'));
writeFileSync(".build/entry.css", '@import "tailwindcss";\n@import "./kit.css";\n');
execFileSync("tailwindcss", ["-i", ".build/entry.css", "-o", "dist/styles.css", "--minify"], { stdio: "inherit" });
writeFileSync("dist/styles.css", `${katex}\n${readFileSync("dist/styles.css", "utf8")}`);
rmSync(".build", { recursive: true, force: true });

// npm shows the package's own README and LICENSE.
for (const file of ["README.md", "LICENSE"]) writeFileSync(file, readFileSync(`../../${file}`));
