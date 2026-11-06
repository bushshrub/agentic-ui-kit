import type { ToolCallPart } from "agentic-ui-kit/core";
import {
  ActivityGroup,
  AttachmentCard,
  ChatHeader,
  ChatList,
  ChatTitleMenu,
  Composer,
  DictationButton,
  useDictation,
  type DictationState,
  IconButton,
  ModelPicker,
  TokenCounter,
  ToolViewsProvider,
  defaultToolViews,
  type ToolView,
} from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlaskConical, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { attachMenu, models } from "../lib/demo-chat";

/** Chat pieces with one job each, built from primitives. Views put them together. */
const meta: Meta = { title: "Components" };
export default meta;

function ComposerDemo({ variant, busy = false }: { variant: "docked" | "centered" | "compact"; busy?: boolean }) {
  const [model, setModel] = useState(models[0]!.id);
  const [effort, setEffort] = useState("medium");
  return (
    <Composer
      variant={variant}
      busy={busy}
      onSubmit={() => {}}
      onStop={() => {}}
      placeholder={variant === "centered" ? "How can I help you today?" : "Reply…"}
      leading={attachMenu()}
      {...(variant !== "compact" && {
        trailing: <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />,
      })}
    />
  );
}

export const Composers: StoryObj = {
  name: "Composer",
  render: () => (
    <div className="flex w-[40rem] flex-col gap-6">
      <ComposerDemo variant="centered" />
      <ComposerDemo variant="docked" />
      <ComposerDemo variant="docked" busy />
      <ComposerDemo variant="compact" />
    </div>
  ),
};

function PickerDemo() {
  const [model, setModel] = useState(models[0]!.id);
  const [effort, setEffort] = useState("medium");
  return <ModelPicker models={models} model={model} onModelChange={setModel} effort={effort} onEffortChange={setEffort} />;
}

/** Effort levels come from the model (`efforts`); models without them show no Effort submenu. */
const spoken = "Book a table for two at seven tonight, somewhere quiet near the office.".split(" ");

/** Dictation with a stand-in for the mic and the transcription model: words arrive as they are "heard". */
function SimulatedDictation() {
  const [listening, setListening] = useState(false);
  const [levels, setLevels] = useState<number[]>([]);
  const [words, setWords] = useState(0);
  useEffect(() => {
    if (!listening) return;
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      setLevels((l) => [...l.slice(-31), tick % 9 < 6 ? 0.2 + Math.random() * 0.8 : 0.03]);
      if (tick % 4 === 0) setWords((w) => Math.min(spoken.length, w + 1));
    }, 80);
    return () => clearInterval(timer);
  }, [listening]);
  const stop = () => (setListening(false), setLevels([]), setWords(0));
  const dictation: DictationState | undefined = listening
    ? {
        levels,
        transcript: spoken.slice(0, words).join(" "),
        onCancel: stop,
        // A model that finishes after ✓: the box reads "Transcribing…" meanwhile.
        onAccept: () => new Promise<string>((done) => setTimeout(() => (stop(), done(spoken.join(" "))), 900)),
      }
    : undefined;
  return <Composer onSubmit={() => {}} dictation={dictation} trailing={<DictationButton onPress={() => setListening(true)} />} />;
}

/** The browser's own speech recognition (no transcription model plugged in). Needs a mic and Chrome or Safari. */
function BrowserDictation() {
  const dictation = useDictation({ onError: console.error });
  return (
    <Composer
      onSubmit={() => {}}
      placeholder={dictation.supported ? "Press the mic and talk" : "This browser has no speech recognition"}
      dictation={dictation.state}
      trailing={dictation.supported && <DictationButton onPress={dictation.start} />}
    />
  );
}

/**
 * Voice dictation, similar to claude.ai's: the words fill the box as they are heard, a dotted meter follows the
 * voice, ✕ drops the words and ✓ keeps them. Plug in a transcription model with `useDictation({ transcribe })`.
 */
export const Dictation: StoryObj = {
  name: "Composer dictation",
  render: () => (
    <div className="flex w-[40rem] flex-col gap-6">
      <SimulatedDictation />
      <BrowserDictation />
    </div>
  ),
};

export const ModelPickers: StoryObj = { name: "ModelPicker", render: () => <PickerDemo /> };

// Tool calls in each state, through the default ToolViews and one host-defined view.
const tool = (part: Partial<ToolCallPart> & Pick<ToolCallPart, "id" | "name">): ToolCallPart => ({
  type: "tool_call",
  status: "done",
  inputJson: JSON.stringify(part.input ?? {}),
  ...part,
});

