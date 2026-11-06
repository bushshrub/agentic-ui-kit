// `agentic-ui-kit/visuals`: inline visuals (model-drawn UI). Wrap the chat in <VisualsProvider> to turn them on.
export { VisualsProvider, visualToolViews } from "./provider";
export type { VisualsProviderProps } from "./provider";
export { WidgetFrame, WidgetHostProvider, useWidgetHost, WidgetPartView, widgetToolView, readVisualizeInput, widgetCsp, intersectAllow, openInNewTab, WIDGET_MAX_HEIGHT } from "./widget-frame";
export type { WidgetFrameProps, WidgetToolInput, WidgetHost, WidgetAllow, WidgetResource } from "./widget-frame";
export { UiComponentsProvider, UiTree, UiMarkupBlock, useUiMarkupLanguage, useUiAction, useUiState, htmlComponent, uiTreeToolView, uiMarkupToolView, readTreeInput } from "./ui-tree";
export type { UiComponent, UiStateStore, UiTreeProps, UiToolViewOptions } from "./ui-tree";
export { uiComponents, uiComponentSet, uiRenders } from "./ui-components";
export type { UiComponentSetOptions } from "./ui-components";
