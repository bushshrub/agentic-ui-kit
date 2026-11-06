import type { ToolCallPart } from "@agentic-ui-kit/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AskUserAnswers, AskUserPrompt } from "./ask-user";

afterEach(cleanup);

const call = (fields: Partial<ToolCallPart>): ToolCallPart =>
  ({ type: "tool_call", id: "c", name: "ask_user", status: "awaiting", inputJson: "{}", runsOn: "client", ...fields }) as ToolCallPart;

const questions = [
  { question: "Which database?", kind: "single", options: ["Postgres", "SQLite"] },
  { question: "Which features?", kind: "multiple", options: ["Auth", "Search", "Billing"] },
  { question: "Rank the priorities", kind: "rank", options: ["Speed", "Cost", "Quality"] },
  { question: "Anything else?", options: ["No", "Yes"] },
];

function open(qs = questions) {
  const onSubmit = vi.fn();
  const onDecline = vi.fn();
  render(<AskUserPrompt part={call({ input: { questions: qs } })} onSubmit={onSubmit} onDecline={onDecline} />);
  return { onSubmit, onDecline };
}
const key = (key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(document.activeElement!, { key, ...init });

it("answers every kind from the keyboard and submits one result", () => {
  const { onSubmit } = open();
  expect(screen.getByText("1 of 4")).toBeTruthy();
  key("2"); // single: SQLite, moves on
  expect(screen.getByText("Which features?")).toBeTruthy();
  key("1");
  key("3");
  expect(screen.getByText("2 selected")).toBeTruthy();
  key("Enter"); // multiple: next
  expect(screen.getByText("Rank the priorities")).toBeTruthy();
  key("ArrowDown"); // focus Cost
  key("ArrowUp", { altKey: true }); // Cost above Speed
  key("Enter");
  expect(screen.getByText("Anything else?")).toBeTruthy();
  fireEvent.click(screen.getByText("Skip"));
  expect(onSubmit).toHaveBeenCalledWith({
    answers: [
      { question: "Which database?", kind: "single", answer: "SQLite" },
      { question: "Which features?", kind: "multiple", answer: ["Auth", "Billing"] },
      { question: "Rank the priorities", kind: "rank", answer: ["Cost", "Speed", "Quality"] },
      { question: "Anything else?", kind: "single", skipped: true },
    ],
  });
});

it("takes free text under Something else", () => {
  const { onSubmit } = open([questions[0]!]);
  key("3"); // the number after the last option focuses the input
  expect(document.activeElement).toBe(screen.getByLabelText("Something else"));
  fireEvent.change(document.activeElement!, { target: { value: "MySQL" } });
  key("Enter");
  expect(onSubmit).toHaveBeenCalledWith({ answers: [{ question: "Which database?", kind: "single", answer: "MySQL" }] });
});

it("goes back with the pager and keeps earlier answers", () => {
  const { onSubmit } = open(questions.slice(0, 2).map((q) => ({ ...q, kind: "single" })));
  key("1");
  fireEvent.click(screen.getByLabelText("Previous question"));
  key("2"); // changes the first answer; the second question is still open
  expect(screen.getByText("Which features?")).toBeTruthy();
  key("1");
  expect(onSubmit.mock.calls[0]![0].answers.map((a: { answer: string }) => a.answer)).toEqual(["SQLite", "Auth"]);
});

it("declines on Escape and on the close button, without a result", () => {
  const { onSubmit, onDecline } = open();
  key("Escape");
  fireEvent.click(screen.getByLabelText("Close and decline"));
  expect(onDecline).toHaveBeenCalledTimes(2);
  expect(onSubmit).not.toHaveBeenCalled();
});

it("lists each question with its answer in the card", () => {
  render(
    <AskUserAnswers
      part={call({
        status: "done",
        result: {
          answers: [
            { question: "Which database?", kind: "single", answer: "SQLite" },
            { question: "Which features?", kind: "multiple", answer: ["Auth", "Billing"] },
            { question: "Rank the priorities", kind: "rank", answer: ["Cost", "Speed"] },
            { question: "Anything else?", kind: "single", skipped: true },
          ],
        },
      })}
    />,
  );
  for (const text of ["SQLite", "Auth, Billing", "Ranked: 1. Cost 2. Speed", "Skipped"]) expect(screen.getByText(text)).toBeTruthy();
});

it("says so in the card when the user declined", () => {
  render(<AskUserAnswers part={call({ status: "error", error: "Declined by the user" })} />);
  expect(screen.getByText("You declined to answer")).toBeTruthy();
});
