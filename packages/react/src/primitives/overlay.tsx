import { IconButton } from "./button";
import { cx } from "./cx";
import { useIcons } from "./icons";
import { useLabels } from "./labels";
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
  /** Clicking outside closes the dialog. Default true; false for dialogs that hold unsaved work. */
  isDismissable?: boolean;
  /** Escape doesn't close the dialog. Default false. */
  isKeyboardDismissDisabled?: boolean;
  /** A close button in the top right corner (label from `labels.close`). Default false. */
  showClose?: boolean;
  /** Pad the content like the title (px-5 pb-4). Default false: the content brings its own padding. */
  padded?: boolean;
}

/**
 * A centered dialog over a dimmed page. Escape and (unless `isDismissable={false}`) clicking outside close it;
 * focus stays inside.
 */
export function Modal({
  isOpen,
  onOpenChange,
  title,
  size = "lg",
  placement = "center",
  isDismissable = true,
  isKeyboardDismissDisabled = false,
  showClose = false,
  padded = false,
  children,
  className,
  ...props
}: ModalProps) {
  const labels = useLabels();
  const icons = useIcons();
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      isKeyboardDismissDisabled={isKeyboardDismissDisabled}
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
        <Dialog {...props} className="relative flex min-h-0 flex-1 flex-col outline-none">
          {title && (
            <Heading slot="title" className={cx("px-5 pt-4 pb-3 text-base font-medium", showClose && "pr-12")}>
              {title}
            </Heading>
          )}
          {showClose && (
            <IconButton slot="close" label={labels.close} size="sm" tooltip={false} className="absolute top-3 right-3 z-10">
              {icons.remove}
            </IconButton>
          )}
          {padded ? (
            <div className={cx("min-h-0 flex-1 overflow-y-auto px-5 pb-4", !title && "pt-4", !title && showClose && "pr-12")}>
              {children}
            </div>
          ) : (
            children
          )}
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
