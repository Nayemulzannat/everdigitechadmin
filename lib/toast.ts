// Tiny toast store. Callable from anywhere (React or not, e.g. the API client); <Toaster /> renders it.

export type ToastTone = "info" | "success" | "warning" | "danger";

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const DURATION_MS = 5000;
const MAX_VISIBLE = 3;

function emit() {
  listeners.forEach((l) => l());
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Shows a toast for 5s. The same message isn't stacked twice (e.g. several 403s at once). */
export function toast(input: Omit<Toast, "id" | "tone"> & { tone?: ToastTone }) {
  if (toasts.some((t) => t.title === input.title && t.description === input.description)) return;
  const item: Toast = { tone: "info", ...input, id: nextId++ };
  toasts = [...toasts, item].slice(-MAX_VISIBLE);
  emit();
  if (typeof window !== "undefined") window.setTimeout(() => dismissToast(item.id), DURATION_MS);
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getToasts = () => toasts;
const EMPTY: Toast[] = [];
export const getServerToasts = () => EMPTY;
