"use client";

import { Modal, type ModalProps } from "./modal";

export type DialogProps = ModalProps;

/** Modal dialog: centred from md, a bottom sheet on phones. Same focus trap, Esc and overlay behaviour as Sheet. */
export function Dialog(props: DialogProps) {
  return <Modal side="dialog" {...props} />;
}
