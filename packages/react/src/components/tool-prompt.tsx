import type { PendingPrompt } from "../hooks/use-chat";
import { useToolView } from "./tools";

export interface ToolPromptCardProps {
  prompt: PendingPrompt;
  /** The user's answer: the call's result. `useChat().answer`. */
  onAnswer: (partId: string, result: unknown) => void;
  /** The user closed the prompt. `useChat().decline`. */
  onDecline: (partId: string) => void;
}

/**
 * Shows the `Prompt` of a pending call's tool view, above the composer (`ChatView` does this for you). Apps
 * that lay out the chat themselves render it from `useChat().prompts[0]`. Renders nothing if the tool's view
 * has no `Prompt`.
 */
export function ToolPromptCard({ prompt, onAnswer, onDecline }: ToolPromptCardProps) {
  const { part } = prompt;
  const Prompt = useToolView(part.name).Prompt;
  if (!Prompt) return null;
  return <Prompt key={part.id} part={part} onSubmit={(result) => onAnswer(part.id, result)} onDecline={() => onDecline(part.id)} />;
}
