import Link from "next/link";
import { Mail, ShieldAlert, UserCheck, Users } from "lucide-react";
import { STAT_GRID, StatCard } from "@/components/ui";
import type { StaffStats } from "@/lib/api/staff";
import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";

/** Where "Require for everyone" leads: the two-factor setting. The Settings page isn't built yet. */
export const REQUIRE_TWO_FACTOR_HREF = "/settings";

/** Four cards: total, active, pending invites, two-factor (warning style). 1 column below 480px, 2 from 480px, 4 from xl. */
export function StaffStatCards({ stats, stale = false }: { stats: StaffStats; stale?: boolean }) {
  const without = stats.twoFactorOf - stats.twoFactorOn;

  return (
    <div aria-busy={stale || undefined} className={cn(STAT_GRID, "transition-opacity", stale && "opacity-60")}>
      <StatCard
        label="Staff members"
        icon={<Users strokeWidth={2} />}
        value={formatCount(stats.total)}
        footnote={`Across ${formatCount(stats.roles)} ${stats.roles === 1 ? "role" : "roles"}`}
      />
      <StatCard label="Active" icon={<UserCheck strokeWidth={2} />} value={formatCount(stats.active)} footnote={`${formatCount(stats.suspended)} suspended`} />
      <StatCard label="Pending invites" icon={<Mail strokeWidth={2} />} value={formatCount(stats.invited)} footnote="Links expire after 48 hours" />
      <StatCard
        label="Two-factor sign-in"
        tone="warning"
        tinted
        icon={<ShieldAlert strokeWidth={2} />}
        value={`${formatCount(stats.twoFactorOn)} of ${formatCount(stats.twoFactorOf)}`}
        footnote={
          without > 0 ? (
            <>
              {formatCount(without)} active staff {without === 1 ? "doesn't" : "don't"} use it.{" "}
              {/* Padding + negative margin: a 44px tap area without changing how the sentence looks. */}
              <Link href={REQUIRE_TWO_FACTOR_HREF} className="-my-3.5 inline-block py-3.5 font-bold whitespace-nowrap text-warning">
                Require for everyone
              </Link>
            </>
          ) : (
            "Everyone signs in with two-factor."
          )
        }
      />
    </div>
  );
}
