// A small, generic component set a host might register for render_ui trees. Nothing here is about a
// domain: the model composes these into itineraries, comparisons, budgets, checklists.
import { Button, useUiAction, useUiState, type UiComponent } from "agentic-ui-kit";
import { uiActionSchema } from "agentic-ui-kit/core";
import type { ReactNode } from "react";

const str = { type: "string" };
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const tone = { enum: ["default", "accent", "good", "warning", "bad"] };
const toneClass: Record<string, string> = {
  default: "text-chat-fg",
  accent: "text-chat-accent",
  good: "text-chat-check",
  warning: "text-chat-warning",
  bad: "text-chat-danger",
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

export const uiComponents: UiComponent[] = [
  {
    name: "Stack",
    description: "Lays out children in a column (or a wrapping row with direction 'row').",
    children: true,
    props: obj({ direction: { enum: ["column", "row"] }, gap: { enum: ["sm", "md", "lg"] } }),
    render: ({ direction = "column", gap = "md", children }: Kids & { direction?: string; gap?: string }) => (
      <div className={`flex ${direction === "row" ? "flex-row flex-wrap" : "flex-col"} ${{ sm: "gap-1.5", md: "gap-3", lg: "gap-5" }[gap]}`}>{children}</div>
    ),
  },
  {
    name: "Grid",
    description: "Children in equal columns (2-4) that stack on narrow screens.",
    children: true,
    props: obj({ columns: { type: "integer", minimum: 2, maximum: 4 } }),
    render: ({ columns = 2, children }: Kids & { columns?: number }) => (
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${Math.floor(36 / columns)}rem), 1fr))` }}>{children}</div>
    ),
  },
  {
    name: "Card",
    description: "A bordered box with an optional title, subtitle and tag. Highlight it with tone 'accent' when it is new or proposed.",
    children: true,
    props: obj({ title: str, subtitle: str, tag: str, tone: { enum: ["default", "accent"] } }),
    render: ({ title, subtitle, tag, tone = "default", children }: Kids & { title?: string; subtitle?: string; tag?: string; tone?: string }) => (
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
    ),
  },
  {
    name: "Heading",
    description: "A section heading.",
    props: obj({ text: str }, ["text"]),
    render: ({ text }: { text: string }) => <h2 className="font-chat-sans text-(length:--chat-ui-font-size) font-semibold">{text}</h2>,
  },
  {
    name: "Text",
    description: "A paragraph of plain text; tone 'muted' for secondary notes.",
    props: obj({ text: str, tone: { enum: ["default", "muted"] } }, ["text"]),
    render: ({ text, tone = "default" }: { text: string; tone?: string }) => (
      <p className={`font-chat-sans text-(length:--chat-ui-font-size) leading-relaxed ${tone === "muted" ? "text-chat-muted" : ""}`}>{text}</p>
    ),
  },
  {
    name: "Metric",
    description: "A key number with a label and an optional note, e.g. 'Total' '€184' 'per person'.",
    props: obj({ label: str, value: { type: ["string", "number"] }, note: str, tone }, ["label", "value"]),
    render: ({ label, value, note, tone = "default" }: { label: string; value: string | number; note?: string; tone?: string }) => (
      <div className="min-w-24">
        <div className="text-(length:--chat-ui-font-size-sm) text-chat-muted">{label}</div>
        <div className={`font-chat-sans text-xl font-semibold tabular-nums ${toneClass[tone]}`}>{value}</div>
        {note && <div className="text-(length:--chat-ui-font-size-sm) text-chat-subtle">{note}</div>}
      </div>
    ),
  },
  {
    name: "List",
    description: "Rows with a label, an optional detail on the right and an optional tag ('New', 'Changed').",
    props: obj(
      { items: { type: "array", items: obj({ label: str, detail: str, tag: str }, ["label"]) } },
      ["items"],
    ),
    render: ({ items }: { items: { label: string; detail?: string; tag?: string }[] }) => (
      <ul className="divide-y divide-chat-divider">
        {items.map((item, i) => (
          <li key={i} className="flex items-baseline gap-2 py-1.5 font-chat-sans text-(length:--chat-ui-font-size)">
            <span className={item.tag ? "text-chat-accent" : ""}>{item.label}</span>
            {item.tag && <Tag>{item.tag}</Tag>}
            {item.detail && <span className="ml-auto text-chat-muted tabular-nums">{item.detail}</span>}
          </li>
        ))}
      </ul>
    ),
  },
  {
    name: "Checklist",
    description: "Items the user ticks off; ticks stay in the widget's state under `stateKey`.",
    props: obj({ stateKey: str, items: { type: "array", items: str } }, ["stateKey", "items"]),
    render: function Checklist({ stateKey, items }: { stateKey: string; items: string[] }) {
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
    },
  },
  {
    name: "Tabs",
    description: "A row of choices that sets a state key; pair with Show to switch content. `value` should be { \"$state\": key }.",
    props: obj({ stateKey: str, value: str, options: { type: "array", items: obj({ id: str, label: str }, ["id", "label"]), minItems: 2 } }, ["stateKey", "options"]),
    render: function Tabs({ stateKey, value, options }: { stateKey: string; value?: string; options: { id: string; label: string }[] }) {
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
    },
  },
  {
    name: "Show",
    description: "Shows its children only when `value` equals `equals`. Use `value: { \"$state\": key }`; the first tab shows while the key is unset if `fallback` is true.",
    children: true,
    props: obj({ value: str, equals: str, fallback: { type: "boolean" } }, ["equals"]),
    render: ({ value, equals, fallback, children }: Kids & { value?: string; equals: string; fallback?: boolean }) =>
      value === equals || (value === undefined && fallback) ? <>{children}</> : null,
  },
  {
    name: "Button",
    description: "Runs an action. Use action 'set' for things the widget can do itself, 'send' only when you need to act.",
    props: obj({ label: str, variant: { enum: ["primary", "secondary"] }, onPress: uiActionSchema }, ["label", "onPress"]),
    render: function UiButton({ label, variant = "secondary", onPress }: { label: string; variant?: string; onPress: unknown }) {
      const run = useUiAction();
      return (
        <Button size="sm" variant={variant === "primary" ? "primary" : "subtle"} onPress={() => run(onPress)}>
          {label}
        </Button>
      );
    },
  },
];
