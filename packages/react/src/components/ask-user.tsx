import {
  readAskUserInput,
  readAskUserResult,
  type AskUserAnswer,
  type AskUserQuestion,
  type AskUserResult,
  type ToolCallPart,
} from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { useEffect, useLayoutEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { Button, IconButton } from "../primitives/button";
import { IconSlot, useIcons } from "../primitives/icons";
import { useLabels } from "../primitives/labels";
import type { ToolPromptProps, ToolView } from "./tools";

const rowClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-chat-md px-2.5 py-2 text-left text-(length:--chat-ui-font-size) leading-5 text-chat-fg outline-none hover:bg-chat-hover focus-visible:ring-2 focus-visible:ring-chat-focus";

/** Moves focus to the previous or next answer row of a question, without wrapping. */
function moveFocus(root: HTMLElement, from: EventTarget | null, delta: 1 | -1) {
  const rows = [...root.querySelectorAll<HTMLElement>("[data-ask-row]")];
  const i = rows.findIndex((row) => row === from || row.contains(from as Node));
  rows[Math.min(rows.length - 1, Math.max(0, i + delta))]?.focus();
}

const isTextField = (target: EventTarget) => target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

/** The 1-based number a plain digit key stands for, or undefined. */
function digitOf(e: KeyboardEvent): number | undefined {
  if (e.altKey || e.ctrlKey || e.metaKey || isTextField(e.target)) return undefined;
  return /^[1-9]$/.test(e.key) ? Number(e.key) : undefined;
}

function Num({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "flex size-6 shrink-0 items-center justify-center rounded-chat-sm border text-(length:--chat-ui-font-size-sm) tabular-nums",
        active ? "border-chat-accent bg-chat-accent text-chat-accent-fg" : "border-chat-border-strong text-chat-muted",
      )}
    >
      {children}
    </span>
  );
}

function Check({ checked }: { checked: boolean }) {
  const icons = useIcons();
  return (
    <span
      aria-hidden
      className={clsx(
        "flex size-5 shrink-0 items-center justify-center rounded-chat-sm border [&_svg]:size-3.5",
        checked ? "border-chat-accent bg-chat-accent text-chat-accent-fg" : "border-chat-border-strong",
      )}
    >
      {checked && icons.check}
    </span>
  );
}

/** The "Something else" row: a text input the number key after the last option focuses. */
function OtherRow({
  number,
  value,
  onChange,
  onEnter,
  leading,
}: {
  number: number;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  leading: ReactNode;
}) {
  const labels = useLabels();
  return (
    <div className={clsx(rowClass, "cursor-text")}>
      {leading}
      <input
        data-ask-row
        data-ask-other
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={labels.askUserSomethingElse}
        aria-label={labels.askUserSomethingElse}
        aria-keyshortcuts={String(number)}
        className="min-w-0 flex-1 bg-transparent text-chat-fg outline-none placeholder:text-chat-subtle"
      />
    </div>
  );
}

interface QuestionProps {
  question: AskUserQuestion;
  /** What the user answered before, when they come back to the question. */
  initial: AskUserAnswer | undefined;
  last: boolean;
  onAnswer: (answer: string | string[]) => void;
  onSkip: () => void;
}

function Footer({ start, onSkip, next }: { start?: ReactNode; onSkip: () => void; next?: { label: string; disabled: boolean; onPress: () => void } }) {
  const labels = useLabels();
  const icons = useIcons();
  return (
    <div className="mt-2 flex items-center gap-2 px-1">
      <span className="min-w-0 flex-1 truncate text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle">{start}</span>
      <Button size="sm" variant="ghost" className="text-chat-muted" onPress={onSkip}>
        {labels.askUserSkip}
      </Button>
      {next && (
        <IconButton label={next.label} variant="primary" size="sm" isDisabled={next.disabled} onPress={next.onPress}>
          {icons.askNext}
        </IconButton>
      )}
    </div>
  );
}

function SingleQuestion({ question, initial, onAnswer, onSkip }: QuestionProps) {
  const { options } = question;
  const chosen = typeof initial?.answer === "string" ? initial.answer : undefined;
  const [other, setOther] = useState(chosen !== undefined && !options.includes(chosen) ? chosen : "");
  const root = useRef<HTMLDivElement>(null);
  const submitOther = () => other.trim() && onAnswer(other.trim());
  return (
    <div
      ref={root}
      role="group"
      aria-label={question.question}
      onKeyDown={(e) => {
        const n = digitOf(e);
        if (n !== undefined && n <= options.length) onAnswer(options[n - 1]!);
        else if (n === options.length + 1) root.current?.querySelector<HTMLElement>("[data-ask-other]")?.focus();
        else return;
        e.preventDefault();
      }}
    >
      {options.map((option, i) => (
        <button key={i} type="button" data-ask-row onClick={() => onAnswer(option)} className={rowClass}>
          <Num active={option === chosen}>{i + 1}</Num>
          <span className="min-w-0 flex-1">{option}</span>
        </button>
      ))}
      <OtherRow number={options.length + 1} value={other} onChange={setOther} onEnter={submitOther} leading={<Num active={other !== "" && other === chosen}>{options.length + 1}</Num>} />
      <Footer onSkip={onSkip} />
    </div>
  );
}

