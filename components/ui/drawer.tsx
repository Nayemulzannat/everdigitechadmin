"use client";

import { Modal, type ModalProps } from "./modal";

export type DrawerProps = ModalProps;

/** Left side sheet, e.g. the navigation on phones and tablets. */
export function Drawer(props: DrawerProps) {
  return <Modal side="left" {...props} />;
}
