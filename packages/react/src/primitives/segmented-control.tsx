import { cx } from "./cx";
import type { ReactNode } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { Tooltip } from "./tooltip";

export interface SegmentedOption<T extends string = string> {
  id: T;
  label: string;
  icon?: ReactNode;
  /** Show only the icon; the label becomes its accessible name and tooltip. */
  iconOnly?: boolean;
  /** Disable just this option. */
  isDisabled?: boolean;
}

const sizes = {
  sm: { button: "h-6", iconOnly: "w-7" },
  md: { button: "h-8", iconOnly: "w-9" },
};

interface SegmentedControlBase<T extends string> {
  /** Accessible name of the group, e.g. "Mode". */
  label: string;
  options: readonly SegmentedOption<T>[];
  /** Disable the whole control. */
  isDisabled?: boolean;
  /** "sm" (default, 24px tall) or "md" (32px). */
  size?: keyof typeof sizes;
  className?: string;
}

export type SegmentedControlProps<T extends string = string> = SegmentedControlBase<T> &
  (
    | {
        /** Pressing the selected option again clears the selection: `value` may be `null` and `onChange` gets `null`. */
        clearable?: false;
        value: T;
        onChange: (value: T) => void;
      }
    | {
        clearable: true;
        value: T | null;
        onChange: (value: T | null) => void;
      }
  );

/**
 * One of a few options, side by side on a track, similar to claude.ai's Chat / Cowork switch. Themed with
 * `--chat-segment-track` (default: a shade darker than the surface it sits on) and `--chat-segment-selected`
 * (default `--chat-raised`).
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange, clearable, isDisabled, size = "sm", className }: SegmentedControlProps<T>) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection={!clearable}
      {...(isDisabled && { isDisabled })}
      selectedKeys={value === null ? [] : [value]}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (next !== undefined) (onChange as (v: T | null) => void)(next as T);
        else if (clearable) (onChange as (v: T | null) => void)(null);
      }}
      className={cx(
        "inline-flex shrink-0 items-center gap-0.5 rounded-chat-md p-0.5",
        "bg-[var(--chat-segment-track,color-mix(in_srgb,var(--chat-bg)_55%,transparent))]",
        className,
      )}
    >
      {options.map((o) => {
        const button = (
          <ToggleButton
            key={o.id}
            id={o.id}
            {...(o.isDisabled && { isDisabled: true })}
            {...(o.iconOnly && { "aria-label": o.label })}
            className={cx(
              "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[calc(var(--chat-radius-md)-2px)] font-chat-sans text-(length:--chat-ui-font-size) leading-5 text-chat-muted outline-none transition-colors select-none [&_svg]:size-4",
              sizes[size].button,
              o.iconOnly ? sizes[size].iconOnly : "px-2",
              "data-disabled:cursor-default data-disabled:opacity-40",
              "data-hovered:text-chat-fg data-focus-visible:ring-2 data-focus-visible:ring-chat-focus",
              "data-selected:bg-[var(--chat-segment-selected,var(--chat-raised))] data-selected:text-chat-fg data-selected:shadow-[inset_0_0_0_1px_var(--chat-border-strong)]",
            )}
          >
            {o.icon}
            {!o.iconOnly && o.label}
          </ToggleButton>
        );
        return o.iconOnly ? (
          <Tooltip key={o.id} content={o.label}>
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </ToggleButtonGroup>
  );
}
