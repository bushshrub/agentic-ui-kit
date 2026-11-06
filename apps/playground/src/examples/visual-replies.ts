// Scripted replies that mix prose, sandboxed HTML (show_widget) and host components (render_ui), as a
// model would write them. Pure data: the player in the stories streams any script the same way.
import type { WidgetAllow } from "agentic-ui-kit";
import { renderUiToolName, visualizeTool } from "agentic-ui-kit/core";
import type { ReplyStep } from "../lib/visual-reply";
import mapHtml from "../widgets/map.html?raw";

export interface VisualScript {
  ask: string;
  steps: ReplyStep[];
  /** What the script's widgets may load. */
  allow?: WidgetAllow;
}

const ui = (root: unknown, state?: Record<string, unknown>): ReplyStep => ({ tool: renderUiToolName, input: { root, ...(state && { state }) } });
const html = (title: string, widget_code: string, loading_messages: string[]): ReplyStep => ({
  tool: visualizeTool.name,
  input: { title, loading_messages, widget_code },
});
const send = (text: string) => ({ action: "send", text });
const set = (key: string, value: unknown) => ({ action: "set", key, value });

/** Host components only: a comparison the user can switch between, with a round trip for the decision. */
export const laptopCompare: VisualScript = {
  ask: "Which of these three laptops should I get for photo editing on the road?",
  steps: [
    { text: "For photo editing on the move, the screen and battery matter most. Here's how they compare:" },
    ui(
      {
        component: "Stack",
        children: [
          {
            component: "Tabs",
            props: { stateKey: "view", value: { $state: "view" }, options: [{ id: "summary", label: "Summary" }, { id: "specs", label: "Specs" }] },
          },
          {
            component: "Show",
            props: { value: { $state: "view" }, equals: "summary", fallback: true },
            children: [
              {
                component: "Grid",
                props: { columns: 3 },
                children: [
                  { component: "Card", props: { title: "Aero 14", tag: "Best pick", tone: "accent" }, children: [{ component: "Metric", props: { label: "Price", value: "€1,499", note: "100% DCI-P3 OLED", tone: "accent" } }] },
                  { component: "Card", props: { title: "Swift Pro 16" }, children: [{ component: "Metric", props: { label: "Price", value: "€1,799", note: "Bigger, heavier" } }] },
                  { component: "Card", props: { title: "Nimbus 13" }, children: [{ component: "Metric", props: { label: "Price", value: "€1,099", note: "sRGB only", tone: "warning" } }] },
                ],
              },
            ],
          },
          {
            component: "Show",
            props: { value: { $state: "view" }, equals: "specs" },
            children: [
              {
                component: "List",
                props: {
                  items: [
                    { label: "Aero 14: battery", detail: "13 h" },
                    { label: "Swift Pro 16: battery", detail: "9 h" },
                    { label: "Nimbus 13: battery", detail: "15 h" },
                    { label: "Aero 14: weight", detail: "1.4 kg" },
                    { label: "Swift Pro 16: weight", detail: "2.1 kg" },
                    { label: "Nimbus 13: weight", detail: "1.1 kg" },
                  ],
                },
              },
            ],
          },
          {
            component: "Stack",
            props: { direction: "row", gap: "sm" },
            children: [
              { component: "Button", props: { label: "Find the Aero 14 cheaper", variant: "primary", onPress: send("Find the Aero 14 cheaper, new or refurbished.") } },
              { component: "Button", props: { label: "Show specs", onPress: set("view", "specs") } },
            ],
          },
        ],
      },
      { view: "summary" },
    ),
    { text: "The Aero 14 is the one: its OLED covers the full P3 range, and it lasts a full day away from a plug." },
  ],
};

