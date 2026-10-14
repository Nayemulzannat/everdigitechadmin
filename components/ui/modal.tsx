"use client";

import {
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { Button } from "./button";

/** Props shared by Drawer and Sheet. */
export interface ModalProps {
  open: boolean;
  /** Called on Esc, overlay tap and the close button. Set `open` to false in response. */
  onClose: () => void;
  /** Heading for the panel; also its accessible name. */
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Sticky bar at the bottom, typically the actions. */
  footer?: ReactNode;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** Dialog width from md up: md 480px (default), lg 680px, xl 880px. Phones always get a full-width sheet. */
  size?: "md" | "lg" | "xl";
  /** Classes for the panel's inner layout box. */
  className?: string;
  /** Element to focus on open. Defaults to the first focusable element (usually the close button). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  ref?: Ref<HTMLDialogElement>;
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
  'textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function getFocusable(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
}

/**
 * Modal panel on a native <dialog> opened with showModal(), so the page behind it is inert and it sits in the
 * top layer. Adds: a Tab focus trap, Esc and overlay-tap to close, body scroll lock and focus restore.
 * Styles and motion live in `.ui-modal` in app/globals.css.
 */
export function Modal({
  side,
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = "Close",
  className,
  size = "md",
  initialFocusRef,
  ref,
}: ModalProps & { side: "left" | "bottom" | "top" | "dialog" }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnOverlay = useRef(false);
  // Set when this component closes the <dialog> itself (cleanup). The browser then fires a "close" event a moment later,
  // which must not be taken for the person closing it: in development React runs every effect twice, and without this a
  // dialog that is mounted already open would close itself at once.
  const closedByCleanup = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  useImperativeHandle(ref, () => dialogRef.current as HTMLDialogElement, []);

  // Layout effect, so showModal() and focus() run while the opening tap is still being handled
  // (iOS only raises the keyboard for focus() inside a user gesture).
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    initialFocusRef?.current?.focus();
    const unlockScroll = lockBodyScroll();

    return () => {
      unlockScroll();
      if (dialog.open) {
        closedByCleanup.current = true;
        dialog.close();
      }
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, initialFocusRef]);

  // Clicks on the ::backdrop land on the <dialog> itself; the inner box covers the rest.
  // Require the press to start there too, so dragging out of the panel (e.g. selecting text) doesn't close it.
  function onPointerDown(event: PointerEvent<HTMLDialogElement>) {
    pressStartedOnOverlay.current = event.target === event.currentTarget;
  }

  function onClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && pressStartedOnOverlay.current) onClose();
    pressStartedOnOverlay.current = false;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const focusable = getFocusable(event.currentTarget);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === event.currentTarget)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const isDrawer = side === "left";
  const isTop = side === "top";

  return (
    <dialog
      ref={dialogRef}
      data-side={side}
      data-size={size}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="ui-modal"
      // Esc: keep `open` controlled by the parent instead of letting the browser close the dialog.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The browser can still force-close it (e.g. repeated Esc); keep the parent in sync.
      onClose={() => {
        if (closedByCleanup.current) {
          closedByCleanup.current = false;
          return;
        }
        if (open) onClose();
      }}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <div className={cn("flex flex-col", isDrawer ? "h-full" : "max-h-[inherit]", className)}>
        {side === "bottom" || side === "dialog" ? (
          <span
            aria-hidden="true"
            className={cn("mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-border", side === "dialog" && "md:hidden")}
          />
        ) : null}

        <div
          className={cn(
            "flex shrink-0 items-start justify-between gap-3 border-b border-border py-3 pr-2 pl-4 md:pl-5",
            (isDrawer || isTop) && "pt-[max(0.75rem,env(safe-area-inset-top))]",
            isDrawer && "pl-[max(1rem,env(safe-area-inset-left))]",
          )}
        >
          <div className="flex min-w-0 flex-col gap-0.5 py-2.5">
            <h2 id={titleId} className="text-[17px] leading-6 font-extrabold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-[13px] text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <Button iconOnly variant="ghost" aria-label={closeLabel} onClick={onClose}>
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-5",
            isDrawer && "pl-[max(1rem,env(safe-area-inset-left))]",
            !footer && !isTop && "pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
