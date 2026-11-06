import type { Message, Part, ToolCallPart } from "@agentic-ui-kit/core";
import type { ToolViews } from "./tools";
import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from "react";

/** A fenced code block handed to a `codeBlocks` renderer. `id` is stable while the block streams. */
export interface CodeBlockRendererProps {
  /** Keys this block's state: the text part's id and the block's start line. */
  id: string;
  code: string;
  /** The text is still arriving. */
  streaming: boolean;
}

/** One reply's tool calls grouped into chains: each call's first call, and each first call's chain in order. */
export interface ToolCallGroups {
  first: ReadonlyMap<string, string>;
  chains: ReadonlyMap<string, readonly ToolCallPart[]>;
}

export interface ChatExtensions {
  /** Draws fenced code blocks of a language (the key) instead of the code box. Only for text parts that have an id. */
  codeBlocks?: Record<string, ComponentType<CodeBlockRendererProps>>;
  /** Views for tools the host did not give a view of its own (a `ToolViewsProvider` entry of the same name wins). */
  toolViews?: ToolViews;
  /** Draws parts the kit has no view for (after `renderPart` on the list). */
  renderPart?: (part: Part) => ReactNode;
  /** Wraps the message list, with all its messages in view. */
  messageScope?: ComponentType<{ messages: readonly Message[]; children: ReactNode }>;
  /** Draws several tool calls of one reply as a single chain: `group` finds the chains, `Chain` draws one. */
  toolChains?: {
    group: (message: Message) => ToolCallGroups;
    Chain: ComponentType<{ chain: readonly ToolCallPart[]; draw: (part: ToolCallPart) => ReactNode }>;
  };
}

const ExtensionsContext = createContext<ChatExtensions>({});

/** Plugs extensions into every message list below it. Nested providers add to (and override) the outer one. */
export function ChatExtensionsProvider({ extensions, children }: { extensions: ChatExtensions; children: ReactNode }) {
  const outer = useContext(ExtensionsContext);
  const value = useMemo<ChatExtensions>(
    () => ({ ...outer, ...extensions, codeBlocks: { ...outer.codeBlocks, ...extensions.codeBlocks } }),
    [outer, extensions],
  );
  return <ExtensionsContext.Provider value={value}>{children}</ExtensionsContext.Provider>;
}

export function useChatExtensions(): ChatExtensions {
  return useContext(ExtensionsContext);
}

/** What the transcript's parts may do. `ChatView` provides its `onSend`; `ChatTranscript` is read-only. */
export interface ChatInteraction {
  send?: (text: string) => void;
  readOnly?: boolean;
}

const InteractionContext = createContext<ChatInteraction>({});

export const ChatInteractionProvider = InteractionContext.Provider;

export function useChatInteraction(): ChatInteraction {
  return useContext(InteractionContext);
}