function MultipleQuestion({ question, initial, last, onAnswer, onSkip }: QuestionProps) {
  const labels = useLabels();
  const { options } = question;
  const before = Array.isArray(initial?.answer) ? initial.answer : [];
  const [picked, setPicked] = useState(() => new Set(options.flatMap((o, i) => (before.includes(o) ? [i] : []))));
  const [other, setOther] = useState(before.find((a) => !options.includes(a)) ?? "");
  const root = useRef<HTMLDivElement>(null);
  const answer = [...options.filter((_, i) => picked.has(i)), ...(other.trim() ? [other.trim()] : [])];
  const toggle = (i: number) => setPicked((set) => (set.delete(i) || set.add(i), new Set(set)));
  const next = () => answer.length > 0 && onAnswer(answer);
  return (
    <div
      ref={root}
      role="group"
      aria-label={question.question}
      onKeyDown={(e) => {
        const n = digitOf(e);
        if (n !== undefined && n <= options.length) toggle(n - 1);
        else if (n === options.length + 1) root.current?.querySelector<HTMLElement>("[data-ask-other]")?.focus();
        else return;
        e.preventDefault();
      }}
    >
      {options.map((option, i) => (
        <button
          key={i}
          type="button"
          role="checkbox"
          aria-checked={picked.has(i)}
          data-ask-row
          onClick={() => toggle(i)}
          onKeyDown={(e) => {
            // Space toggles (a button's own behaviour); Enter sends once something is picked.
            if (e.key !== "Enter" || answer.length === 0) return;
            e.preventDefault();
            e.stopPropagation();
            next();
          }}
          className={rowClass}
        >
          <Check checked={picked.has(i)} />
          <span className="min-w-0 flex-1">{option}</span>
        </button>
      ))}
      <OtherRow number={options.length + 1} value={other} onChange={setOther} onEnter={next} leading={<Check checked={other.trim() !== ""} />} />
      <Footer
        start={labels.askUserSelected(answer.length)}
        onSkip={onSkip}
        next={{ label: last ? labels.askUserSubmit : labels.askUserContinue, disabled: answer.length === 0, onPress: next }}
      />
    </div>
  );
}

function RankQuestion({ question, initial, last, onAnswer, onSkip }: QuestionProps) {
  const labels = useLabels();
  const icons = useIcons();
  const { options } = question;
  // Positions hold option indexes; an earlier answer restores the order the user left.
  const [order, setOrder] = useState(() => {
    const before = Array.isArray(initial?.answer) ? initial.answer : [];
    const pool = options.map((o, i) => [o, i] as const);
    const restored = before.flatMap((text) => {
      const at = pool.findIndex(([o]) => o === text);
      return at === -1 ? [] : pool.splice(at, 1).map(([, i]) => i);
    });
    return restored.length === options.length ? restored : options.map((_, i) => i);
  });
  const rows = useRef(new Map<number, HTMLElement>());
  const focusAfter = useRef<number | null>(null);
  const dragging = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (focusAfter.current !== null) rows.current.get(focusAfter.current)?.focus();
    focusAfter.current = null;
  }, [order]);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((list) => {
      const next = [...list];
      next.splice(to, 0, next.splice(from, 1)[0]!);
      return next;
    });
  };
  const send = () => onAnswer(order.map((i) => options[i]!));
  const onDragOver = (position: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragging.current === null || dragging.current === position) return;
    move(dragging.current, position);
    dragging.current = position;
  };
  return (
    <div role="group" aria-label={question.question}>
      <ol>
        {order.map((option, position) => (
          <li
            key={option}
            ref={(el) => void (el ? rows.current.set(option, el) : rows.current.delete(option))}
            data-ask-row
            tabIndex={0}
            draggable
            aria-label={`${position + 1}. ${options[option]}`}
            aria-description={labels.askUserReorderKeys}
            aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
            onDragStart={() => (dragging.current = position)}
            onDragOver={onDragOver(position)}
            onDragEnd={() => (dragging.current = null)}
            onDrop={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
              else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                const delta = e.key === "ArrowUp" ? -1 : 1;
                if (e.altKey) {
                  focusAfter.current = option;
                  move(position, position + delta);
                } else moveFocus(e.currentTarget.parentElement!, e.currentTarget, delta);
              } else return;
              e.preventDefault();
            }}
            className={clsx(rowClass, "cursor-grab")}
          >
            <span aria-hidden className="text-chat-subtle">
              <IconSlot className="[&_svg]:size-4">{icons.dragHandle}</IconSlot>
            </span>
            <Num>{position + 1}</Num>
            <span className="min-w-0 flex-1">{options[option]}</span>
          </li>
        ))}
      </ol>
      <Footer
        start={labels.askUserRankHint}
        onSkip={onSkip}
        next={{ label: last ? labels.askUserSubmit : labels.askUserContinue, disabled: false, onPress: send }}
      />
    </div>
  );
}

