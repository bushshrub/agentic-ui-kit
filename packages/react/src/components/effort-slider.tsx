import type { EffortLevel } from "@agentic-ui-kit/core";
import { clsx } from "clsx";
import { useId, type ReactNode } from "react";
import { Dialog, DialogTrigger } from "react-aria-components";
import { Badge } from "../primitives/badge";
import { Button } from "../primitives/button";
import { Popover } from "../primitives/menu";
import { useLabels } from "../primitives/labels";

export interface EffortSliderProps {
  /** The levels, lowest first. */
  efforts: readonly EffortLevel[];
  value: string;
  onChange: (id: string) => void;
  /** Title over the track. Default: the "Effort" label. */
  label?: ReactNode;
  className?: string;
}

/**
 * Effort as a slider with one stop per level, lowest (faster) on the left: title and the current level on
 * top, the level's description under them, "Faster" and "Smarter" under the track. Arrow keys move a stop.
 */
export function EffortSlider({ efforts, value, onChange, label, className }: EffortSliderProps) {
  const labels = useLabels();
  const id = useId();
  const index = Math.max(0, efforts.findIndex((e) => e.id === value));
  const current = efforts[index];
  const last = Math.max(1, efforts.length - 1);
  const at = (i: number) => `${(i / last) * 100}%`;
  if (!current) return null;
  return (
    <div className={clsx("flex w-full flex-col gap-1 font-chat-sans", className)}>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="flex-1 text-(length:--chat-ui-font-size) font-medium text-chat-fg">
          {label ?? labels.effort}
        </label>
        {current.recommended && <Badge>{labels.recommended}</Badge>}
        {current.warning && <Badge tone="warning">{current.warning}</Badge>}
        <output htmlFor={id} className="text-(length:--chat-ui-font-size) text-chat-fg">
          {current.label}
        </output>
      </div>
      {current.description && <p className="text-(length:--chat-ui-font-size-sm) leading-4 text-chat-muted">{current.description}</p>}
      <div className="relative mx-2 mt-2 h-6">
        <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-chat-border-strong" />
        <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-chat-accent" style={{ width: at(index) }} />
        {efforts.map((e, i) => (
          <span
            key={e.id}
            aria-hidden
            className={clsx("absolute top-1/2 size-1.5 -translate-1/2 rounded-full", i <= index ? "bg-chat-accent-fg/70" : "bg-chat-subtle")}
            style={{ left: at(i) }}
          />
        ))}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-4 -translate-1/2 rounded-full border-2 border-chat-accent bg-chat-fg shadow-sm peer-focus-visible:ring-2"
          style={{ left: at(index) }}
        />
        {/* A native range input on top: drag, click and arrow keys, and the level's name for screen readers. */}
        <input
          id={id}
          type="range"
          min={0}
          max={efforts.length - 1}
          step={1}
          value={index}
          aria-valuetext={current.label}
          onChange={(e) => {
            const next = efforts[Number(e.target.value)];
            if (next && next.id !== value) onChange(next.id);
          }}
          onKeyDown={(e) => {
            // jsdom and some browsers skip the change for keys; move a stop ourselves.
            const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
            const next = step ? efforts[index + step] : undefined;
            if (next) {
              e.preventDefault();
              onChange(next.id);
            }
          }}
          className="absolute -inset-x-2 inset-y-0 w-[calc(100%+1rem)] cursor-pointer rounded-full opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-chat-focus [&::-webkit-slider-thumb]:opacity-0"
        />
      </div>
      <div className="flex justify-between text-(length:--chat-ui-font-size-sm) leading-4 text-chat-subtle">
        <span>{labels.effortFaster}</span>
        <span>{labels.effortSmarter}</span>
      </div>
    </div>
  );
}

export interface EffortButtonProps extends EffortSliderProps {
  /** Before the level's name on the button, e.g. a brain icon. */
  icon?: ReactNode;
  /** What the button reads. Default: the current level's label. */
  children?: ReactNode;
}

/** A composer pill ("◎ Medium") that opens the effort slider above it, like chatgpt.com's Think button. */
export function EffortButton({ icon, children, className, ...slider }: EffortButtonProps) {
  const current = slider.efforts.find((e) => e.id === slider.value) ?? slider.efforts[0];
  const labels = useLabels();
  return (
    <DialogTrigger>
      <Button variant="ghost" size="sm" className={clsx("text-chat-muted data-hovered:text-chat-fg", className)} aria-label={`${labels.effort}: ${current?.label ?? ""}`}>
        {icon}
        {children ?? current?.label}
      </Button>
      <Popover placement="top end" className="w-72 p-3">
        <Dialog aria-label={labels.effort} className="outline-none">
          <EffortSlider {...slider} />
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
