/**
 * The example's server: the page (Vite, in middleware mode) and two endpoints for `sseTransport`.
 *   POST /api/chat  the kit's request → a text/event-stream of StreamEvents
 *   POST /api/stop  { runId } → cancels the turn
 *
 * CLAUDE_CODE_CWD: the folder Claude Code works in (default: this folder's ./workspace).
 * CLAUDE_CODE_MODEL: a model alias or id (default "haiku"). CLAUDE_CODE_MODE: "default" asks before
 * commands and edits; "acceptEdits", "plan", "auto"... are the agent's other modes. PORT: default 5180.
 */
import { mkdirSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { join } from "node:path";
import { formatEvent } from "agentic-ui-kit/core";
import { createServer as createVite } from "vite";
import { Bridge, type ChatRequest } from "./bridge";

const root = join(import.meta.dirname, "..");
const cwd = process.env.CLAUDE_CODE_CWD ?? join(root, "workspace");
mkdirSync(cwd, { recursive: true });
const bridge = new Bridge({ cwd, model: process.env.CLAUDE_CODE_MODEL ?? "haiku", mode: process.env.CLAUDE_CODE_MODE ?? "default" });
const vite = await createVite({ root, server: { middlewareMode: true }, appType: "spa" });

async function json<T>(req: IncomingMessage): Promise<T> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return JSON.parse(body) as T;
}

const port = Number(process.env.PORT ?? 5180);
createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    const request = await json<ChatRequest>(req);
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    try {
      for await (const event of bridge.run(request)) res.write(formatEvent(event));
    } catch (error) {
      console.error(error);
    }
    return res.end();
  }
  if (req.method === "POST" && req.url === "/api/stop") {
    const { runId } = await json<{ runId: string }>(req);
    await bridge.stop(runId);
    return res.end();
  }
  vite.middlewares(req, res);
}).listen(port, () => console.log(`Claude Code in ${cwd}: http://localhost:${port}`));

process.on("SIGINT", () => {
  bridge.close();
  process.exit(0);
});
