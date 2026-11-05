import type { StreamEvent } from "agentic-ui-kit/core";
import { agentRun, fullThinkingRun, mathRun, researchRun } from "@agentic-ui-kit/core/fixtures";
import type { SendRequest, Transport } from "agentic-ui-kit";

const runs = [agentRun, researchRun, fullThinkingRun, mathRun];

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
  });

/**
 * Answers each message with the next recorded run, re-keyed so every reply is a new message. Events
 * arrive at uneven gaps around `eventsPerSecond`, like tokens over a network.
 */
export function fixtureTransport({ eventsPerSecond = 35 } = {}): Transport {
  let turn = 0;
  return {
    async *send({ message, model, effort, signal }: SendRequest): AsyncIterable<StreamEvent> {
      const events = runs[turn++ % runs.length]!;
      const runId = `run_${Date.now().toString(36)}`;
      const messageId = `msg_${Date.now().toString(36)}`;
      await wait(400, signal);
      for (const event of events) {
        if (signal.aborted) return;
        if (event.type === "run.start") {
          yield {
            ...event,
            runId,
            messageId,
            parentId: message.id,
            createdAt: new Date().toISOString(),
            ...(model && { model }),
            ...(effort && { effort }),
          };
        } else {
          yield { ...event, runId };
        }
        await wait((1000 / eventsPerSecond) * (0.4 + Math.random() * 1.2), signal);
      }
    },
  };
}
