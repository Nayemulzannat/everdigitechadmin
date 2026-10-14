import type { ReactNode } from "react";
import { LockKeyhole, Shield } from "lucide-react";
import { Logo } from "@/components/layout";

const SECURITY_POINTS = [
  { icon: Shield, text: "Two-factor authentication for every staff account" },
  { icon: LockKeyhole, text: "Locked for 15 minutes after 5 failed attempts" },
];

/**
 * Layout shared by the sign-in, forgot-password and reset-password pages. Not wrapped in the admin shell (route
 * group (auth) has no shell layout). `children` is the form; it should contain the page's <h1>.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-surface">
      {/* lg+: brand panel. Below lg it's hidden and the logo sits above the form instead. */}
      <div className="hidden w-[44%] max-w-[620px] shrink-0 flex-col justify-between gap-12 bg-primary p-10 text-on-primary lg:flex xl:p-12">
        <Logo size="lg" variant="white" />
        <div className="flex max-w-[440px] flex-col gap-5">
          <span className="text-xs font-bold tracking-[0.14em] text-on-primary-subtle uppercase">Admin console</span>
          {/* The form's heading is the page's h1; this headline is presentational. */}
          <p className="text-[32px] leading-[1.15] font-extrabold tracking-[-0.02em] xl:text-[40px]">Clients, billing and servers in one place.</p>
          <p className="text-base leading-relaxed text-on-primary-muted">
            This area is for EverDigitech staff only. Every sign-in is recorded with its IP address and device.
          </p>
        </div>
        <ul className="flex flex-col gap-3 text-sm text-on-primary-muted">
          {SECURITY_POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5">
              <Icon aria-hidden="true" strokeWidth={2} className="size-4 shrink-0 text-on-primary" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/*
        Form column. `my-auto` on the inner box centres it when there's room and collapses to 0 when there isn't,
        so on short screens (or with the keyboard open) it's top-aligned with 24px padding and the page scrolls
        instead of clipping the top.
      */}
      <main className="flex min-w-0 flex-1 flex-col p-6 lg:py-12">
        <div className="mx-auto my-auto flex w-full max-w-[400px] flex-col gap-8">
          <Logo className="lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
