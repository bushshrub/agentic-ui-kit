// Inline visuals (model-drawn UI): tool definitions, guides, checks and specs. Published as `agentic-ui-kit/visuals/core`.
export { widgetFrameLoader, widgetLoaderMessages } from "./widget-loader";
export { replacesProperty, replacesGuide, replacedId, resolveReplaces, withCallId } from "./replaces";
export { visualizeTool, visualizeGuide, checkWidgetCode } from "./visualize";
export type { VisualizeInput, WidgetCodeCheck } from "./visualize";
export { matchesSchema, schemaErrors, checkUiTree, isStateRef, renderUiTool, renderUiToolName, uiActionSchema } from "./ui-tree";
export type { UiNode, UiAction, RenderUiInput, UiComponentSpec, UiTreeCheck } from "./ui-tree";
export { parseUiMarkup, readUiValue, findUiBlocks, checkUiMarkup, checkUiMarkupCode, showUiTool, showUiToolName, uiMarkupGuide, uiMarkupLanguage } from "./ui-markup";
export type { UiMarkup, UiMarkupBlock, UiMarkupCheck, ShowUiInput } from "./ui-markup";
export type { UiTreeCheckOptions } from "./ui-tree";
export { uiSpecs, uiSpecGroups, uiSpecSet, uiComponentSpecs } from "./ui-components";
export type { UiSpecName, UiSpecPick, UiSpecSelection } from "./ui-components";
