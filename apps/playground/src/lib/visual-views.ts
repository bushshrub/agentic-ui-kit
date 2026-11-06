import { defaultToolViews, type ToolViews } from "agentic-ui-kit";
import { visualToolViews } from "agentic-ui-kit/visuals";

/**
 * The kit's views for the suggested tools, on top of the default views. `<VisualsProvider>` adds the visual
 * ones by itself; this is for a host that sets its own `ToolViewsProvider` and wants both lists in one object.
 */
export const visualViews: ToolViews = { ...defaultToolViews, ...visualToolViews };
