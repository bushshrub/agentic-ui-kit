import type { ContextCategory, ContextGroup, ContextUsage } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { Disclosure } from "../primitives/disclosure";
import { Tooltip } from "../primitives/tooltip";
import { Focusable } from "react-aria-components";
import { formatTokens } from "./token-counter";

export interface ContextPanelProps {
  usage: ContextUsage;
  /** Section title. */
  title?: string;
  defaultExpanded?: boolean;
  className?: string;
}

const FREE_COLOR = "var(--chat-raised)";
const DEFAULT_COLOR = "var(--chat-subtle)";

/**
 * What fills the context window: a usage line, a segmented bar, one row per category with its share, and
 * expandable lists (each MCP tool, each memory file). Deferred categories are listed but not counted.
 */
export function ContextPanel({ usage, title = "Context", defaultExpanded = true, className }: ContextPanelProps) {
  const counted = usage.categories.filter((c) => !c.deferred);
  const deferred = usage.categories.filter((c) => c.deferred);
  const used = counted.reduce((sum, c) => sum + (c.reserved ? 0 : c.tokens), 0);
  const reserved = counted.reduce((sum, c) => sum + (c.reserved ? c.tokens : 0), 0);
  const free = Math.max(usage.limit - used - reserved, 0);
  const share = (tokens: number) => formatShare(tokens / usage.limit);

  return (
    <Disclosure
      summary={title}
      defaultExpanded={defaultExpanded}
      className={clsx("font-chat-sans text-chat-fg", className)}
      summaryClassName="text-[0.9375rem] text-chat-fg"
      panelClassName="pt-3"
    >
      <div className="mb-2 flex items-baseline justify-between text-[0.9375rem]">
        <span>{Math.round((used / usage.limit) * 100)}% used</span>
        <span className="text-sm text-chat-muted tabular-nums">
          {formatTokens(used)} / {formatTokens(usage.limit)}
        </span>
      </div>

      <div
        role="meter"
        aria-label="Context used"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={used}
        className="mb-3 flex h-1 gap-px overflow-hidden rounded-full"
        style={{ background: FREE_COLOR }}
      >
        {counted.map((c) => (
          <span
            key={c.id}
            className="h-full min-w-[2px]"
            style={{ width: `${(c.tokens / usage.limit) * 100}%`, background: c.color ?? DEFAULT_COLOR }}
          />
        ))}
      </div>

      <ul className="space-y-1">
        {counted.map((c) => (
          <CategoryRow key={c.id} category={c} share={share(c.tokens)} />
        ))}
        <CategoryRow category={{ id: "free", label: "Free space", tokens: free, color: FREE_COLOR }} share={share(free)} />
      </ul>

      {deferred.length > 0 && (
        <ul className="mt-3 space-y-1">
          {deferred.map((c) => (
            <CategoryRow key={c.id} category={c} share="—" />
          ))}
        </ul>
      )}

      {usage.groups && usage.groups.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {usage.groups.map((g) => (
            <GroupList key={g.id} group={g} />
          ))}
        </div>
      )}
    </Disclosure>
  );
}

function CategoryRow({ category, share }: { category: ContextCategory; share: string }) {
  const label = category.hint ? (
    <Tooltip content={category.hint}>
      <Focusable>
        <span
          tabIndex={0}
          className="cursor-help underline decoration-chat-subtle decoration-dotted underline-offset-4 outline-none"
        >
          {category.label}
        </span>
      </Focusable>
    </Tooltip>
  ) : (
    category.label
  );
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-[2px]"
        style={{ background: category.color ?? (category.deferred ? "var(--chat-selected)" : DEFAULT_COLOR) }}
      />
      <span className="min-w-0 flex-1 truncate text-chat-muted">{label}</span>
      <span className="w-14 text-right text-chat-muted tabular-nums">{formatTokens(category.tokens)}</span>
      <span className="w-12 text-right text-chat-muted tabular-nums">{share}</span>
    </li>
  );
}

function GroupList({ group }: { group: ContextGroup }) {
  return (
    <Disclosure
      summary={group.label}
      trailing={<span className="text-sm text-chat-subtle tabular-nums">{group.items.length}</span>}
      indicator="chevron"
      summaryClassName="text-sm"
      panelClassName="pt-1.5"
    >
      <ul className="max-h-72 space-y-1 overflow-y-auto pl-6 [scrollbar-color:var(--chat-border-strong)_transparent] [scrollbar-width:thin]">
        {group.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm text-chat-muted">
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <span className="w-12 shrink-0 text-right tabular-nums">{formatTokens(item.tokens)}</span>
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}

function formatShare(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
