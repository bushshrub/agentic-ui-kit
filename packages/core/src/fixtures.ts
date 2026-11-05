import type { StreamEvent } from "./events";

/**
 * Hand-written event streams shaped like real provider output, for tests and the playground. Text arrives
 * in uneven chunks, as it does over the network. Replace with recorded runs once the server exists.
 */

type EventBody = StreamEvent extends infer E ? (E extends StreamEvent ? Omit<E, "runId" | "seq"> : never) : never;

function run(runId: string, bodies: EventBody[]): StreamEvent[] {
  return bodies.map((body, seq) => ({ ...body, runId, seq }) as StreamEvent);
}

function chunks(text: string, sizes = [3, 9, 5, 14, 2, 22, 7]): string[] {
  const out: string[] = [];
  for (let i = 0, n = 0; i < text.length; n++) {
    const size = sizes[n % sizes.length]!;
    out.push(text.slice(i, i + size));
    i += size;
  }
  return out;
}

function streamed(partId: string, text: string, field: "text" | "inputJson" = "text"): EventBody[] {
  return chunks(text).map((chunk) => ({ type: "part.delta", partId, [field]: chunk }) as EventBody);
}

const answer = String.raw`Caffeine leaves your body by **exponential decay**: every half-life, half of what is left is gone. For most adults the half-life $h$ is about 5 hours.

**Amount left after $t$ hours:**

$$
C(t) = C_0 \left(\tfrac{1}{2}\right)^{t/h}
$$

**Time until it drops below a level $C$:** solve for $t$,

$$
t = h \log_2 \frac{C_0}{C}.
$$

**Example:** a 200 mg coffee at 2 pm, $h = 5$. Getting below 50 mg takes $5 \log_2 4 = 10$ hours, so midnight.

What changes it:

- the half-life varies from about 3 to 7 hours between people,
- pregnancy and some medications make it longer,
- smoking makes it shorter,
- a second cup resets the clock: add both doses first.

A quick check in code:

` + "```python\nfrom math import log2\n\ndef hours_until(dose_mg, below_mg, half_life=5.0):\n    return half_life * log2(dose_mg / below_mg)\n\nprint(hours_until(200, 50))  # 10.0\n```\n";

const thinking =
  "Setting up exponential decay for caffeine.\nWorking out when a 200 mg dose drops below 50 mg.";

/** Memory tool call, a thinking step, then a long markdown answer with math and code. */
export const mathRun: StreamEvent[] = run("run_math", [
  { type: "run.start", messageId: "msg_a1", parentId: "msg_u1", createdAt: "2026-11-04T18:00:00Z", model: "claude-sonnet-5-5", effort: "medium" },
  { type: "part.start", part: { type: "tool_call", id: "p_mem", name: "memory_view", status: "input", inputJson: "", title: "Recalled memory" } },
  ...streamed("p_mem", JSON.stringify({ path: "/memories/preferences.md" }), "inputJson"),
  { type: "part.update", partId: "p_mem", status: "running", subtitle: "preferences.md" },
  { type: "part.end", partId: "p_mem", durationMs: 420, result: "Prefers a worked example with numbers before the general formula" },
  { type: "part.start", part: { type: "thinking", id: "p_think", text: "", status: "streaming", visibility: "summary" } },
  ...streamed("p_think", thinking),
  { type: "part.end", partId: "p_think", title: "Working out when the caffeine wears off", durationMs: 6200 },
  { type: "part.start", part: { type: "text", id: "p_text", text: "", status: "streaming" } },
  ...streamed("p_text", answer),
  { type: "part.end", partId: "p_text" },
  { type: "run.end", status: "done", usage: { inputTokens: 1840, outputTokens: 612, reasoningTokens: 140 } },
]);

