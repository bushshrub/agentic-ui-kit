import type { ToolCallPart } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { ShieldQuestion } from "lucide-react";
import type { PendingApproval } from "../hooks/use-chat";
import { Button } from "../primitives/button";
import { CodeBlock } from "../primitives/code-block";
import { activityLabel, useToolView } from "./tools";

export interface ApprovalCardProps {
  approval: PendingApproval;
  onRespond: (partId: string, granted: boolean) => void;
  className?: string;
}

/**
 * Asks the user before a tool runs, above the composer. Shows the tool's label and what it will do: its
 * view's `Detail` when it has one, else the input. Replying in the composer instead declines it.
 */
export function ApprovalCard({ approval, onRespond, className }: ApprovalCardProps) {
  const { part } = approval;
  const view = useToolView(part.name);
  const Detail = view.Detail;
  const preview: ToolCallPart = { ...part, status: "awaiting" };
  return (
    <div
      role="alertdialog"
      aria-label={`Allow ${part.name}?`}
      className={clsx("flex flex-col gap-3 rounded-chat-lg border border-chat-border-strong bg-chat-surface p-3 font-chat-sans text-chat-fg shadow-chat-popover", className)}
    >
      <div className="flex items-center gap-2 text-sm">
        <ShieldQuestion aria-hidden className="size-4 shrink-0 text-chat-accent" />
        <span className="min-w-0 flex-1 font-medium">
          {view.ask?.(part) ?? <>Allow {activityLabel(part, view)}?</>}
        </span>
      </div>
      <div className="max-h-48 overflow-auto [scrollbar-width:thin]">
        {Detail ? <Detail part={preview} /> : <CodeBlock variant="boxed" label={part.name} code={JSON.stringify(part.input ?? {}, null, 2)} />}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="border border-chat-border-strong" onPress={() => onRespond(part.id, false)}>
          Deny
        </Button>
        <Button variant="primary" autoFocus onPress={() => onRespond(part.id, true)}>
          Allow
        </Button>
      </div>
    </div>
  );
}
