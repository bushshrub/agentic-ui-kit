// The kit's ready-made component set for render_ui trees and ```ui blocks: layout, text, numbers, tables,
// inputs. Nothing here is about a domain; the model composes these into itineraries, comparisons,
// dashboards, checklists. The specs the model sees live in core (`uiSpecs`), so a server can import them;
// the drawings here are separate, so a host can keep a spec and plug in its own render.
import { uiSpecSet, type UiSpecName, type UiSpecSelection } from "@agentic-ui-kit/core";
import type { ComponentType, ReactNode } from "react";
import { Button } from "../primitives/button";
import { useUiAction, useUiState, type UiComponent } from "./ui-tree";

/** How a component is drawn: gets its props (checked, state refs resolved) and its rendered children. */
type UiRender = ComponentType<any>;

const toneClass: Record<string, string> = {
  default: "text-chat-fg",
  accent: "text-chat-accent",
  good: "text-chat-check",
  warning: "text-chat-warning",
  bad: "text-chat-danger",
};
const fillClass: Record<string, string> = {
  default: "bg-chat-fg",
  accent: "bg-chat-accent",
  good: "bg-chat-check",
  warning: "bg-chat-warning",
  bad: "bg-chat-danger",
};

type Kids = { children?: ReactNode };

/** "New" / "Changed": what the model added stands out in the accent. */
function Tag({ children, quiet = false }: { children: ReactNode; quiet?: boolean }) {
  return (
    <span className={`rounded-chat-sm px-1.5 text-(length:--chat-ui-font-size-sm) font-medium ${quiet ? "border border-chat-border-strong text-chat-muted" : "bg-chat-accent text-chat-accent-fg"}`}>
      {children}
    </span>
  );
}

const Stack: UiRender = ({ direction = "column", gap = "md", children }: Kids & { direction?: string; gap?: string }) => (
    <div className={`flex ${direction === "row" ? "flex-row flex-wrap" : "flex-col"} ${{ sm: "gap-1.5", md: "gap-3", lg: "gap-5" }[gap]}`}>{children}</div>
  );