/** Everything in one reply: host components for the plan, a sandboxed map, more components for the to-dos. */
export const weekendPlan: VisualScript = {
  ask: "Plan a Saturday in Lisbon for two, on foot mostly, with a budget and what to book.",
  allow: { resourceDomains: ["https://unpkg.com", "https://tile.openstreetmap.org"] },
  steps: [
    { text: "Here's a walkable Saturday from Belém to Alfama. First the numbers:" },
    ui({
      component: "Grid",
      props: { columns: 4 },
      children: [
        { component: "Metric", props: { label: "On foot", value: "9 km", note: "tram 15 to skip 3 km" } },
        { component: "Metric", props: { label: "Budget", value: "€184", note: "for two", tone: "accent" } },
        { component: "Metric", props: { label: "Stops", value: 5 } },
        { component: "Metric", props: { label: "To book", value: 2, tone: "warning" } },
      ],
    }),
    { text: "The route, with each stop on the map:" },
    html("lisbon_saturday", mapHtml, ["Plotting the route", "Finding the custard tarts", "Placing the stops"]),
    { text: "And the day hour by hour. I added a fado dinner you didn't ask for, so it's marked new:" },
    ui(
      {
        component: "Card",
        props: { title: "Saturday" },
        children: [
          {
            component: "Stack",
            children: [
              {
                component: "Tabs",
                props: { stateKey: "part", value: { $state: "part" }, options: [{ id: "am", label: "Morning" }, { id: "pm", label: "Afternoon" }, { id: "eve", label: "Evening" }] },
              },
              { component: "Show", props: { value: { $state: "part" }, equals: "am", fallback: true }, children: [{ component: "List", props: { items: [{ label: "Pastéis de Belém", detail: "9:00 · €12" }, { label: "Jerónimos Monastery", detail: "9:45 · €36" }] } }] },
              { component: "Show", props: { value: { $state: "part" }, equals: "pm" }, children: [{ component: "List", props: { items: [{ label: "LX Factory, lunch", detail: "12:00 · €40" }, { label: "Miradouro de Santa Catarina", detail: "15:30 · free" }] } }] },
              { component: "Show", props: { value: { $state: "part" }, equals: "eve" }, children: [{ component: "List", props: { items: [{ label: "Walk up through Alfama", detail: "18:00" }, { label: "Fado dinner, Tasca do Chico", detail: "20:30 · €96", tag: "New" }] } }] },
            ],
          },
        ],
      },
      { part: "am" },
    ),
    { text: "Two things need booking ahead:" },
    ui({
      component: "Card",
      props: { title: "Before you go", tone: "accent", tag: "To do" },
      children: [
        {
          component: "Stack",
          children: [
            { component: "Checklist", props: { stateKey: "booked", items: ["Jerónimos tickets (timed entry)", "Fado dinner for 20:30"] } },
            {
              component: "Stack",
              props: { direction: "row", gap: "sm" },
              children: [
                { component: "Button", props: { label: "Book both for me", variant: "primary", onPress: send("Book the Jerónimos tickets and the fado dinner for two.") } },
                { component: "Button", props: { label: "Swap the dinner", onPress: send("Swap the fado dinner for something cheaper.") } },
                { component: "Button", props: { label: "Copy the plan", onPress: { action: "copy", text: "Sat in Lisbon: Belém 9:00, Jerónimos 9:45, LX Factory 12:00, Santa Catarina 15:30, Alfama 18:00, fado 20:30." } } },
              ],
            },
          ],
        },
      ],
    }),
  ],
};

const skiMarkup = `<State bag="suitcase" />
<Stack gap="md">
  <Grid columns={3}>
    <Metric label="Days" value={4} />
    <Metric label="Items" value={23} />
    <Metric label="Rented" value="Skis, boots, poles" tone="good" />
  </Grid>
  <Tabs stateKey="bag" value={$state.bag} options={[{id: "suitcase", label: "Suitcase"}, {id: "day", label: "Day pack"}, {id: "docs", label: "Papers"}]} />
  <Show value={$state.bag} equals="suitcase" fallback>
    <Card title="Suitcase">
      <Checklist stateKey="suitcase" items={["Ski jacket", "Ski trousers", "2 thermal base layers", "Fleece mid layer", "4 pairs of ski socks", "Après-ski boots", "Swimwear for the spa"]} />
    </Card>
  </Show>
  <Show value={$state.bag} equals="day">
    <Card title="Day pack" tag="On the slope">
      <Checklist stateKey="day" items={["Helmet", "Goggles", "Gloves and liners", "Neck warmer", "Sunscreen SPF 50", "Lip balm", "Water bottle", "Snack"]} />
    </Card>
  </Show>
  <Show value={$state.bag} equals="docs">
    <Card title="Papers">
      <Checklist stateKey="docs" items={["ID", "Lift pass booking", "Ski rental voucher", "Insurance card", "Accommodation address"]} />
    </Card>
  </Show>
  <Button label="Add a list for the drive" variant="secondary" onPress={{action: "send", text: "Add a checklist for the drive there"}} />
</Stack>`;

const skiThinking = {
  title: "Sorting the list by where it goes",
  thinking:
    "They rent skis, so no skis, poles or boots on the list, but helmet and goggles are personal. Val Thorens is high, so " +
    "cold mornings and strong sun: layers, sunscreen, lip balm. Group by bag so it is easy to tick off while packing. " +
    "A checklist per group, and a tab to switch between the suitcase and the day pack.",
};
const skiAfter = "The rental shop fits boots on the first morning, so bring the ski socks in your day pack that day.";

/** UI from the suggested `show_ui` tool: thinking, a line of text, then JSX markup streaming in a tool call. */
export const skiPackingTool: VisualScript = {
  ask: "Make a packing checklist for a 4-day ski trip to Val Thorens. I rent skis there.",
  steps: [
    skiThinking,
    { text: "Here's the list by bag. Ticks stay put, so you can pack over a couple of evenings." },
    { tool: "show_ui", input: { markup: skiMarkup }, result: "Shown to the user." },
    { text: skiAfter },
  ],
};

/** The same reply written with `uiMarkupGuide` instead: JSX in a ```ui block of the reply text. */
export const skiPacking: VisualScript = {
  ask: "Make a packing checklist for a 4-day ski trip to Val Thorens. I rent skis there.",
  steps: [
    skiThinking,
    { text: "Here's the list by bag. Ticks stay put, so you can pack over a couple of evenings.\n\n" },
    {
      text: `\`\`\`ui
${skiMarkup}
\`\`\`

${skiAfter}`,
    },
  ],
};
