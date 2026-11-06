import { defaultToolViews, uiTreeToolView, widgetToolView, type ToolViews } from "agentic-ui-kit";
import { renderUiToolName, visualizeTool } from "agentic-ui-kit/core";

/**
 * The playground's harness uses the kit's suggested tools, so it maps those names to the kit's views. A host
 * with its own tools registers the same views under its names, with a `read` for its input shape.
 */
export const visualViews: ToolViews = {
  ...defaultToolViews,
  [visualizeTool.name]: widgetToolView(),
  [renderUiToolName]: uiTreeToolView(),
};
