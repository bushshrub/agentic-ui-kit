import type { ToolCallPart } from "@agentic-ui-kit/core";
import { createContext, createElement, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/** JSON Schema for a tool's input, as the model provider expects it. */
export type JsonSchema = Record<string, unknown>;

export interface ToolContext {
  callId: string;
  messageId: string;
  /** Aborted when the user stops the chat. */
  signal: AbortSignal;
}

/**
 * One tool, as the page that owns it sees it. The same definition covers both kinds:
 *
 * - Client tool (has `execute`): the model calls it, the backend ends the run with the call awaiting, the
 *   browser runs `execute` (which can change the page directly) and sends the result back.
 * - Server tool (no `execute`): the backend runs it. `onResult` lets the page react, e.g. refetch the
 *   record the tool changed or apply the patch it returned.
 *
 * Either kind can need the user's approval first, and either kind can bring its own look in the chat.
 */
export interface AgentTool<Input = any, Output = unknown> {
  name: string;
  /** For the model. Sent with each request for client tools; server tools are described by the backend. */
  description?: string;
  inputSchema?: JsonSchema;
  execute?: (input: Input, context: ToolContext) => Output | Promise<Output>;
  /** Ask before running. The backend can also ask, per call, with `needsApproval`. */
  approval?: boolean | ((input: Input) => boolean);
  /**
   * Called whenever a call of this tool changes: input streaming in, awaiting approval, running, done.
   * For previews, e.g. drawing proposed calendar events while the user decides.
   */
  onCall?: (part: ToolCallPart & { input?: Input; result?: Output }) => void;
  /** Called once when a call of this tool finishes, client or server, done or failed. */
  onResult?: (part: ToolCallPart & { input: Input; result?: Output }) => void;
}

/** What a client tool looks like to the backend: sent with every request so it can offer them to the model. */
export interface ToolSpec {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}

/**
 * The tools and context the page currently offers. Components register what they own while mounted, so
 * the model's tools follow what is on screen.
 */
export class AgentRegistry {
  private tools = new Map<string, { current: AgentTool }>();
  private contexts = new Map<string, unknown>();
  private listeners = new Set<() => void>();
  private version = 0;

  addTool(holder: { current: AgentTool }): () => void {
    const name = holder.current.name;
    this.tools.set(name, holder);
    this.emit();
    return () => {
      if (this.tools.get(name) !== holder) return;
      this.tools.delete(name);
      this.emit();
    };
  }

  setContext(key: string, value: unknown): () => void {
    this.contexts.set(key, value);
    this.emit();
    return () => {
      if (this.contexts.get(key) !== value) return;
      this.contexts.delete(key);
      this.emit();
    };
  }

  tool(name: string): AgentTool | undefined {
    return this.tools.get(name)?.current;
  }

  list(): AgentTool[] {
    return [...this.tools.values()].map((h) => h.current);
  }

  /** Client tools, for the request. */
  specs(): ToolSpec[] {
    return this.list()
      .filter((t) => t.execute)
      .map(({ name, description, inputSchema }) => ({ name, ...(description && { description }), ...(inputSchema && { inputSchema }) }));
  }

  /** Everything the page shared with `useAgentContext`, for the request. */
  context(): Record<string, unknown> {
    return Object.fromEntries(this.contexts);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = () => this.version;

  private emit() {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}

const AgentContext = createContext<AgentRegistry | null>(null);

/** Holds the tools and context for the chats and the page inside it. */
export function AgentProvider({ registry, children }: { registry?: AgentRegistry; children: ReactNode }) {
  const [own] = useState(() => registry ?? new AgentRegistry());
  return createElement(AgentContext.Provider, { value: registry ?? own }, children);
}

export const useAgentRegistry = () => useContext(AgentContext);

/** Re-renders when tools or context change, e.g. for an inspector. */
export function useAgentSnapshot(): AgentRegistry | null {
  const registry = useAgentRegistry();
  useSyncExternalStore(registry?.subscribe ?? noopSubscribe, registry?.getVersion ?? zero, zero);
  return registry;
}

const noopSubscribe = () => () => {};
const zero = () => 0;

/**
 * Offers a tool while the calling component is mounted. The latest `tool` is always used, so `execute` can
 * close over current state; it is only re-registered when the name changes.
 */
export function useAgentTool<Input, Output>(tool: AgentTool<Input, Output>): void {
  const registry = useAgentRegistry();
  const holder = useRef(tool as AgentTool);
  useLayoutEffect(() => {
    holder.current = tool as AgentTool;
  });
  useEffect(() => registry?.addTool(holder), [registry, tool.name]);
}

/** Shares page state with the model, e.g. the form's current values. Sent with each request. */
export function useAgentContext(key: string, value: unknown): void {
  const registry = useAgentRegistry();
  useEffect(() => registry?.setContext(key, value), [registry, key, value]);
}
