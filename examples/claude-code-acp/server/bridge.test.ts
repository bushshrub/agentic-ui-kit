import { agent, type AnyMessage, type Stream } from "@agentclientprotocol/sdk";
import type { Message, StreamEvent } from "agentic-ui-kit/core";
import { describe, expect, it } from "vitest";
import { Bridge } from "./bridge";

/** Two connected in-memory streams: what one side writes, the other reads. */
function pair(): [Stream, Stream] {
  const a = new TransformStream<AnyMessage, AnyMessage>();
  const b = new TransformStream<AnyMessage, AnyMessage>();
  return [{ writable: a.writable, readable: b.readable }, { writable: b.writable, readable: a.readable }];
}

/** A fake agent: says hi, runs a Bash call that needs permission, then reports what the user chose. */
function fakeAgent(stream: Stream) {
  agent()
    .onRequest("initialize", ({ params }) => ({ protocolVersion: params.protocolVersion, agentCapabilities: {} }))
    .onRequest("session/new", () => ({ sessionId: "s1" }))
    .onRequest("session/set_config_option", () => ({ configOptions: [] }))
    .onRequest("session/prompt", async ({ params, client }) => {
      const update = (u: object) => client.notify("session/update", { sessionId: params.sessionId, update: u as never });
      await update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "On it." } });
      const toolCall = { toolCallId: "t1", title: "Terminal", kind: "execute", status: "pending", rawInput: { command: "touch x" } };
      await update({ sessionUpdate: "tool_call", ...toolCall, name: "Bash" });
      const answer = await client.request("session/request_permission", {
        sessionId: params.sessionId,
        toolCall,
        options: [
          { optionId: "yes", name: "Allow", kind: "allow_once" },
          { optionId: "no", name: "Reject", kind: "reject_once" },
        ],
      } as never);
      const allowed = answer.outcome.outcome === "selected" && answer.outcome.optionId === "yes";
      if (allowed) await update({ sessionUpdate: "tool_call_update", toolCallId: "t1", status: "completed", rawOutput: "" });
      else await update({ sessionUpdate: "tool_call_update", toolCallId: "t1", status: "failed", content: [{ type: "content", content: { type: "text", text: "Rejected" } }] });
      await update({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: allowed ? "Done." : "Skipped." } });
      return { stopReason: "end_turn" };
    })
    .connect(stream);
}

const user: Message = { id: "u1", role: "user", parts: [{ type: "text", id: "p1", text: "make x" }], createdAt: "" } as Message;

async function collect(run: AsyncGenerator<StreamEvent>) {
  const events: StreamEvent[] = [];
  for await (const e of run) events.push(e);
  return events;
}

describe("Bridge", () => {
  for (const approval of ["granted", "denied"] as const) {
    it(`asks before the call runs, then continues the same message (${approval})`, async () => {
      const [ours, theirs] = pair();
      fakeAgent(theirs);
      const bridge = new Bridge({ cwd: "/tmp", connect: () => ours });

      const first = await collect(bridge.run({ conversationId: "c", message: user }));
      expect(first.at(-2)).toMatchObject({ type: "part.update", partId: "t1", status: "awaiting", needsApproval: true });
      expect(first.at(-1)).toMatchObject({ type: "run.end", status: "done" });
      const start = first.find((e) => e.type === "part.start" && e.part.type === "tool_call");
      expect(start).toMatchObject({ part: { name: "bash", inputJson: '{"command":"touch x"}' } });
      const messageId = (first[0] as Extract<StreamEvent, { type: "run.start" }>).messageId;

      const answer = { ...user, id: messageId, role: "assistant", parts: [{ type: "tool_call", id: "t1", name: "bash", status: "awaiting", approval }] } as unknown as Message;
      const second = await collect(bridge.run({ conversationId: "c", message: answer, continuation: true }));
      expect(second[0]).toMatchObject({ type: "run.start", messageId });
      const end = second.find((e) => e.type === "part.end" && e.partId === "t1");
      expect(end).toMatchObject(approval === "granted" ? { result: "" } : { status: "error", error: "Rejected" });
      const text = second.flatMap((e) => (e.type === "part.delta" && e.text ? [e.text] : [])).join("");
      expect(text).toBe(approval === "granted" ? "Done." : "Skipped.");
      expect(second.at(-1)).toMatchObject({ type: "run.end", status: "done" });
    });
  }
});
