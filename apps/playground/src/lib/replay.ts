import { applyEvent, type Message, type StreamEvent } from "@llm-chat/core";
import { useEffect, useState } from "react";

/**
 * Replays a recorded event stream into a message, the way it would arrive from a server. `eventsPerSecond`
 * sets the pace; `loop` restarts after a pause so a story keeps showing the live state.
 */
export function useReplay(events: StreamEvent[], { eventsPerSecond = 40, loop = true } = {}): Message | undefined {
  const [message, setMessage] = useState<Message>();
  useEffect(() => {
    let index = 0;
    let current: Message | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (index >= events.length) {
        if (!loop) return;
        timer = setTimeout(() => {
          index = 0;
          current = undefined;
          setMessage(undefined);
          tick();
        }, 2500);
        return;
      }
      current = applyEvent(current, events[index++]!);
      setMessage(current);
      // Uneven gaps, like tokens over a network.
      timer = setTimeout(tick, (1000 / eventsPerSecond) * (0.4 + Math.random() * 1.2));
    };
    tick();
    return () => clearTimeout(timer);
  }, [events, eventsPerSecond, loop]);
  return message;
}
