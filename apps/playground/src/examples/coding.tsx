import { AgentProvider, Badge, ChatTheme, Panel, useAgentContext, useChatTool } from "@llm-chat/react";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, FileCode2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AgentChat } from "../lib/agent-chat";
import { scriptedAgent } from "../lib/scripted-agent";

/*
 * A coding agent. Every tool runs on the server (a sandbox); the page only shows what happens. While
 * `edit_file` streams, its replacement is typed into the open file as a pending change; when the server
 * applies it, `onResult` updates the file and marks the lines. A broken stream drops the pending change.
 */

const PATH = "src/retry.ts";
const original = `export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
`;

const edits = [
  {
    path: PATH,
    find: "      lastError = error;\n",
    replace: "      lastError = error;\n      if (i < attempts - 1) await sleep(backoff(i));\n",
  },
  {
    path: PATH,
    find: "export async function withRetry",
    replace: `const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 200 ms, 400 ms, 800 ms… less up to 30% jitter, capped at 5 s. */
export function backoff(attempt: number, base = 200): number {
  const delay = Math.min(base * 2 ** attempt, 5000);
  return delay * (1 - Math.random() * 0.3);
}

export async function withRetry`,
  },
];

const transport = (fail: boolean) => () =>
  scriptedAgent(async function* ({ last, text, thinking, call }) {
    if (last) return;
    yield* thinking("Reading the retry helper", "Flaky uploads retry three times within a few ms, so they all hit the same outage. withRetry needs a delay between attempts: exponential backoff with jitter.");
    yield* call("read_file", { path: PATH }, { takes: 400, result: { lines: 11 } });
    yield* text("The loop retries straight away, so all three attempts land in the same outage. I'll wait between attempts, with exponential backoff and jitter.");
    yield* call("edit_file", edits[0], { chunk: 4, delay: 30, takes: 300 });
    yield* call("edit_file", edits[1], { chunk: 4, delay: 22, takes: 300, ...(fail && { failAfter: 180 }) });
    yield* call("run_tests", { pattern: "retry" }, { takes: 1600, result: { passed: 7, failed: 0, durationMs: 1430 } });
    yield* text("Tests pass (7 of 7). Attempts now wait about 200 ms, then 400 ms, before giving up.");
  });

type Edit = { path?: string; find?: string; replace?: string };

