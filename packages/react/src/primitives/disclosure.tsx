import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  Button,
  Disclosure as AriaDisclosure,
  DisclosurePanel,
  Heading,
  type DisclosureProps as AriaDisclosureProps,
} from "react-aria-components";
import { Caret } from "./caret";

export interface DisclosureProps extends Omit<AriaDisclosureProps, "className" | "children"> {
  /** The always-visible row. A small caret follows it, pointing right when closed and down when open. */
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
  panelClassName?: string;
  /** "caret": small triangle after the label (default). "chevron": chevron before it, for list sections. */
  indicator?: "caret" | "chevron";
  /** Content at the far right of the summary row, e.g. a count. */
  trailing?: ReactNode;
}

/** A row that expands to show more, like "Recalled memory ▸". */
export function Disclosure({
  summary,
  children,
  className,
  summaryClassName,
  panelClassName,
  indicator = "caret",
  trailing,
  ...props
}: DisclosureProps) {
  return (
    <AriaDisclosure {...props} {...(className !== undefined && { className })}>
      <Heading className="m-0 font-normal">
        <Button
          slot="trigger"
          className={clsx(
            "group/trigger flex max-w-full cursor-pointer items-center gap-1.5 rounded-chat-sm text-left text-chat-muted outline-none",
            "data-hovered:text-chat-fg data-focus-visible:ring-2 data-focus-visible:ring-chat-focus",
            summaryClassName,
          )}
        >
          {indicator === "chevron" && (
            <ChevronRight aria-hidden className="size-3.5 shrink-0 transition-transform group-aria-expanded/trigger:rotate-90" />
          )}
          <span className="min-w-0 truncate">{summary}</span>
          {indicator === "caret" && <Caret className="group-aria-expanded/trigger:rotate-90" />}
          {trailing && <span className="ml-auto shrink-0 pl-2">{trailing}</span>}
        </Button>
      </Heading>
      {/* Padding goes on an inner box: a collapsed panel stays in the layout (hidden="until-found"). */}
      <DisclosurePanel>
        <div className={panelClassName}>{children}</div>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}
