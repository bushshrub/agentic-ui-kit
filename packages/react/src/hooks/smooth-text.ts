import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../primitives/appearance";

/** Slowest reveal, in characters per second, so a trickle of tokens still reads as steady typing. */
const MIN_RATE = 45;
/** How many seconds of backlog the reveal aims to hold; bigger bursts speed it up. */
const LAG_SECONDS = 0.35;
/** Once the stream ends, the rest is revealed at least this fast. */
const FINISH_RATE = 600;
/** Text is released in groups this far apart, so each group of words fades in together. */
const CHUNK_MS = 90;

/**
 * Paces streamed text so it appears at an even rate instead of in network-sized bursts. The reveal speed
 * follows the backlog: it never falls far behind and never stalls. It stops at word ends so a word fades
 * in whole. When `streaming` ends the rest catches up quickly. With reduced motion it returns `text`.
 *
 * One animation loop runs while there is text left to show; new text only moves its target, so frequent
 * small deltas do not restart it. Text is released in groups every CHUNK_MS rather than every frame.
 */
export function useSmoothText(text: string, streaming: boolean): string {
  const [shown, setShown] = useState(() => (streaming ? "" : text));
  const state = useRef({ shown, target: text, streaming, frame: 0, last: 0, carry: 0, lastCommit: 0 });
  const prefersReducedMotion = useReducedMotion();
  const s = state.current;
  s.target = text;
  s.streaming = streaming;

  useEffect(() => {
    // Text replaced rather than extended (an edit, a new message), or no motion wanted: show it all.
    if (prefersReducedMotion() || !text.startsWith(s.shown)) {
      cancelAnimationFrame(s.frame);
      s.frame = 0;
      s.shown = text;
      setShown(text);
      return;
    }
    if (s.frame || s.shown.length >= text.length) return;

    s.last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(Math.max(now - s.last, 0), 100) / 1000;
      s.last = now;
      const full = s.target;
      const backlog = full.length - s.shown.length;
      const rate = s.streaming ? Math.max(MIN_RATE, backlog / LAG_SECONDS) : Math.max(FINISH_RATE, backlog * 4);
      s.carry += rate * dt;
      const advance = Math.floor(s.carry);
      if (advance > 0 && now - s.lastCommit >= CHUNK_MS) {
        s.lastCommit = now;
        s.carry -= advance;
        s.shown = full.slice(0, wordEnd(full, Math.min(s.shown.length + advance, full.length)));
        setShown(s.shown);
      }
      s.frame = s.shown.length < full.length ? requestAnimationFrame(step) : 0;
    };
    s.frame = requestAnimationFrame(step);
  }, [text, streaming, s, prefersReducedMotion]);

  // Also clear the id, so a remount (StrictMode runs effects twice) starts the loop again.
  useEffect(
    () => () => {
      cancelAnimationFrame(s.frame);
      s.frame = 0;
    },
    [s],
  );

  return shown;
}

/** Moves `index` forward to the end of the word it falls in, so words are never cut in half. */
function wordEnd(text: string, index: number): number {
  let i = index;
  while (i < text.length && !/\s/.test(text[i]!)) i++;
  return i;
}
