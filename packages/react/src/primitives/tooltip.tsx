import type { ReactElement, ReactNode } from "react";
import { Tooltip as AriaTooltip, TooltipTrigger, type TooltipProps as AriaTooltipProps } from "react-aria-components";

export interface TooltipProps {
  content: ReactNode;
  /** A focusable element, usually a Button or IconButton. */
  children: ReactElement;
  placement?: AriaTooltipProps["placement"];
  delay?: number;
}

export function Tooltip({ content, children, placement = "top", delay = 600 }: TooltipProps) {
  return (
    <TooltipTrigger delay={delay} closeDelay={0}>
      {children}
      <AriaTooltip
        placement={placement}
        offset={6}
        className="rounded-chat-sm bg-chat-raised px-2 py-1 font-chat-sans text-xs text-chat-fg shadow-chat-popover motion-safe:data-entering:animate-chat-in motion-safe:data-exiting:animate-chat-out"
      >
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
}
