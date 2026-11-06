import { cx } from "./cx";
import type { ReactNode } from "react";
import { Dialog, Heading, Modal as AriaModal, ModalOverlay } from "react-aria-components";

interface OverlayProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name when there is no visible `title`. */
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
}

const modalSizes = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
  /** Fills the page inside the overlay's padding. */
  full: "h-full max-h-none max-w-none",
};

export interface ModalProps extends OverlayProps {
  /** Heading at the top, also the dialog's accessible name. */
  title?: ReactNode;
  /** Width of the dialog: sm 24rem, md 32rem, lg 42rem (default), xl 64rem, full fills the page. */
  size?: keyof typeof modalSizes;
  /** "center" (default) vertically centers the dialog; "top" puts it near the top edge, e.g. a command palette. */
  placement?: "center" | "top";
}

/** A centered dialog over a dimmed page. Escape and clicking outside close it; focus stays inside. */
export function Modal({ isOpen, onOpenChange, title, size = "lg", placement = "center", children, className, ...props }: ModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className={cx(
        "fixed inset-0 z-50 flex justify-center bg-(--chat-backdrop) p-4 data-entering:animate-chat-fade-in data-exiting:animate-chat-fade-out",
        placement === "top" ? "items-start pt-[10dvh]" : "items-center",
      )}
    >
      <AriaModal
        className={cx(
          "flex max-h-[85dvh] w-full flex-col rounded-chat-lg border border-chat-popover-border bg-chat-popover font-chat-sans text-chat-fg shadow-chat-popover",
          modalSizes[size],
          "data-entering:animate-chat-in data-exiting:animate-chat-out",
          className,
        )}
      >
        <Dialog {...props} className="flex min-h-0 flex-1 flex-col outline-none">
          {title && (
            <Heading slot="title" className="px-5 pt-4 pb-3 text-base font-medium">
              {title}
            </Heading>
          )}
          {children}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}

export interface DrawerProps extends OverlayProps {
  side?: "left" | "right";
}

/** A panel sliding in from the side over a dimmed page, e.g. the sidebar on phones. */
export function Drawer({ isOpen, onOpenChange, side = "left", children, className, ...props }: DrawerProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-40 bg-(--chat-backdrop) data-entering:animate-chat-fade-in data-exiting:animate-chat-fade-out"
    >
      <AriaModal
        className={cx(
          "fixed inset-y-0 w-[min(20rem,85vw)] bg-chat-sidebar text-chat-fg shadow-chat-popover outline-none",
          side === "left"
            ? "left-0 data-entering:animate-chat-drawer-in data-exiting:animate-chat-drawer-out"
            : "right-0 data-entering:animate-chat-drawer-in-right data-exiting:animate-chat-drawer-out-right",
          className,
        )}
      >
        <Dialog {...props} className="h-full outline-none">
          {children}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
