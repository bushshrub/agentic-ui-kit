import { readEventStream, type StreamEvent } from "@agentic-ui-kit/core";
import type { SendRequest, Transport } from "./use-chat";

export interface SseTransportOptions {
  /** POST endpoint. Gets the request as JSON and answers with a `text/event-stream` of events. */
  url: string;
  /** Extra headers, e.g. auth. A function is called per request. */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  /** POSTed `{ runId }` when the user stops a reply. Without it the stream is only closed. */
  stopUrl?: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** The request body the backend receives: everything in `SendRequest` except the abort signal. */
export type SseRequestBody = Omit<SendRequest, "signal">;

/** A `Transport` for backends that stream `StreamEvent`s over server-sent events (see `formatEvent`). */
export function sseTransport({ url, headers, stopUrl, fetch: fetchImpl = fetch }: SseTransportOptions): Transport {
  const headersFor = async () => ({
    "content-type": "application/json",
    ...Object.fromEntries(new Headers(typeof headers === "function" ? await headers() : headers)),
  });
  return {
    async *send({ signal, ...body }: SendRequest): AsyncIterable<StreamEvent> {
      const response = await fetchImpl(url, { method: "POST", headers: await headersFor(), body: JSON.stringify(body satisfies SseRequestBody), signal });
      if (!response.ok || !response.body) throw new Error(`${url} answered ${response.status} ${response.statusText}`.trim());
      yield* readEventStream(response.body);
    },
    ...(stopUrl && {
      async stop(runId: string) {
        await fetchImpl(stopUrl, { method: "POST", headers: await headersFor(), body: JSON.stringify({ runId }) });
      },
    }),
  };
}