function CodingPage() {
  const [file, setFile] = useState(original);
  const [changed, setChanged] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<Record<string, Edit>>({});
  const [failure, setFailure] = useState<string>();
  const [tests, setTests] = useState<"idle" | "running" | { passed: number; failed: number }>("idle");

  useAgentContext("editor", { openFile: PATH });

  useChatTool<{ path: string }, { lines: number }>({
    name: "read_file",
    view: { label: (p) => (p.status === "done" ? "Read a file" : "Reading a file"), subtitle: (p) => (p.input as { path?: string })?.path, summary: (n) => (n === 1 ? "read a file" : `read ${n} files`) },
  });

  useChatTool<Required<Edit>, unknown>({
    name: "edit_file",
    view: {
      label: (p) => (p.status === "done" ? "Edited a file" : p.status === "error" ? "Edit failed" : "Editing a file"),
      subtitle: (p) => ((p.input ?? p.partialInput) as Edit | undefined)?.path,
      summary: (n) => (n === 1 ? "edited a file" : `made ${n} edits`),
      Detail: ({ part }) => {
        const e = (part.input ?? part.partialInput ?? {}) as Edit;
        return (
          <pre className="m-0 overflow-x-auto font-chat-mono text-xs leading-relaxed">
            {(e.find ?? "").split("\n").filter(Boolean).map((l, i) => <div key={`f${i}`} className="text-chat-danger">- {l}</div>)}
            {(e.replace ?? "").split("\n").map((l, i) => <div key={`r${i}`} className="text-[color:light-dark(#1a7f37,#7ee787)]">+ {l}</div>)}
          </pre>
        );
      },
    },
    onCall: (part) => {
      if (part.status === "error") {
        setPending(({ [part.id]: _, ...rest }) => rest);
        setFailure(part.error);
        return;
      }
      if (part.status !== "done") setPending((p) => ({ ...p, [part.id]: (part.input ?? part.partialInput ?? {}) as Edit }));
    },
    onResult: (part) => {
      setPending(({ [part.id]: _, ...rest }) => rest);
      if (part.status !== "done") return;
      const { find, replace } = part.input;
      setFile((f) => {
        const at = f.indexOf(find);
        if (at === -1) return f;
        const first = f.slice(0, at).split("\n").length - 1;
        const count = replace.split("\n").length - (replace.endsWith("\n") ? 1 : 0);
        setChanged((c) => new Set([...c, ...Array.from({ length: count }, (_, i) => first + i)]));
        return f.slice(0, at) + replace + f.slice(at + find.length);
      });
    },
  });

  useChatTool<{ pattern: string }, { passed: number; failed: number }>({
    name: "run_tests",
    view: { label: (p) => (p.status === "done" ? "Ran the tests" : "Running the tests"), subtitle: (p) => (p.input as { pattern?: string })?.pattern, summary: () => "ran the tests" },
    onCall: (part) => part.status === "running" && setTests("running"),
    onResult: (part) => setTests(part.status === "done" && part.result ? part.result : "idle"),
  });

  // The file as shown: applied edits, plus a pending edit typed in where its `find` text is.
  const lines = useMemo(() => {
    let text = file;
    let mark: [number, number] | undefined;
    const edit = Object.values(pending).at(-1);
    // The replacement starts streaming only after `find` is complete.
    if (edit?.find && edit.replace !== undefined) {
      const at = text.indexOf(edit.find);
      if (at !== -1) {
        const first = text.slice(0, at).split("\n").length - 1;
        text = text.slice(0, at) + edit.replace + text.slice(at + edit.find.length);
        mark = [first, first + edit.replace.split("\n").length - 1];
      }
    }
    return text.replace(/\n$/, "").split("\n").map((content, i) => ({ content, pending: mark !== undefined && i >= mark[0] && i <= mark[1] }));
  }, [file, pending]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-chat-border px-3 text-sm">
        <FileCode2 className="size-4 text-chat-muted" />
        <span className="font-chat-mono text-[0.8125rem]">{PATH}</span>
        {changed.size > 0 && <Badge tone="outline">modified</Badge>}
        <span className="ml-auto flex items-center gap-1.5 text-chat-muted">
          {failure && (
            <span role="status" className="mr-3 flex items-center gap-1.5 text-chat-danger">
              <AlertTriangle className="size-4" /> Edit not applied: {failure}
            </span>
          )}
          {tests === "running" ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Running tests
            </>
          ) : tests !== "idle" ? (
            <>
              <CheckCircle2 className="size-4 text-[color:light-dark(#1a7f37,#7ee787)]" /> {tests.passed} passed
            </>
          ) : (
            "Tests not run"
          )}
        </span>
      </header>
      <pre className="m-0 min-h-0 flex-1 overflow-auto bg-chat-code-bg py-3 font-chat-mono text-[0.8125rem] leading-6">
        {lines.map((line, i) => (
          <div
            key={i}
            className={clsx(
              "flex pr-4",
              line.pending ? "bg-chat-accent/10" : changed.has(i) && "bg-[color:light-dark(#dafbe1,#12261e)]",
            )}
          >
            <span className={clsx("w-12 shrink-0 pr-4 text-right select-none", line.pending ? "text-chat-accent" : "text-chat-subtle")}>{i + 1}</span>
            <span className="whitespace-pre">{line.content}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

export function CodingExample({ fail }: { fail: boolean }) {
  const make = useMemo(() => transport(fail), [fail]);
  return (
    <AgentProvider>
      <ChatTheme className="flex h-dvh">
        <CodingPage />
        <Panel variant="flush" aria-label="Agent" className="w-[24rem] shrink-0 border-l border-chat-border">
          <AgentChat key={String(fail)} transport={make} title="Agent" suggestions={["Uploads are flaky: fix the retry helper"]} />
        </Panel>
      </ChatTheme>
    </AgentProvider>
  );
}
