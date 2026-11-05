import { clsx } from "clsx";
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

export interface ModalProps extends OverlayProps {
  /** Heading at the top, also the dialog's accessible name. */
  title?: ReactNode;
}

/** A centered dialog over a dimmed page. Escape and clicking outside close it; focus stays inside. */
export function Modal({ isOpen, onOpenChange, title, children, className, ...props }: ModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 data-entering:animate-chat-fade-in data-exiting:animate-chat-fade-out"
    >
      <AriaModal
        className={clsx(
          "flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-chat-lg border border-chat-popover-border bg-chat-popover font-chat-sans text-chat-fg shadow-chat-popover",
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
      className="fixed inset-0 z-40 bg-black/50 data-entering:animate-chat-fade-in data-exiting:animate-chat-fade-out"
    >
      <AriaModal
        className={clsx(
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
