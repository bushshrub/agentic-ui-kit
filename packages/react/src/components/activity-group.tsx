import { activityTokens, type ActivityPart } from "@llm-chat/core";
import { useState, type ReactNode } from "react";
import { Disclosure } from "../primitives/disclosure";
import { Markdown } from "./markdown";
import { activityHeading, isWorking, activityLabel, useToolView, useToolViews } from "./tools";
import { TokenCounter } from "./token-counter";

export interface ActivityGroupProps {
  /** Consecutive thinking and tool-call parts, as grouped by `toBlocks`. */
  parts: readonly ActivityPart[];
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * The "Ran a command, searched the web ▾" dropdown: a one-line heading that opens a bordered box with one
 * row per step. Each row expands on its own; tool rows render through the registered `ToolView`.
 * A group of one step skips the rows: the heading is the step's own label and the box holds its detail.
 */
export function ActivityGroup({ parts, defaultExpanded = false, className }: ActivityGroupProps) {
  const views = useToolViews();
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Waiting on the user is not work in progress: no shimmer, no counter.
  const live = parts.some(isWorking);
  // Counts up while the group runs and disappears when it is done. Totals live on the message's usage.
  const tokens = activityTokens(parts);
  const after = live && tokens > 0 && <TokenCounter variant="inline" tokens={tokens} className="ml-1.5" />;
  return (
    <div className={className}>
      {parts.length === 1 ? (
        <SingleStep part={parts[0]!} live={live} after={after} expanded={expanded} onExpandedChange={setExpanded} />
      ) : (
        <Disclosure
          isExpanded={expanded}
          onExpandedChange={setExpanded}
          summary={
            <>
              <Live live={live}>{activityHeading(parts, views)}</Live>
              {after}
            </>
          }
          summaryClassName="text-[0.9375rem]"
          panelClassName="pt-3"
        >
          <div className="divide-y divide-chat-divider rounded-chat-md border border-chat-divider">
            {parts.map((part) => (
              <Step key={part.id} part={part} />
            ))}
          </div>
        </Disclosure>
      )}
    </div>
  );
}

const SHIMMER_MS = 2000;

/**
 * Sweeps a highlight across a label while its step is running. The animation starts at the phase of a
 * shared clock, so every live label sweeps in step and a remount does not restart it.
 */
function Live({ live, children }: { live: boolean; children: ReactNode }) {
  return live ? <Shimmer>{children}</Shimmer> : <>{children}</>;
}

function Shimmer({ children }: { children: ReactNode }) {
  // Read when the span mounts, which is when its animation starts.
  const [delay] = useState(() => `-${Math.round(performance.now() % SHIMMER_MS)}ms`);
  return (
    <span className="chat-shimmer" style={{ animationDelay: delay, ["--chat-shimmer-duration" as string]: `${SHIMMER_MS}ms` }}>
      {children}
    </span>
  );
}

function SingleStep({
  part,
  live,
  after,
  expanded,
  onExpandedChange,
}: {
  part: ActivityPart;
  live: boolean;
  after: ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { summary, detail } = useStepContent(part);
  return (
    <Disclosure
      isExpanded={expanded}
      onExpandedChange={onExpandedChange}
      summary={
        <>
          <Live live={live}>{summary}</Live>
          {after}
        </>
      }
      summaryClassName="text-[0.9375rem]"
      panelClassName="pt-3"
    >
      <div className="rounded-chat-md border border-chat-divider px-3 py-2">{detail}</div>
    </Disclosure>
  );
}

function Step({ part }: { part: ActivityPart }) {
  const { summary, detail } = useStepContent(part);
  const live = isWorking(part);
  return (
    <Disclosure
      className="px-3 py-2"
      summaryClassName="text-[0.9375rem]"
      panelClassName="pt-2 pb-1"
      summary={<Live live={live}>{summary}</Live>}
    >
      {detail}
    </Disclosure>
  );
}

/** The label line and expanded body of one step. Tool calls go through their registered view. */
function useStepContent(part: ActivityPart): { summary: ReactNode; detail: ReactNode } {
  const view = useToolView(part.type === "tool_call" ? part.name : "");
  if (part.type === "thinking") {
    return {
      summary: activityLabel(part),
      detail:
        part.visibility === "hidden" || !part.text ? (
          <p className="text-sm text-chat-subtle">The model's reasoning is not shown.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto [scrollbar-width:thin]">
            <Markdown className="chat-thinking" streaming={part.status === "streaming"}>
              {part.text}
            </Markdown>
          </div>
        ),
    };
  }
  const subtitle = view.subtitle ? view.subtitle(part) : part.subtitle;
  const Detail = view.Detail ?? DefaultDetail;
  return {
    summary: (
      <span title={view.hint?.(part)}>
        {activityLabel(part, view)}
        {subtitle && <span className="ml-1.5 text-chat-fg">{subtitle}</span>}
      </span>
    ),
    detail: <Detail part={part} />,
  };
}

function DefaultDetail({ part }: { part: Extract<ActivityPart, { type: "tool_call" }> }) {
  if (part.error) return <p className="text-sm text-chat-danger">{part.error}</p>;
  const body = part.result ?? part.input ?? part.inputJson;
  if (typeof body === "string") {
    return <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-chat-muted">{body}</p>;
  }
  return (
    <pre className="max-h-56 overflow-auto font-chat-mono text-[0.8125rem] leading-relaxed text-chat-muted">
      {JSON.stringify(body, null, 2)}
    </pre>
  );
}
