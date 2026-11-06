// Installs the packed tarball in a blank app and typechecks every entry under both module resolutions
// (bundler for Vite/Next apps, NodeNext for Node servers), with skipLibCheck off. Usage: node check-packed.mjs <tgz>
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tarball = resolve(process.argv[2] ?? "");
const dir = mkdtempSync(join(tmpdir(), "kit-consumer-"));
const run = (cmd, args) => execFileSync(cmd, args, { cwd: dir, stdio: "inherit" });

writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
writeFileSync(
  join(dir, "app.tsx"),
  `import { ChatView, ChatTheme } from "agentic-ui-kit";
import { reduceEvents } from "agentic-ui-kit/core";
import { VisualsProvider, uiComponents } from "agentic-ui-kit/visuals";
import { visualizeTool, checkUiTree } from "agentic-ui-kit/visuals/core";
export const App = () => (
  <ChatTheme><VisualsProvider components={uiComponents}><ChatView messages={[]} onSend={() => {}} /></VisualsProvider></ChatTheme>
);
export const used = [reduceEvents, visualizeTool.name, checkUiTree];
`,
);
run("npm", ["install", "--silent", "--no-audit", "--no-fund", tarball, "react@19", "react-dom@19", "@types/react@19", "@types/react-dom@19", "typescript@5"]);

for (const [module, moduleResolution] of [["esnext", "bundler"], ["nodenext", "nodenext"]]) {
  const compilerOptions = { strict: true, module, moduleResolution, jsx: "react-jsx", noEmit: true, skipLibCheck: false, target: "es2022", lib: ["es2023", "dom", "dom.iterable"] };
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions, files: ["app.tsx"] }));
  run("npx", ["tsc", "-p", "."]);
  console.log(`packed types: ${moduleResolution} ok`);
}