/** A run stopped by the user while a tool was running. */
export const stoppedRun: StreamEvent[] = run("run_stop", [
  { type: "run.start", messageId: "msg_a2", parentId: "msg_u2", createdAt: "2026-11-04T18:05:00Z", model: "claude-sonnet-5-5" },
  { type: "part.start", part: { type: "thinking", id: "p_t", text: "", status: "streaming" } },
  ...streamed("p_t", "Looking for recent sources on this."),
  { type: "part.end", partId: "p_t", title: "Planning a search", durationMs: 1800 },
  { type: "part.start", part: { type: "tool_call", id: "p_search", name: "web_search", status: "input", inputJson: "", title: "Searching the web" } },
  ...streamed("p_search", JSON.stringify({ query: "caffeine half-life range adults" }), "inputJson"),
  { type: "part.update", partId: "p_search", status: "running", subtitle: "caffeine half-life range adults" },
  { type: "run.end", status: "stopped" },
]);

const grepOutput = `12:3.13   bugfix     2024-10-07   2029-10
13:3.12   security   2023-10-02   2028-10
14:3.11   security   2022-10-24   2027-10
15:3.10   end-of-life 2021-10-04  2026-10`;

const searchResults = [
  { title: "Status of Python versions", url: "https://devguide.python.org/versions/" },
  { title: "PEP 602 – Annual Release Cycle for Python", url: "https://peps.python.org/pep-0602/" },
  { title: "Python | endoflife.date", url: "https://endoflife.date/python" },
  { title: "Python Release Python 3.10.0", url: "https://www.python.org/downloads/release/python-3100/" },
];

/** Thinking, a shell command with output, more thinking, a web search with results, then the answer. */
export const researchRun: StreamEvent[] = run("run_research", [
  { type: "run.start", messageId: "msg_a3", parentId: "msg_u3", createdAt: "2026-11-04T19:00:00Z", model: "claude-sonnet-5-5", effort: "high" },
  { type: "part.start", part: { type: "thinking", id: "r_t1", text: "", status: "streaming" } },
  ...streamed("r_t1", "Reading the release table for support dates."),
  { type: "part.end", partId: "r_t1", title: "Reading the release table for support dates", durationMs: 2100 },
  { type: "part.start", part: { type: "tool_call", id: "r_bash", name: "bash", status: "input", inputJson: "" } },
  ...streamed("r_bash", JSON.stringify({ command: String.raw`grep -n -E "^3\.1[0-3] " release-cycle.txt`, description: "Reading the release table for support dates." }), "inputJson"),
  { type: "part.update", partId: "r_bash", status: "running" },
  { type: "part.end", partId: "r_bash", durationMs: 90, result: { stdout: grepOutput, exitCode: 0 } },
  { type: "part.start", part: { type: "thinking", id: "r_t2", text: "", status: "streaming" } },
  ...streamed("r_t2", "Checking whether 3.10 has reached end of life."),
  { type: "part.end", partId: "r_t2", title: "Checking whether 3.10 has reached end of life", durationMs: 1400 },
  { type: "part.start", part: { type: "tool_call", id: "r_search", name: "web_search", status: "input", inputJson: "" } },
  ...streamed("r_search", JSON.stringify({ query: "python 3.10 end of life date security support" }), "inputJson"),
  { type: "part.update", partId: "r_search", status: "running" },
  { type: "part.end", partId: "r_search", durationMs: 1300, result: { results: searchResults } },
  { type: "part.start", part: { type: "text", id: "r_text", text: "", status: "streaming" } },
  ...streamed("r_text", "Python **3.11 and newer** still get security fixes. 3.10 reached end of life in October 2026, so upgrade anything still on it."),
  { type: "part.end", partId: "r_text" },
  { type: "run.end", status: "done" },
]);

