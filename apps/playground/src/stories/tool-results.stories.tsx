import type { ToolCallPart } from "agentic-ui-kit/core";
import { ActivityGroup, ToolViewsProvider, defaultToolViews, type ToolView } from "agentic-ui-kit";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlaskConical } from "lucide-react";

// Tool calls in each state, through the default ToolViews and one host-defined view.
const tool = (part: Partial<ToolCallPart> & Pick<ToolCallPart, "id" | "name">): ToolCallPart => ({
  type: "tool_call",
  status: "done",
  inputJson: JSON.stringify(part.input ?? {}),
  ...part,
});

const command = tool({
  id: "t1",
  name: "bash",
  input: { command: "grep -n cache .github/workflows/ci.yml", description: "Find the cache setting" },
  result: { stdout: "18:          cache: false" },
  durationMs: 840,
});
const search = tool({
  id: "t2",
  name: "web_search",
  input: { query: "github actions cache pnpm store" },
  result: {
    results: [
      { title: "Continuous Integration | pnpm", url: "https://pnpm.io/continuous-integration" },
      { title: "Caching dependencies to speed up workflows", url: "https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows" },
    ],
  },
});
const custom = tool({ id: "t7", name: "run_benchmark", input: { runs: 20 }, result: { p50: 312, p95: 401 } });

/** The tool calls to pick from. */
const calls = {
  "command (bash)": [command],
  "web search": [search],
  memory: [tool({ id: "t3", name: "memory", input: { path: "/memories/ci.md" }, result: "The team deploys from GitHub Actions." })],
  running: [tool({ id: "t4", name: "bash", status: "running", input: { command: "pnpm install --frozen-lockfile" } })],
  failed: [tool({ id: "t5", name: "bash", status: "error", input: { command: "pnpm install --frozen-lockfile" }, error: "ERR_PNPM_OUTDATED_LOCKFILE: pnpm-lock.yaml is out of date" })],
  "no view (title from the part, JSON body)": [tool({ id: "t6", name: "create_ticket", title: "Created a ticket", input: { title: "Cache the pnpm store in CI", labels: ["ci"] }, result: { id: "OPS-142" } })],
  "host-defined ToolView": [custom],
  "several in one group": [command, search, custom],
} satisfies Record<string, ToolCallPart[]>;

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

interface ToolArgs {
  /** The tool call(s) to show, in a state each. */
  call: keyof typeof calls;
  defaultExpanded: boolean;
}

function ToolResult({ call, defaultExpanded }: ToolArgs) {
  return (
    <ToolViewsProvider tools={{ ...defaultToolViews, run_benchmark: benchmarkTool }}>
      {/* Keyed so a new pick re-applies defaultExpanded. */}
      <div className="mx-auto max-w-3xl">
        <ActivityGroup key={`${call}-${defaultExpanded}`} parts={calls[call]} defaultExpanded={defaultExpanded} />
      </div>
    </ToolViewsProvider>
  );
}

/** Tool results through the default views and one host-defined view. Pick the call in Controls. */
const meta = {
  title: "Components/Tool results",
  component: ToolResult,
  subcomponents: { ActivityGroup },
  parameters: { layout: "padded" },
  argTypes: { call: { control: "select", options: Object.keys(calls) } },
  args: { call: "command (bash)", defaultExpanded: true },
} satisfies Meta<typeof ToolResult>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
