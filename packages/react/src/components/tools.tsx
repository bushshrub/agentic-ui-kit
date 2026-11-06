import type { ActivityPart, ToolCallPart } from "@agentic-ui-kit/core";
import { Globe } from "lucide-react";
import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from "react";
import { useAgentSnapshot, useAgentTool, type AgentTool } from "../hooks/agent";
import { CodeBlock } from "../primitives/code-block";
import { defaultLabels, useLabels, type ChatLabels } from "../primitives/labels";

/**
 * How one kind of tool call shows up in an activity group. Registered by tool name; hosts add their own and
 * override the built-in ones through `ChatProvider`.
 */
export interface ToolView {
  /** Row label, e.g. "Ran a command". Defaults to the part's title, then its name. `labels` are the active UI strings. */
  label?: (part: ToolCallPart, labels: ChatLabels) => ReactNode;
  /** Highlighted text after the label, e.g. the search query. Defaults to the part's subtitle. */
  subtitle?: (part: ToolCallPart) => ReactNode;
  /** Tooltip on the row label, e.g. the command's description. */
  hint?: (part: ToolCallPart) => string | undefined;
  /** The approval question, e.g. "Add 4 events to your calendar?". Defaults to "Allow <label>?". */
  ask?: (part: ToolCallPart) => ReactNode;
  /** Phrase for the group heading, lowercase: "ran a command", "ran 3 commands". */
  summary?: (count: number, labels: ChatLabels) => string;
  /** Body shown when the row is expanded. Defaults to the result, or the input as JSON. */
  Detail?: ComponentType<{ part: ToolCallPart }>;
  /**
   * Renders the call on its own in the message instead of as a row in the activity group, e.g. the
   * answers to a question or a chart.
   */
  Block?: ComponentType<{ part: ToolCallPart }>;
}

export type ToolViews = Record<string, ToolView>;

const ToolViewsContext = createContext<ToolViews | undefined>(undefined);

export function ToolViewsProvider({ tools, children }: { tools: ToolViews; children: ReactNode }) {
  return <ToolViewsContext.Provider value={tools}>{children}</ToolViewsContext.Provider>;
}

export function useToolView(name: string): ToolView {
  return useToolViews()[name] ?? {};
}

/** The provider's views, plus views brought by tools the page registered (`ChatTool.view`). */
export function useToolViews(): ToolViews {
  const base = useContext(ToolViewsContext) ?? defaultToolViews;
  const registry = useAgentSnapshot();
  const version = registry?.getVersion() ?? 0;
  return useMemo(() => {
    const own = registry?.list().filter((t): t is ChatTool => (t as ChatTool).view !== undefined) ?? [];
    return own.length ? { ...base, ...Object.fromEntries(own.map((t) => [t.name, t.view!])) } : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, registry, version]);
}

/** A tool with its look in the chat. Register it with `useChatTool` from the component that owns it. */
export interface ChatTool<Input = any, Output = unknown> extends AgentTool<Input, Output> {
  view?: ToolView;
}

/** `useAgentTool` for tools that bring a view. */
export const useChatTool: <Input, Output>(tool: ChatTool<Input, Output>) => void = useAgentTool;

/** Streaming or running: the model or a tool is busy with it. */
export const isWorking = (part: ActivityPart) => part.status !== "done" && part.status !== "error" && part.status !== "awaiting";

/** Row label for any activity part. */
export function activityLabel(part: ActivityPart, labels: ChatLabels, view?: ToolView): ReactNode {
  if (part.type === "thinking") {
    if (part.title) return part.title;
    if (part.status !== "done") return labels.thinking;
    return part.durationMs ? labels.thoughtFor(formatDuration(part.durationMs, labels)) : labels.thought;
  }
  return view?.label?.(part, labels) ?? part.title ?? part.name;
}

/**
 * Heading of an activity group. While live it follows the latest step. Once done it lists what the tools
 * did, in order ("Ran a command, searched the web"); a group of only thinking shows the first title.
 */