const questionViews = { single: SingleQuestion, multiple: MultipleQuestion, rank: RankQuestion };

/**
 * The `ask_user` prompt: the model's questions one at a time with a pager, answered by clicking or the keyboard
 * (number keys, arrows, Enter; Alt+arrows reorder a rank). Submits `{ answers }` (an `AskUserResult`) after the
 * last question; Skip leaves a question out, the close button or Escape declines everything.
 */
export function AskUserPrompt({ part, onSubmit, onDecline }: ToolPromptProps) {
  const labels = useLabels();
  const icons = useIcons();
  const questions = readAskUserInput(part.input);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(AskUserAnswer | undefined)[]>([]);
  const root = useRef<HTMLDivElement>(null);
  // Focus the first answer of each question as it appears, so the keyboard works at once.
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-ask-row]:not([data-ask-other])")?.focus();
  }, [index]);
  const question = questions[index];
  if (!question) return null;
  const Question = questionViews[question.kind];

  const settle = (answer: Pick<AskUserAnswer, "answer" | "skipped">) => {
    const next = answers.slice();
    next[index] = { question: question.question, kind: question.kind, ...answer };
    setAnswers(next);
    // On to the next question nobody answered yet, else send.
    for (let step = 1; step <= questions.length; step++) {
      const at = (index + step) % questions.length;
      if (next[at] === undefined) return setIndex(at);
    }
    const result: AskUserResult = { answers: questions.map((_, i) => next[i]!) };
    onSubmit(result);
  };

  return (
    <div
      ref={root}
      role="dialog"
      aria-label={labels.askUserPrompt}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        onDecline();
      }}
      className="flex flex-col gap-1 rounded-chat-lg border border-chat-border-strong bg-chat-surface p-3 font-chat-sans text-chat-fg shadow-chat-popover"
    >
      <div className="flex items-start gap-2 px-1 pb-1">
        <p className="min-w-0 flex-1 text-(length:--chat-ui-font-size) leading-5 font-medium">{question.question}</p>
        {questions.length > 1 && (
          <div className="flex shrink-0 items-center gap-0.5 text-(length:--chat-ui-font-size-sm) text-chat-muted">
            <IconButton label={labels.askUserPrevious} size="sm" isDisabled={index === 0} onPress={() => setIndex(index - 1)}>
              {icons.askPrevious}
            </IconButton>
            <span className="tabular-nums">{labels.askUserPager(index + 1, questions.length)}</span>
            <IconButton label={labels.askUserNext} size="sm" isDisabled={index === questions.length - 1} onPress={() => setIndex(index + 1)}>
              {icons.askPagerNext}
            </IconButton>
          </div>
        )}
        <IconButton label={labels.askUserClose} size="sm" onPress={onDecline}>
          {icons.remove}
        </IconButton>
      </div>
      <Question
        key={index}
        question={question}
        initial={answers[index]}
        last={answers.filter((a, i) => a !== undefined && i !== index).length === questions.length - 1}
        onAnswer={(answer) => settle({ answer })}
        onSkip={() => settle({ skipped: true })}
      />
    </div>
  );
}

/** The user's answers as a card in the message: each question with its answer, "Ranked: 1. …", or "Skipped". */
export function AskUserAnswers({ part }: { part: ToolCallPart }) {
  const labels = useLabels();
  if (part.status === "error") {
    return <p className="font-chat-sans text-(length:--chat-ui-font-size) leading-5 text-chat-muted">{labels.askUserDeclined}</p>;
  }
  const answers = part.status === "done" ? readAskUserResult(part.result) : undefined;
  if (!answers) return null;
  const text = (a: AskUserAnswer) => {
    if (a.skipped || a.answer === undefined) return labels.askUserSkipped;
    if (typeof a.answer === "string") return a.answer;
    return a.kind === "rank" ? labels.askUserRanked(a.answer) : labels.askUserPicked(a.answer);
  };
  return (
    <ul
      aria-label={labels.askUserAnswers}
      className="flex flex-col gap-3 rounded-chat-lg border border-chat-border bg-chat-surface px-4 py-3 font-chat-sans text-(length:--chat-ui-font-size) leading-5"
    >
      {answers.map((a, i) => (
        <li key={i}>
          <p className="text-chat-muted">{a.question}</p>
          <p className={clsx("text-chat-fg", (a.skipped || a.answer === undefined) && "text-chat-subtle")}>{text(a)}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The view of the `ask_user` tool (`askUserTool` in `agentic-ui-kit/core`): the prompt over the composer while
 * the call awaits the user, then the answers card in the message. Registered in `defaultToolViews`.
 */
export const askUserToolView: ToolView = {
  label: (_, labels) => labels.askUserPrompt,
  Prompt: AskUserPrompt,
  Block: AskUserAnswers,
};
