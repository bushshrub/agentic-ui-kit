import { expect, it } from "vitest";
import type { StreamEvent } from "./events";
import { mathRun } from "./fixtures";
import { formatEvent, readEventStream } from "./sse";

function streamOf(text: string, chunkSize: number): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
      controller.close();
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const event of readEventStream(stream)) out.push(event);
  return out;
}

it("round-trips events split at any byte boundary", async () => {
  const text = mathRun.map(formatEvent).join("");
  for (const size of [1, 7, 64, text.length]) {
    expect(await collect(streamOf(text, size))).toEqual(mathRun);
  }
});

it("skips comments and keep-alives, and reads multi-line data and CRLF", async () => {
  const event = mathRun[0]!;
  const json = JSON.stringify(event, null, 1).split("\n");
  const text = `: ping\r\n\r\nid: 0\r\n${json.map((l) => `data: ${l}`).join("\r\n")}\r\n\r\n: ping\n\n`;
  expect(await collect(streamOf(text, 5))).toEqual([event]);
});
