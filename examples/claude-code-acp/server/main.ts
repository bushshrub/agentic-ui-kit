/**
 * The example's server: the page (Vite, in middleware mode) and two endpoints for `sseTransport`.
 *   POST /api/chat  the kit's request → a text/event-stream of StreamEvents
 *   POST /api/stop  { runId } → cancels the turn
 *
 * CLAUDE_CODE_CWD: the folder Claude Code works in (default: this folder's ./workspace).
 * CLAUDE_CODE_MODEL: a model alias or id (default "haiku"). CLAUDE_CODE_MODE: "default" asks before
 * commands and edits; "acceptEdits", "plan", "auto"... are the agent's other modes. PORT: default 5180.
 *
 * Dictation (optional): TRANSCRIBE_URL (an OpenAI-compatible base URL, e.g. https://host/v1), TRANSCRIBE_MODEL
 * and TRANSCRIBE_API_KEY. POST /api/transcribe forwards the page's audio to it. Without them the page
 * uses the browser's speech recognition.
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
const { TRANSCRIBE_URL, TRANSCRIBE_MODEL, TRANSCRIBE_API_KEY } = process.env;
const transcription = TRANSCRIBE_URL && TRANSCRIBE_MODEL ? { url: TRANSCRIBE_URL.replace(/\/$/, ""), model: TRANSCRIBE_MODEL, key: TRANSCRIBE_API_KEY ?? "" } : undefined;

async function json<T>(req: IncomingMessage): Promise<T> {
  let body = "";
  for await (const chunk of req) body += chunk;
  return JSON.parse(body) as T;
}

const port = Number(process.env.PORT ?? 5180);
const server = createServer(async (req, res) => {
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
  if (req.method === "GET" && req.url === "/api/features") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ transcribe: !!transcription }));
  }
  if (req.method === "POST" && req.url === "/api/transcribe" && transcription) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const form = new FormData();
    form.set("model", transcription.model);
    form.set("file", new Blob([Buffer.concat(chunks)] as BlobPart[], { type: req.headers["content-type"] ?? "audio/wav" }), "speech.wav");
    const upstream = await fetch(`${transcription.url}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${transcription.key}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    }).catch((error: unknown) => error as Error);
    if (upstream instanceof Error || !upstream.ok) {
      console.error("transcribe:", upstream instanceof Error ? upstream.message : upstream.status);
      res.writeHead(502);
      return res.end();
    }
    const { text } = (await upstream.json()) as { text: string };
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ text }));
  }
  vite.middlewares(req, res);
});
// Hot reload over this server's own port, so two copies can run side by side.
const vite = await createVite({ root, server: { middlewareMode: true, hmr: { server } }, appType: "spa" });
server.listen(port, () => console.log(`Claude Code in ${cwd}: http://localhost:${port}`));

process.on("SIGINT", () => {
  bridge.close();
  process.exit(0);
});
