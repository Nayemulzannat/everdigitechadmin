import { Suspense } from "react";
import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { ClientsView } from "./clients-view";

export const metadata: Metadata = { title: "Clients" };

// ClientsView reads its filters from the URL (useSearchParams), which needs a Suspense boundary.
export default function ClientsPage() {
  return (
    <RequirePermission permission="clients.view">
      <Suspense>
        <ClientsView />
      </Suspense>
    </RequirePermission>
  );
}