const Grid: UiRender = ({ columns = 2, children }: Kids & { columns?: number }) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${Math.floor(36 / columns)}rem), 1fr))` }}>{children}</div>
  );

const Card: UiRender = ({ title, subtitle, tag, tone = "default", children }: Kids & { title?: string; subtitle?: string; tag?: string; tone?: string }) => (
    <section className={`rounded-chat-lg border p-3 ${tone === "accent" ? "border-chat-accent" : "border-chat-border"}`}>
      {(title || tag) && (
        <header className="mb-1 flex items-center gap-2">
          {title && <h3 className="font-chat-sans text-(length:--chat-ui-font-size) font-semibold">{title}</h3>}
          {tag && <Tag quiet={tone !== "accent"}>{tag}</Tag>}
        </header>
      )}
      {subtitle && <p className="mb-2 text-(length:--chat-ui-font-size-sm) text-chat-muted">{subtitle}</p>}
      {children}
    </section>
  );

const Heading: UiRender = ({ text }: { text: string }) => <h2 className="font-chat-sans text-(length:--chat-ui-font-size) font-semibold">{text}</h2>;

const Text: UiRender = ({ text, tone = "default" }: { text: string; tone?: string }) => (
    <p className={`font-chat-sans text-(length:--chat-ui-font-size) leading-relaxed ${tone === "muted" ? "text-chat-muted" : ""}`}>{text}</p>
  );

const Metric: UiRender = ({ label, value, note, tone = "default" }: { label: string; value: string | number; note?: string; tone?: string }) => (
    <div className="min-w-24">
      <div className="text-(length:--chat-ui-font-size-sm) text-chat-muted">{label}</div>
      <div className={`font-chat-sans text-xl font-semibold tabular-nums ${toneClass[tone]}`}>{value}</div>
      {note && <div className="text-(length:--chat-ui-font-size-sm) text-chat-subtle">{note}</div>}
    </div>
  );

const List: UiRender = ({ items }: { items: { label: string; detail?: string; tag?: string }[] }) => (
    <ul className="divide-y divide-chat-divider">
      {items.map((item, i) => (
        <li key={i} className="flex items-baseline gap-2 py-1.5 font-chat-sans text-(length:--chat-ui-font-size)">
          <span className={item.tag ? "text-chat-accent" : ""}>{item.label}</span>
          {item.tag && <Tag>{item.tag}</Tag>}
          {item.detail && <span className="ml-auto text-chat-muted tabular-nums">{item.detail}</span>}
        </li>
      ))}
    </ul>
  );

const Table: UiRender = ({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) => (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-left font-chat-sans text-(length:--chat-ui-font-size)">
        <thead>
          <tr className="border-b border-chat-border-strong">
            {columns.map((c, i) => (
              <th key={i} scope="col" className="px-2 py-1.5 font-medium text-chat-muted">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-chat-divider">
          {rows.map((row, r) => (
            <tr key={r}>
              {columns.map((_, c) => (
                <td key={c} className={`px-2 py-1.5 ${typeof row[c] === "number" ? "tabular-nums" : ""}`}>{row[c]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

const Badge: UiRender = ({ label, tone = "default" }: { label: string; tone?: string }) => (
    <span className={`inline-block self-start rounded-chat-sm border border-current px-1.5 font-chat-sans text-(length:--chat-ui-font-size-sm) font-medium ${toneClass[tone]}`}>{label}</span>
  );

const Progress: UiRender = ({ label, value, max = 100, tone = "accent" }: { label?: string; value: number; max?: number; tone?: string }) => {
    const share = Math.min(1, Math.max(0, value / max));
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <div className="flex justify-between text-(length:--chat-ui-font-size-sm) text-chat-muted">
            <span>{label}</span>
            <span className="tabular-nums">{Math.round(share * 100)}%</span>
          </div>
        )}
        <div role="progressbar" aria-label={label ?? "Progress"} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} className="h-1.5 overflow-hidden rounded-full bg-chat-border">
          <div className={`h-full rounded-full ${fillClass[tone]}`} style={{ width: `${share * 100}%` }} />
        </div>
      </div>
    );
  };

const Checklist: UiRender = function Checklist({ stateKey, items }: { stateKey: string; items: string[] }) {
    const [state, set] = useUiState();
    const done = (state[stateKey] as string[] | undefined) ?? [];
    return (
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item}>
            <label className="flex items-center gap-2 font-chat-sans text-(length:--chat-ui-font-size)">
              <input
                type="checkbox"
                className="accent-(--chat-accent)"
                checked={done.includes(item)}
                onChange={(e) => set(stateKey, e.target.checked ? [...done, item] : done.filter((d) => d !== item))}
              />
              <span className={done.includes(item) ? "text-chat-subtle line-through" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    );
  };

const Tabs: UiRender = function Tabs({ stateKey, value, options }: { stateKey: string; value?: string; options: { id: string; label: string }[] }) {
    const [, set] = useUiState();
    const current = value ?? options[0]!.id;
    return (
      <div role="tablist" className="inline-flex max-w-full flex-wrap gap-1 self-start rounded-chat-md border border-chat-border p-0.5">
        {options.map((o) => (
          <Button key={o.id} size="sm" variant={o.id === current ? "subtle" : "ghost"} onPress={() => set(stateKey, o.id)} aria-selected={o.id === current}>
            {o.label}
          </Button>
        ))}
      </div>
    );
  };

const Show: UiRender = ({ value, equals, fallback, children }: Kids & { value?: string; equals: string; fallback?: boolean }) =>
    value === equals || (value === undefined && fallback) ? <>{children}</> : null;

const UiButton: UiRender = function UiButton({ label, variant = "secondary", onPress }: { label: string; variant?: string; onPress: unknown }) {
    const run = useUiAction();
    return (
      <Button size="sm" className="self-start" variant={variant === "primary" ? "primary" : "subtle"} onPress={() => run(onPress)}>
        {label}
      </Button>
    );
  };

/**
 * The drawing of each component, by name and apart from its spec. Take one to reuse in your own
 * component: `{ ...uiSpecs.Card, render: uiRenders.Card }`.
 */
export const uiRenders = { Stack, Grid, Card, Heading, Text, Metric, List, Table, Badge, Progress, Checklist, Tabs, Show, Button: UiButton } satisfies Record<UiSpecName, UiRender>;

export interface UiComponentSetOptions extends UiSpecSelection {
  /** Draw a component with your own render (your design system's Button, say); its spec, and so what the model is told, stays. */
  renders?: { [Name in UiSpecName]?: UiRender };
}

/**
 * The ready components for `UiComponentsProvider`, in the order of `uiComponentSpecs`. Everything by default;
 * `include` and `exclude` take component names or the groups `"display"` (Stack, Grid, Card, Heading, Text,
 * Metric, List, Table, Badge, Progress) and `"interactive"` (Checklist, Tabs, Show, Button). `renders` swaps the
 * drawing of single components. Build the model's tool from the same picks so it only hears of what you
 * registered: `uiSpecSet({ include })` in `agentic-ui-kit/core`, or strip the renders from this list.
 */
export function uiComponentSet({ renders = {}, ...selection }: UiComponentSetOptions = {}): UiComponent[] {
  return uiSpecSet(selection).map((spec) => ({ ...spec, render: renders[spec.name as UiSpecName] ?? uiRenders[spec.name as UiSpecName] }));
}

/** The whole set: `uiComponentSet()`. */
export const uiComponents: readonly UiComponent[] = uiComponentSet();