export function activityHeading(parts: readonly ActivityPart[], views: ToolViews, labels: ChatLabels): ReactNode {
  const waiting = parts.find((p): p is ToolCallPart => p.type === "tool_call" && p.status === "awaiting");
  if (waiting) return <>{activityLabel(waiting, labels, views[waiting.name])}{labels.waitingForYou}</>;
  if (parts.some(isWorking)) {
    const last = parts.at(-1)!;
    return activityLabel(last, labels, last.type === "tool_call" ? views[last.name] : undefined);
  }
  const counts = new Map<string, number>();
  for (const part of parts) if (part.type === "tool_call") counts.set(part.name, (counts.get(part.name) ?? 0) + 1);
  if (counts.size === 0) return parts[0] ? activityLabel(parts[0], labels) : "";
  const phrases = [...counts].map(([name, count]) => views[name]?.summary?.(count, labels) ?? labels.usedTool(name));
  return labels.joinSummaries(phrases);
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringOf(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** A shell command. Input `{ command, description? }`; result a string or `{ stdout, stderr, exitCode }`. */
export const commandTool: ToolView = {
  label: (_, labels) => labels.ranCommandLabel,
  hint: (part) => stringOf(recordOf(part.input).description),
  summary: (n, labels) => labels.ranCommands(n),
  Detail: function CommandDetail({ part }) {
    const labels = useLabels();
    const command = stringOf(recordOf(part.input).command) ?? part.inputJson;
    const result = recordOf(part.result);
    const output =
      stringOf(part.result) ?? [stringOf(result.stdout), stringOf(result.stderr)].filter(Boolean).join("\n");
    return (
      <div className="space-y-4">
        <CodeBlock label="bash" code={command} />
        {(output || part.status === "done") && <CodeBlock label={labels.output} code={output || labels.noOutput} />}
        {part.error && <p className="text-sm text-chat-danger">{part.error}</p>}
      </div>
    );
  },
};

export interface SearchResult {
  title: string;
  url: string;
  /** Icon url. Without one a globe is shown; the kit never fetches icons itself. */
  favicon?: string;
}

/** A web search. Input `{ query }`; result `{ results: SearchResult[] }` or `SearchResult[]`. */
export const webSearchTool: ToolView = {
  label: (_, labels) => labels.searchedWebLabel,
  subtitle: (part) => stringOf(recordOf(part.input).query) ?? part.subtitle,
  summary: (n, labels) => labels.searchedWeb(n),
  Detail: function WebSearchDetail({ part }) {
    const labels = useLabels();
    const results = (Array.isArray(part.result) ? part.result : recordOf(part.result).results) as
      | SearchResult[]
      | undefined;
    if (part.error) return <p className="text-sm text-chat-danger">{part.error}</p>;
    if (!results?.length) return <p className="text-sm text-chat-muted">{labels.noResults}</p>;
    return (
      <ul className="-mx-1">
        {results.map((result) => (
          <li key={result.url}>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-chat-sm px-1 py-2 text-[0.9375rem] text-chat-muted outline-none hover:text-chat-fg focus-visible:ring-2 focus-visible:ring-chat-focus"
            >
              {result.favicon ? (
                <img src={result.favicon} alt="" className="size-4 shrink-0 rounded-sm" />
              ) : (
                <Globe aria-hidden className="size-4 shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate">{result.title}</span>
              <span className="shrink-0 text-sm">{hostOf(result.url)}</span>
            </a>
          </li>
        ))}
      </ul>
    );
  },
};

/** Memory lookups, e.g. Anthropic's memory tool. Input `{ path }`. */
export const memoryTool: ToolView = {
  label: (_, labels) => labels.recalledMemoryLabel,
  subtitle: (part) => {
    const path = stringOf(recordOf(part.input).path);
    return path?.split("/").at(-1) ?? part.subtitle;
  },
  summary: (n, labels) => labels.recalledMemory(n),
};

export const defaultToolViews: ToolViews = {
  bash: commandTool,
  shell: commandTool,
  web_search: webSearchTool,
  memory: memoryTool,
  memory_view: memoryTool,
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** "9s", "1m 5s". */
export function formatDuration(ms: number, labels: ChatLabels = defaultLabels): string {
  return labels.duration(Math.max(1, Math.round(ms / 1000)));
}
