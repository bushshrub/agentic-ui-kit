/**
 * The ask_user preset: a tool the model calls to ask the user one or more questions (pick one, pick several,
 * rank) before it goes on, like claude.ai's question prompt. The kit's `ask_user` tool view draws the
 * prompt over the composer while the call is "awaiting" and the answers card once it is done. The tool runs
 * in the browser (`runsOn: "client"`): the backend ends the run with the call awaiting, the page asks, and the
 * continuation request carries the result.
 */

export type AskUserKind = "single" | "multiple" | "rank";

export interface AskUserQuestion {
  question: string;
  /** "single": one option (or free text). "multiple": any number. "rank": all options, best first. */
  kind: AskUserKind;
  options: string[];
}

/** Input of the ask_user tool, as the model writes it. */
export interface AskUserInput {
  questions: AskUserQuestion[];
}

/**
 * The user's answer to one question. `answer` is the chosen option's text (a string for "single"), or the
 * chosen options (an array for "multiple") or all options in the user's order, best first (an array for "rank").
 * Free text typed under "Something else" is used as the option text. Left out when `skipped` is true.
 */
export interface AskUserAnswer {
  question: string;
  kind: AskUserKind;
  answer?: string | string[];
  /** The user skipped this question. */
  skipped?: true;
}

/**
 * The tool's result, what the model gets back when the user submits. When the user closes the prompt or
 * replies in the composer instead, the call ends as an error "Declined by the user" and there is no result.
 */
export interface AskUserResult {
  answers: AskUserAnswer[];
}

/** The tool definition to give the model. Same shape as a page tool's `ToolSpec`. */
export const askUserTool = {
  name: "ask_user",
  description:
    "Ask the user one to four short multiple-choice questions when you need their preference or a decision " +
    "before going on, instead of guessing. Each question is single (pick one), multiple (pick any) or rank " +
    "(put the options in order). The user can also type their own answer, skip a question or decline. " +
    "The result lists every question with the user's answer, or skipped.",
  inputSchema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            question: { type: "string", description: "The question, one sentence." },
            kind: { type: "string", enum: ["single", "multiple", "rank"], description: "Defaults to single." },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 8,
              description: "Short option texts. Do not add a catch-all: the user can always type their own answer.",
            },
          },
          required: ["question", "options"],
        },
      },
    },
    required: ["questions"],
  },
} as const;

const kinds: readonly string[] = ["single", "multiple", "rank"];

/** The questions in a tool call's input, dropping malformed ones; `kind` defaults to "single". Empty while the input is incomplete. */
export function readAskUserInput(input: unknown): AskUserQuestion[] {
  const list = (input as { questions?: unknown } | null | undefined)?.questions;
  if (!Array.isArray(list)) return [];
  const out: AskUserQuestion[] = [];
  for (const q of list) {
    if (!q || typeof q !== "object") continue;
    const { question, kind = "single", options } = q as Record<string, unknown>;
    if (typeof question !== "string" || !question.trim() || !kinds.includes(kind as string)) continue;
    if (!Array.isArray(options)) continue;
    const texts = options.filter((o): o is string => typeof o === "string" && o.trim() !== "");
    if (texts.length === 0) continue;
    out.push({ question, kind: kind as AskUserKind, options: texts });
  }
  return out;
}

/** The answers in a tool call's result, or undefined when it is not an ask_user result. */
export function readAskUserResult(result: unknown): AskUserAnswer[] | undefined {
  const list = (result as { answers?: unknown } | null | undefined)?.answers;
  if (!Array.isArray(list)) return undefined;
  return list.filter(
    (a): a is AskUserAnswer => !!a && typeof a === "object" && typeof a.question === "string" && kinds.includes(a.kind),
  );
}
