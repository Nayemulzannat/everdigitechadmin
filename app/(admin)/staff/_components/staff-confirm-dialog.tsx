"use client";

import type { ReactNode } from "react";
import { Alert, Button, Dialog } from "@/components/ui";

interface StaffConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Names the person and says what will happen. */
  children: ReactNode;
  confirmLabel: string;
  loading: boolean;
  /** An error from the API (e.g. "This is the last active Super Admin..."), shown inside the dialog. */
  error: Error | null;
  onConfirm: () => void;
}

/** "Suspend Jahid Hasan?" / "Remove Jahid Hasan?": asks first, and keeps the API's answer in view if it refuses. */
export function StaffConfirmDialog({ open, onClose, title, children, confirmLabel, loading, error, onConfirm }: StaffConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger-outline" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <Alert tone="danger" role="alert">
            {error.message}
          </Alert>
        ) : null}
        <p className="text-[15px] text-text-secondary">{children}</p>
      </div>
    </Dialog>
  );
}