const fullThinking = `They want to know when a coffee wears off. Caffeine clears with first-order kinetics, so exponential decay.
C(t) = C0 * (1/2)^(t/h), with h the half-life, about 5 hours for a typical adult.
Below a level C: (1/2)^(t/h) = C/C0, so t/h = log2(C0/C), giving t = h * log2(C0/C).
200 mg down to 50 mg is a factor of 4, log2(4) = 2, so 10 hours. From 2 pm that's midnight.
I should mention the half-life varies a lot: roughly 3 to 7 hours, longer in pregnancy, shorter for smokers.
And that two cups add before decaying, so sum the doses at the time of the second cup.`;

/** A model that exposes its full reasoning, streamed before a short answer. */
export const fullThinkingRun: StreamEvent[] = run("run_full", [
  { type: "run.start", messageId: "msg_a4", parentId: "msg_u4", createdAt: "2026-11-04T20:00:00Z", model: "gpt-6-astra" },
  { type: "part.start", part: { type: "thinking", id: "f_t", text: "", status: "streaming", visibility: "full" } },
  ...streamed("f_t", fullThinking),
  { type: "part.end", partId: "f_t", durationMs: 9400 },
  { type: "part.start", part: { type: "text", id: "f_text", text: "", status: "streaming" } },
  ...streamed("f_text", String.raw`About 10 hours: $t = h \log_2 \frac{C_0}{C} = 5 \log_2 \frac{200}{50}$.`),
  { type: "part.end", partId: "f_text" },
  { type: "run.end", status: "done", usage: { outputTokens: 402, reasoningTokens: 310 } },
]);

/** Context window usage for a coding agent: tools, prompt, messages, memory. */
export const sampleContext: import("./types").ContextUsage = {
  limit: 1_000_000,
  categories: [
    { id: "mcp", label: "MCP tools", tokens: 33_000, color: "#5f87eb", hint: "Tool definitions from connected MCP servers" },
    { id: "system_tools", label: "System tools", tokens: 23_800, color: "#cd702d" },
    { id: "system_prompt", label: "System prompt", tokens: 8_700, color: "#5aa588" },
    { id: "messages", label: "Messages", tokens: 5_100, color: "#c19319" },
    { id: "skills", label: "Skills", tokens: 4_400, color: "#959595", hint: "Skill descriptions loaded at start" },
    { id: "mcp_instructions", label: "MCP server instructions", tokens: 1_400, color: "#959595", hint: "Instructions sent by MCP servers" },
    { id: "memory", label: "Memory files", tokens: 526, color: "#959595", hint: "CLAUDE.md and other memory files" },
    { id: "autocompact", label: "Autocompact buffer", tokens: 33_000, color: "#5e5e5e", reserved: true },
    { id: "mcp_deferred", label: "MCP tools (deferred)", tokens: 28_100, deferred: true },
    { id: "system_deferred", label: "System tools (deferred)", tokens: 24_300, deferred: true },
  ],
  groups: [
    {
      id: "mcp",
      label: "MCP tools",
      items: [
        ["Docs · Make document", 136], ["Docs · Create draft", 212], ["Docs · Delete all drafts", 275],
        ["Docs · Export", 420], ["Docs · Guide", 173], ["Docs · Read comments", 149],
        ["Docs · Read content", 269], ["Docs · Update content", 246], ["sandbox · attach", 1_200],
        ["sandbox · archive", 187], ["sandbox · create", 621], ["sandbox · run", 4_100],
      ].map(([label, tokens]) => ({ id: String(label), label: String(label), tokens: Number(tokens) })),
    },
    { id: "memory", label: "Memory files", items: [{ id: "claude-md", label: "/home/user/project/CLAUDE.md", tokens: 526 }] },
  ],
};

const agentIntro = `Yes. Most of a CI run here is **installing dependencies from scratch**. Caching the pnpm store between runs skips nearly all of it. Let me check your workflow and what the docs recommend.`;

