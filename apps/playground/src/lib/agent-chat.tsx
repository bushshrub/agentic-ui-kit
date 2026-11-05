import { Button, ChatHeader, ChatView, useChat, type Density, type Transport } from "agentic-ui-kit";
import { Sparkles } from "lucide-react";
import { useMemo, type ReactNode } from "react";

export interface AgentChatProps {
  transport: () => Transport;
  title: string;
  /** One-click prompts in the empty state. */
  suggestions: string[];
  density?: Density;
  header?: ReactNode;
}

/**
 * The chat half of an agent example. It knows nothing about the page: the page registers its tools and
 * context with `useAgentTool` / `useAgentContext` under the same `AgentProvider`, and `useChat` picks
 * them up.
 */
export function AgentChat({ transport: make, title, suggestions, density = "panel", header }: AgentChatProps) {
  const transport = useMemo(make, [make]);
  const chat = useChat({ transport });
  return (
    <ChatView
      density={density}
      messages={chat.messages}
      busy={chat.busy}
      onSend={(text) => chat.send(text)}
      onStop={chat.stop}
      approvals={chat.approvals}
      onApprove={chat.respond}
      header={header !== undefined ? header : <ChatHeader title={title} />}
      composer={{ placeholder: "Ask the agent…" }}
      emptyState={(composer) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button key={s} variant="ghost" className="border border-chat-border" onPress={() => chat.send(s)}>
                <Sparkles className="size-3.5 text-chat-accent" />
                {s}
              </Button>
            ))}
          </div>
          {composer}
        </div>
      )}
    />
  );
}
