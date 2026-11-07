import type { DOMAttributes, ReactElement, ReactNode } from "react";
import { Focusable, Tooltip as AriaTooltip, TooltipTrigger, type TooltipProps as AriaTooltipProps } from "react-aria-components";

/**
 * A react-aria component (Button, IconButton, Link...) is used as is. A plain element (span, a, div...) gets
 * react-aria's Focusable around it, which makes it focusable, so the tooltip also shows on keyboard focus.
 */
function asTrigger(children: ReactElement) {
  if (typeof children.type !== "string") return children;
  return <Focusable>{children as ReactElement<DOMAttributes<HTMLElement>, string>}</Focusable>;
}

export interface TooltipProps {
  content: ReactNode;
  /** The trigger: a react-aria component (Button, IconButton) or any plain element, e.g. a span. */
  children: ReactElement;
  placement?: AriaTooltipProps["placement"];
  delay?: number;
}

export function Tooltip({ content, children, placement = "top", delay = 600 }: TooltipProps) {
  return (
    <TooltipTrigger delay={delay} closeDelay={0}>
      {asTrigger(children)}
      <AriaTooltip
        placement={placement}
        offset={6}
        className="rounded-chat-sm bg-chat-raised px-2 py-1 font-chat-sans text-(length:--chat-ui-font-size-sm) leading-4 text-chat-fg shadow-chat-popover motion-safe:data-entering:animate-chat-in motion-safe:data-exiting:animate-chat-out"
      >
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
}
