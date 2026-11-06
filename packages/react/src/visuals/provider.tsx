import type { Message } from "@agentic-ui-kit/core";
import { showUiToolName, renderUiToolName, uiMarkupLanguage, visualizeTool } from "@agentic-ui-kit/core/visuals";
import { useMemo, type ReactNode } from "react";
import { ChatExtensionsProvider, type ChatExtensions, type CodeBlockRendererProps } from "../components/extensions";
import type { ToolViews } from "../components/tools";
import { chainsOf, LaterReplacements, laterReplacements, ToolChain } from "./replacements";
import { UiComponentsProvider, UiMarkupBlock, uiMarkupToolView, uiTreeToolView, type UiComponent, type UiStateStore } from "./ui-tree";
import { openInNewTab, WidgetHostProvider, WidgetPartView, widgetToolView, type WidgetHost } from "./widget-frame";

/** Views for the suggested tools: `visualizeTool`, `renderUiTool` and `showUiTool`, under their names. */
export const visualToolViews: ToolViews = {
  [visualizeTool.name]: widgetToolView(),
  [renderUiToolName]: uiTreeToolView(),
  [showUiToolName]: uiMarkupToolView(),
};

function LaterScope({ messages, children }: { messages: readonly Message[]; children: ReactNode }) {
  const later = useMemo(() => laterReplacements(messages), [messages]);
  return <LaterReplacements value={later}>{children}</LaterReplacements>;
}

const extensions: ChatExtensions = {
  toolViews: visualToolViews,
  renderPart: (part) => (part.type === "widget" ? <WidgetPartView part={part} /> : undefined),
  messageScope: LaterScope,
  toolChains: { group: chainsOf, Chain: ToolChain },
};

export interface VisualsProviderProps {
  /** The components the model may use in `show_ui` / `render_ui` calls and ```ui blocks. None by default. */
  components?: readonly UiComponent[];
  /** Keeps each widget's state (ticks, picked tab) across reloads. */
  persist?: UiStateStore;
  /** Fence language of UI blocks in replies; `false` shows them as code. Default: core's `uiMarkupLanguage`. */
  markup?: string | false;
  /**
   * What widgets (sandboxed HTML) may do: the domains they may load, and their callbacks. Inside a ChatView a
   * widget's sendPrompt sends through `onSend`, and links open in a new tab unless set here; set a callback
   * to `undefined` to turn it off. In a ChatTranscript widgets cannot send or call tools.
   */
  host?: WidgetHost;
  children: ReactNode;
}

/**
 * Turns on inline visuals for the chats below it: views for the suggested tools, `widget` parts, ```ui
 * blocks, and in-place updates (`replaces`). One line: `<VisualsProvider components={uiComponents}>`.
 */
export function VisualsProvider({ components = [], persist, markup = uiMarkupLanguage, host, children }: VisualsProviderProps) {
  const hostValue = useMemo<WidgetHost>(() => ({ onOpenLink: openInNewTab, ...host }), [host]);
  const own = useMemo<ChatExtensions>(
    () => ({ ...extensions, ...(markup !== false && { codeBlocks: { [markup]: UiMarkupCode } }) }),
    [markup],
  );
  return (
    <ChatExtensionsProvider extensions={own}>
      <WidgetHostProvider host={hostValue}>
        <UiComponentsProvider components={components} {...(persist && { persist })} markup={markup}>
          {children}
        </UiComponentsProvider>
      </WidgetHostProvider>
    </ChatExtensionsProvider>
  );
}

function UiMarkupCode({ id, code, streaming }: CodeBlockRendererProps) {
  return <UiMarkupBlock id={id} source={code} streaming={streaming} />;
}
