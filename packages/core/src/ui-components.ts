// The kit's ready-made component set as the model sees it: name, description and props schema, no React.
// A server can build its tool prompt from `uiComponentSpecs`; `agentic-ui-kit` pairs each with its render.
import { uiActionSchema, type JsonSchema, type UiComponentSpec } from "./ui-tree";

const str = { type: "string" };
const obj = (properties: Record<string, unknown>, required: string[] = []): JsonSchema => ({ type: "object", properties, required, additionalProperties: false });
const tone = { enum: ["default", "accent", "good", "warning", "bad"] };

/**
 * The specs by name, so a host can pick or adjust one: `{ ...uiSpecs.Card, description: "..." }`.
 * Stack, Grid, Card, Heading, Text, Metric, List, Table, Badge, Progress, Checklist, Tabs, Show, Button.
 */
export const uiSpecs = {
  Stack: {
    name: "Stack",
    description: "Lays out children in a column (or a wrapping row with direction 'row').",
    children: true,
    props: obj({ direction: { enum: ["column", "row"] }, gap: { enum: ["sm", "md", "lg"] } }),
  },
  Grid: {
    name: "Grid",
    description: "Children in equal columns (2-4) that stack on narrow screens.",
    children: true,
    props: obj({ columns: { type: "integer", minimum: 2, maximum: 4 } }),
  },
  Card: {
    name: "Card",
    description: "A bordered box with an optional title, subtitle and tag. Highlight it with tone 'accent' when it is new or proposed.",
    children: true,
    props: obj({ title: str, subtitle: str, tag: str, tone: { enum: ["default", "accent"] } }),
  },
  Heading: {
    name: "Heading",
    description: "A section heading.",
    props: obj({ text: str }, ["text"]),
  },
  Text: {
    name: "Text",
    description: "A paragraph of plain text; tone 'muted' for secondary notes.",
    props: obj({ text: str, tone: { enum: ["default", "muted"] } }, ["text"]),
  },
  Metric: {
    name: "Metric",
    description: "A key number with a label and an optional note, e.g. 'Total' '€184' 'per person'.",
    props: obj({ label: str, value: { type: ["string", "number"] }, note: str, tone }, ["label", "value"]),
  },
  List: {
    name: "List",
    description: "Rows with a label, an optional detail on the right and an optional tag ('New', 'Changed').",
    props: obj({ items: { type: "array", items: obj({ label: str, detail: str, tag: str }, ["label"]) } }, ["items"]),
  },
  Table: {
    name: "Table",
    description: "Rows and columns of values: `columns` are the headings, each row lists its cells in the same order.",
    props: obj(
      { columns: { type: "array", items: str, minItems: 1 }, rows: { type: "array", items: { type: "array", items: { type: ["string", "number"] } } } },
      ["columns", "rows"],
    ),
  },
  Badge: {
    name: "Badge",
    description: "A short status label such as 'Live' or 'Failed'; tone colors it.",
    props: obj({ label: str, tone }, ["label"]),
  },
  Progress: {
    name: "Progress",
    description: "A bar showing `value` out of `max` (default 100), with an optional label.",
    props: obj({ label: str, value: { type: "number", minimum: 0 }, max: { type: "number", minimum: 1 }, tone }, ["value"]),
  },
  Checklist: {
    name: "Checklist",
    description: "Items the user ticks off; ticks stay in the widget's state under `stateKey`.",
    props: obj({ stateKey: str, items: { type: "array", items: str } }, ["stateKey", "items"]),
  },
  Tabs: {
    name: "Tabs",
    description: "A row of choices that sets a state key; pair with Show to switch content. `value` reads the same key from state.",
    props: obj({ stateKey: str, value: str, options: { type: "array", items: obj({ id: str, label: str }, ["id", "label"]), minItems: 2 } }, ["stateKey", "options"]),
  },
  Show: {
    name: "Show",
    description: "Shows its children only when `value` equals `equals`. `value` reads the state key; the first tab shows while the key is unset if `fallback` is true.",
    children: true,
    props: obj({ value: str, equals: str, fallback: { type: "boolean" } }, ["equals"]),
  },
  Button: {
    name: "Button",
    description: "Runs an action. Use action 'set' for things the widget can do itself, 'send' only when you need to act.",
    props: obj({ label: str, variant: { enum: ["primary", "secondary"] }, onPress: uiActionSchema }, ["label", "onPress"]),
  },
} satisfies Record<string, UiComponentSpec>;

/** Which components are display only and which take input or drive state. */
export const uiSpecGroups = {
  display: ["Stack", "Grid", "Card", "Heading", "Text", "Metric", "List", "Table", "Badge", "Progress"],
  interactive: ["Checklist", "Tabs", "Show", "Button"],
} as const satisfies Record<string, readonly (keyof typeof uiSpecs)[]>;

export type UiSpecName = keyof typeof uiSpecs;
/** A component name, or a group of them: "display" or "interactive". */
export type UiSpecPick = UiSpecName | keyof typeof uiSpecGroups;

export interface UiSpecSelection {
  /** Only these (names or groups). Default: all. */
  include?: readonly UiSpecPick[];
  /** Leave these out (names or groups), after `include`. */
  exclude?: readonly UiSpecPick[];
}

const names = (picks: readonly UiSpecPick[]): Set<string> => new Set(picks.flatMap((p) => (p in uiSpecGroups ? uiSpecGroups[p as keyof typeof uiSpecGroups] : [p])));

/**
 * The specs of the components a host registers, in a fixed order. Feed it to `renderUiTool`, `showUiTool`,
 * `uiMarkupGuide` and `checkUiTree` so the model is only told about, and only checked against, those:
 * `uiSpecSet({ exclude: ["interactive"] })` is display only.
 */
export function uiSpecSet({ include, exclude }: UiSpecSelection = {}): UiComponentSpec[] {
  const only = include && names(include);
  const out = exclude && names(exclude);
  return Object.values(uiSpecs).filter((s: UiComponentSpec) => (!only || only.has(s.name)) && !out?.has(s.name));
}

/** All of `uiSpecs` as a list: `uiSpecSet()`. */
export const uiComponentSpecs: readonly UiComponentSpec[] = uiSpecSet();
