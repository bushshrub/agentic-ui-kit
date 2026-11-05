import type { StreamEvent, ToolCallPart } from "@llm-chat/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { AgentProvider, AgentRegistry, useAgentContext, useAgentTool, type AgentTool } from "./agent";
import { useChat, type SendRequest, type Transport } from "./use-chat";

/**
 * A backend that, on the first request, calls `tool` (client or server, maybe asking first) and, on the
 * continuation, reports what it got back.
 */
function agentBackend(tool: Partial<ToolCallPart>): Transport & { requests: SendRequest[] } {
  const requests: SendRequest[] = [];
  return {
    requests,
    async *send(request) {
      requests.push(request);
      const runId = `r${requests.length}`;
      let seq = 0;
      const ev = (e: Record<string, unknown>) => ({ runId, seq: seq++, ...e }) as StreamEvent;
      yield ev({ type: "run.start", messageId: "a1", parentId: "u", createdAt: "2026-11-05T00:00:00Z" });
      if (!request.continuation) {
        yield ev({ type: "part.start", part: { type: "tool_call", id: "t1", name: "fill", status: "input", inputJson: '{"x":1}', ...tool } });
        if (tool.runsOn === "client" || tool.needsApproval) yield ev({ type: "part.update", partId: "t1", status: "awaiting" });
        else yield ev({ type: "part.end", partId: "t1", result: { saved: true } });
      } else {
        const call = request.message.parts.find((p) => p.id === "t1") as ToolCallPart;
        // A server tool the user allowed runs now.
        if (call.runsOn !== "client" && call.approval === "granted") yield ev({ type: "part.end", partId: "t1", result: { saved: true } });
        const said = call.approval === "denied" || call.status === "error" ? `error: ${call.error}` : `got ${JSON.stringify(call.result ?? { saved: true })}`;
        yield ev({ type: "part.start", part: { type: "text", id: "x", text: said, status: "done" } });
      }
      yield ev({ type: "run.end", status: "done" });
    },
  };
}

const wrapper = (registry: AgentRegistry) => ({ children }: { children: ReactNode }) => <AgentProvider registry={registry}>{children}</AgentProvider>;
const lastText = (parts: { type: string; text?: string }[]) => parts.filter((p) => p.type === "text").at(-1)?.text;

it("runs a client tool in the page, sends the result back and continues the same message", async () => {
  const registry = new AgentRegistry();
  const execute = vi.fn((input: { x: number }) => ({ doubled: input.x * 2 }));
  const transport = agentBackend({ runsOn: "client" });
  const { result } = renderHook(
    () => {
      useAgentTool({ name: "fill", description: "Fill the form", inputSchema: { type: "object" }, execute });
      useAgentContext("form", { customer: "" });
      return useChat({ transport });
    },
    { wrapper: wrapper(registry) },
  );
  act(() => result.current.send("go"));
  await waitFor(() => expect(transport.requests).toHaveLength(2));
  await waitFor(() => expect(result.current.busy).toBe(false));

  expect(execute).toHaveBeenCalledWith({ x: 1 }, expect.objectContaining({ callId: "t1", messageId: "a1" }));
  expect(transport.requests[0]).toMatchObject({ tools: [{ name: "fill", description: "Fill the form" }], context: { form: { customer: "" } } });
  expect(transport.requests[1]!.continuation).toBe(true);
  const messages = result.current.messages;
  expect(messages).toHaveLength(2);
  expect(messages[1]!.parts.map((p) => [p.id, p.status])).toEqual([["t1", "done"], ["x", "done"]]);
  expect(lastText(messages[1]!.parts)).toBe('got {"doubled":2}');
});

it("tells the page when a server tool finishes, so it can show the change", async () => {
  const registry = new AgentRegistry();
  const onResult = vi.fn();
  const { result } = renderHook(
    () => {
      useAgentTool({ name: "fill", onResult });
      return useChat({ transport: agentBackend({}) });
    },
    { wrapper: wrapper(registry) },
  );
  act(() => result.current.send("go"));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(onResult).toHaveBeenCalledTimes(1);
  expect(onResult.mock.calls[0]![0]).toMatchObject({ id: "t1", status: "done", result: { saved: true } });
});

it("waits for approval, then the backend runs the server tool", async () => {
  const registry = new AgentRegistry();
  const transport = agentBackend({ needsApproval: true });
  const { result } = renderHook(() => useChat({ transport, agent: registry }));
  act(() => result.current.send("go"));
  await waitFor(() => expect(result.current.approvals).toHaveLength(1));
  expect(result.current.busy).toBe(false);
  expect(transport.requests).toHaveLength(1);

  act(() => result.current.respond("t1", true));
  await waitFor(() => expect(transport.requests).toHaveLength(2));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect((transport.requests[1]!.message.parts[0] as ToolCallPart).approval).toBe("granted");
  expect(result.current.messages[1]!.parts[0]).toMatchObject({ status: "done", result: { saved: true } });
});

it("a denied client tool does not run and the model hears it was declined", async () => {
  const registry = new AgentRegistry();
  const execute = vi.fn();
  const tool: AgentTool = { name: "fill", execute, approval: true };
  const transport = agentBackend({ runsOn: "client" });
  const { result } = renderHook(
    () => {
      useAgentTool(tool);
      return useChat({ transport });
    },
    { wrapper: wrapper(registry) },
  );
  act(() => result.current.send("go"));
  await waitFor(() => expect(result.current.approvals).toHaveLength(1));
  act(() => result.current.respond("t1", false));
  await waitFor(() => expect(transport.requests).toHaveLength(2));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(execute).not.toHaveBeenCalled();
  expect(lastText(result.current.messages[1]!.parts)).toBe("error: Declined by the user");
});

it("a client tool the page no longer offers fails instead of hanging", async () => {
  const transport = agentBackend({ runsOn: "client" });
  const { result } = renderHook(() => useChat({ transport, agent: new AgentRegistry() }));
  act(() => result.current.send("go"));
  await waitFor(() => expect(transport.requests).toHaveLength(2));
  await waitFor(() => expect(result.current.busy).toBe(false));
  expect(lastText(result.current.messages[1]!.parts)).toBe("error: This page has no handler for fill");
});
