import type { ToolCallPart } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { useIcons, IconSlot } from "../primitives/icons";
import type { PendingApproval } from "../hooks/use-chat";
import { useLabels } from "../primitives/labels";
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
  const icons = useIcons();
  const { part } = approval;
  const labels = useLabels();
  const view = useToolView(part.name);
  const Detail = view.Detail;
  const preview: ToolCallPart = { ...part, status: "awaiting" };
  return (
    <div
      role="alertdialog"
      aria-label={labels.allowTool(part.name)}
      className={clsx("flex flex-col gap-3 rounded-chat-lg border border-chat-border-strong bg-chat-surface p-3 font-chat-sans text-chat-fg shadow-chat-popover", className)}
    >
      <div className="flex items-center gap-2 text-sm">
        <IconSlot className="text-chat-accent [&_svg]:size-4">{icons.approval}</IconSlot>
        <span className="min-w-0 flex-1 font-medium">
          {view.ask?.(part) ?? labels.allowAction(activityLabel(part, labels, view))}
        </span>
      </div>
      <div className="max-h-48 overflow-auto [scrollbar-width:thin]">
        {Detail ? <Detail part={preview} /> : <CodeBlock variant="boxed" label={part.name} code={JSON.stringify(part.input ?? {}, null, 2)} />}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="border border-chat-border-strong" onPress={() => onRespond(part.id, false)}>
          {labels.deny}
        </Button>
        <Button variant="primary" autoFocus onPress={() => onRespond(part.id, true)}>
          {labels.allow}
        </Button>
      </div>
    </div>
  );
}