const toolCalls: Record<string, ToolCallPart> = {
  command: tool({
    id: "t1",
    name: "bash",
    input: { command: "grep -n cache .github/workflows/ci.yml", description: "Find the cache setting" },
    result: { stdout: "18:          cache: false" },
    durationMs: 840,
  }),
  search: tool({
    id: "t2",
    name: "web_search",
    input: { query: "github actions cache pnpm store" },
    result: {
      results: [
        { title: "Continuous Integration | pnpm", url: "https://pnpm.io/continuous-integration" },
        { title: "Caching dependencies to speed up workflows", url: "https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows" },
      ],
    },
  }),
  memory: tool({ id: "t3", name: "memory", input: { path: "/memories/ci.md" }, result: "The team deploys from GitHub Actions." }),
  running: tool({ id: "t4", name: "bash", status: "running", input: { command: "pnpm install --frozen-lockfile" } }),
  failed: tool({ id: "t5", name: "bash", status: "error", input: { command: "pnpm install --frozen-lockfile" }, error: "ERR_PNPM_OUTDATED_LOCKFILE: pnpm-lock.yaml is out of date" }),
  unknown: tool({ id: "t6", name: "create_ticket", title: "Created a ticket", input: { title: "Cache the pnpm store in CI", labels: ["ci"] }, result: { id: "OPS-142" } }),
  custom: tool({ id: "t7", name: "run_benchmark", input: { runs: 20 }, result: { p50: 312, p95: 401 } }),
};

/** How a host adds its own tool: a label, a summary phrase and a Detail body. */
const benchmarkTool: ToolView = {
  label: () => "Ran a benchmark",
  subtitle: (part) => `${(part.input as { runs: number }).runs} runs`,
  summary: (n) => (n === 1 ? "ran a benchmark" : `ran ${n} benchmarks`),
  Detail: ({ part }) => {
    const r = part.result as { p50: number; p95: number };
    return (
      <div className="flex items-center gap-4 text-sm">
        <FlaskConical className="size-4 text-chat-muted" />
        <span>p50 {r.p50} ms</span>
        <span>p95 {r.p95} ms</span>
      </div>
    );
  },
};

const row = (label: string, parts: ToolCallPart[]) => (
  <section className="flex flex-col gap-1">
    <h3 className="m-0 text-xs font-normal text-chat-subtle">{label}</h3>
    <ActivityGroup parts={parts} defaultExpanded />
  </section>
);

export const ToolResults: StoryObj = {
  name: "Tool results",
  parameters: { layout: "padded" },
  render: () => (
    <ToolViewsProvider tools={{ ...defaultToolViews, run_benchmark: benchmarkTool }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {row("Command (bash)", [toolCalls.command!])}
        {row("Web search", [toolCalls.search!])}
        {row("Memory", [toolCalls.memory!])}
        {row("Running", [toolCalls.running!])}
        {row("Failed", [toolCalls.failed!])}
        {row("A tool with no view: title from the part, input and result as JSON", [toolCalls.unknown!])}
        {row("A host-defined ToolView", [toolCalls.custom!])}
        {row("Several in one group", [toolCalls.command!, toolCalls.search!, toolCalls.custom!])}
      </div>
    </ToolViewsProvider>
  ),
};

export const Attachments: StoryObj = {
  render: () => (
    <div className="flex gap-3 p-2">
      <AttachmentCard attachment={{ name: "Pasted text", mime: "text/plain", text: "[factory]\nenable_template = true\n".repeat(8) }} onRemove={() => {}} onOpen={() => {}} />
      <AttachmentCard attachment={{ name: "boot-trace.log", mime: "text/plain" }} onRemove={() => {}} />
      <AttachmentCard attachment={{ name: "benchmarks.pdf", mime: "application/pdf", status: "uploading" }} onRemove={() => {}} />
      <AttachmentCard attachment={{ name: "huge.iso", mime: "application/octet-stream", status: "error", error: "Too large" }} onRemove={() => {}} />
      <AttachmentCard size="sm" attachment={{ name: "config.toml", mime: "text/plain" }} />
    </div>
  ),
};

export const TokenCounters: StoryObj = {
  name: "TokenCounter",
  render: () => (
    <div className="flex items-center gap-6 text-sm text-chat-muted">
      <TokenCounter tokens={1300} />
      <span>
        Thinking
        <TokenCounter variant="inline" tokens={1300} className="ml-1.5" />
      </span>
    </div>
  ),
};

export const Header: StoryObj = {
  name: "ChatHeader",
  parameters: { layout: "fullscreen" },
  render: () => (
    <ChatHeader
      title="Speeding up CI"
      menu={<ChatTitleMenu onPin={() => {}} onRename={() => {}} projects={[{ id: "p1", name: "website" }]} onAddToProject={() => {}} onShare={() => {}} onDelete={() => {}} />}
      actions={
        <IconButton label="Share">
          <Share />
        </IconButton>
      }
    />
  ),
};

export const List: StoryObj = {
  name: "ChatList",
  render: () => (
    <div className="w-72">
      <ChatList
        activeId="ci"
        sections={[
          { id: "pinned", title: "Pinned", items: [{ id: "ci", title: "Speeding up CI" }] },
          {
            id: "recent",
            title: "Recents",
            items: [
              { type: "project", id: "p", name: "website", chats: [{ id: "ui", title: "Landing page redesign", running: true }] },
              { id: "caffeine", title: "When does coffee wear off?", unread: true },
              { id: "light", title: "A short history of lighthouses" },
            ],
          },
        ]}
      />
    </div>
  ),
};
