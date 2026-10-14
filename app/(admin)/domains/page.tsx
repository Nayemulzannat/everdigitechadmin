import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { DomainsView } from "./domains-view";

export const metadata: Metadata = { title: "Domains" };

export default function DomainsPage() {
  return (
    <RequirePermission permission="domains.view">
      <DomainsView />
    </RequirePermission>
  );
}
