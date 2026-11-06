import type { StreamEvent } from "./events";

/**
 * Reads a server-sent event stream of `StreamEvent`s (or another JSON event type, e.g. `AgUiEvent`). Each SSE message carries one JSON event in `data`;
 * comments and messages without data (keep-alives) are skipped.
 */
export async function* readEventStream<T = StreamEvent>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = messageEnd(buffer)) !== -1) {
        const event = parseMessage<T>(buffer.slice(0, end));
        buffer = buffer.slice(end).replace(BLANK_LINE_START, "");
        if (event) yield event;
      }
    }
    const event = parseMessage<T>(buffer + decoder.decode());
    if (event) yield event;
  } finally {
    reader.releaseLock();
  }
}

/** Formats one event as an SSE message, for servers written in TS. */
export function formatEvent(event: StreamEvent): string {
  return `id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`;
}

// A message ends at a blank line. CRLF is matched first so a lone "\r\n" is not read as two line ends.
const BLANK_LINE = /\r\n\r\n|\n\n|\r\r/;
const BLANK_LINE_START = /^(\r\n\r\n|\n\n|\r\r)/;

function messageEnd(buffer: string): number {
  const match = BLANK_LINE.exec(buffer);
  return match ? match.index : -1;
}

function parseMessage<T>(text: string): T | undefined {
  const data: string[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (line.startsWith("data:")) data.push(line.slice(line.startsWith("data: ") ? 6 : 5));
  }
  if (data.length === 0) return undefined;
  return JSON.parse(data.join("\n")) as T;
}
