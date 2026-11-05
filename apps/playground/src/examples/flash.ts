import { useCallback, useRef, useState } from "react";

/** Marks keys as just changed by the agent for `ms`, so the page can highlight them. */
export function useFlash(ms = 1600): [Set<string>, (keys: string[]) => void] {
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const flash = useCallback(
    (keys: string[]) => {
      setFlashing((s) => new Set([...s, ...keys]));
      for (const key of keys) {
        clearTimeout(timers.current.get(key));
        timers.current.set(
          key,
          setTimeout(() => setFlashing((s) => new Set([...s].filter((k) => k !== key))), ms),
        );
      }
    },
    [ms],
  );
  return [flashing, flash];
}
