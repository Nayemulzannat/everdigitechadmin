"use client";

import { Modal, type ModalProps } from "./modal";

export type SheetProps = ModalProps & {
  /** bottom (default): filters, row actions; capped at 560px and centred on larger screens. top: full-width, e.g. search. */
  side?: "bottom" | "top";
};

/** Sheet that slides in from the bottom (or top) edge, mainly for phones. */
export function Sheet({ side = "bottom", ...props }: SheetProps) {
  return <Modal side={side} {...props} />;
}
