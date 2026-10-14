import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { buttonVariants } from "@/components/ui";

/** 403 page shown inside the admin shell when the user lacks the page's permission. */
export function Forbidden({ title = "You don't have access to this page" }: { title?: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-2 py-12 text-center">
      <span aria-hidden="true" className="mb-2 flex size-14 items-center justify-center rounded-card bg-warning-soft text-warning">
        <ShieldOff className="size-7" strokeWidth={1.8} />
      </span>
      <span className="text-xs font-bold tracking-[0.14em] text-text-muted uppercase">Error 403</span>
      <h1 className="max-w-md text-2xl font-extrabold tracking-[-0.02em] text-balance md:text-[28px]">{title}</h1>
      <p className="max-w-md text-[15px] text-balance text-text-muted">
        Your role doesn&apos;t include this part of the admin console. If you need it, ask a Super Admin to update your
        role.
      </p>
      <Link href="/dashboard" className={buttonVariants({ className: "mt-3 max-sm:w-full" })}>
        Back to dashboard
      </Link>
    </div>
  );
}
