"use client";

import { useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { dismissToast, getServerToasts, getToasts, subscribeToasts, type ToastTone } from "@/lib/toast";

const TONES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "text-primary" },
  success: { icon: CircleCheck, className: "text-success" },
  warning: { icon: TriangleAlert, className: "text-warning" },
  danger: { icon: CircleAlert, className: "text-danger" },
};

/** Renders toasts: full width above the safe area on phones, bottom-right from md. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:w-[360px]"
    >
      {toasts.map((t) => {
        const { icon: Icon, className } = TONES[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === "danger" || t.tone === "warning" ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-3 rounded-control border border-border bg-surface py-3 pr-1.5 pl-4 shadow-lg motion-safe:animate-[toast-in_200ms_ease-out]"
          >
            <Icon aria-hidden="true" className={cn("mt-0.5 size-[18px] shrink-0", className)} strokeWidth={2} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
              <p className="text-sm font-bold">{t.title}</p>
              {t.description ? <p className="text-[13px] text-text-muted">{t.description}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
              className="-my-1.5 flex size-11 shrink-0 items-center justify-center rounded-nav text-text-muted hover:bg-neutral-soft hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