const agentFinal = `Your workflow has no cache, so every run downloads every package. Here's what to change:

1. **Cache the pnpm store** in \`.github/workflows/ci.yml\`:

\`\`\`yaml
- uses: pnpm/action-setup@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm
- run: pnpm install --frozen-lockfile
\`\`\`

2. **Keep the lockfile committed.** The cache key is the hash of \`pnpm-lock.yaml\`, so it only refreshes when dependencies change.
3. **Split slow jobs.** Run typecheck and tests in parallel jobs; both restore the same cache.

Expect install to drop from about **90s to 15s** per run. The trade-off: pull requests can read caches saved by the default branch, so only cache downloaded packages, never build output a PR could tamper with.`;

/**
 * A full agent turn: thinking, a short reply to the user, more thinking, a command and a web search,
 * more thinking, then the final answer.
 */
export const agentRun: StreamEvent[] = run("run_agent", [
  { type: "run.start", messageId: "msg_a5", parentId: "msg_u5", createdAt: "2026-11-05T15:00:00Z", model: "claude-sonnet-5-5", effort: "high" },
  { type: "part.start", part: { type: "thinking", id: "g_t1", text: "", status: "streaming", visibility: "summary" } },
  ...streamed("g_t1", "Weighing where the CI time goes.\nInstalling dependencies dominates; a warm pnpm store skips most of it."),
  { type: "part.end", partId: "g_t1", title: "Weighing where the CI time goes", durationMs: 3200 },
  { type: "part.start", part: { type: "text", id: "g_intro", text: "", status: "streaming" } },
  ...streamed("g_intro", agentIntro),
  { type: "part.end", partId: "g_intro" },
  { type: "part.start", part: { type: "thinking", id: "g_t2", text: "", status: "streaming", visibility: "summary" } },
  ...streamed("g_t2", "Checking whether the workflow already caches anything."),
  { type: "part.end", partId: "g_t2", title: "Checking the workflow", durationMs: 1600 },
  { type: "part.start", part: { type: "tool_call", id: "g_bash", name: "bash", status: "input", inputJson: "" } },
  ...streamed("g_bash", JSON.stringify({ command: "grep -n -A3 'setup-node' .github/workflows/ci.yml", description: "Checking the Node setup step of the CI workflow" }), "inputJson"),
  { type: "part.update", partId: "g_bash", status: "running" },
  { type: "part.end", partId: "g_bash", durationMs: 120, result: { stdout: "14:      - uses: actions/setup-node@v4\n15:        with:\n16:          node-version: 22\n17:      - run: pnpm install", exitCode: 0 } },
  { type: "part.start", part: { type: "tool_call", id: "g_search", name: "web_search", status: "input", inputJson: "" } },
  ...streamed("g_search", JSON.stringify({ query: "github actions setup-node cache pnpm store" }), "inputJson"),
  { type: "part.update", partId: "g_search", status: "running" },
  {
    type: "part.end",
    partId: "g_search",
    durationMs: 1500,
    result: {
      results: [
        { title: "Caching packages data", url: "https://github.com/actions/setup-node#caching-global-packages-data" },
        { title: "Continuous Integration | pnpm", url: "https://pnpm.io/continuous-integration" },
        { title: "Caching dependencies to speed up workflows", url: "https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows" },
        { title: "pnpm/action-setup", url: "https://github.com/pnpm/action-setup" },
      ],
    },
  },
  { type: "part.start", part: { type: "thinking", id: "g_t3", text: "", status: "streaming", visibility: "summary" } },
  ...streamed("g_t3", "No cache step. setup-node can cache the pnpm store keyed on the lockfile; note who can read the cache."),
  { type: "part.end", partId: "g_t3", title: "Weighing the cache's trade-offs", durationMs: 2700 },
  { type: "part.start", part: { type: "text", id: "g_final", text: "", status: "streaming" } },
  ...streamed("g_final", agentFinal),
  { type: "part.end", partId: "g_final" },
  { type: "run.end", status: "done", usage: { inputTokens: 5120, outputTokens: 940, reasoningTokens: 210 } },
]);
