import { Suspense } from "react";
import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { TicketsView } from "./tickets-view";

export const metadata: Metadata = { title: "Support tickets" };

// TicketsView reads its filters from the URL (useSearchParams), which needs a Suspense boundary.
export default function TicketsPage() {
  return (
    <RequirePermission permission="tickets.view">
      <Suspense>
        <TicketsView />
      </Suspense>
    </RequirePermission>
  );
}
