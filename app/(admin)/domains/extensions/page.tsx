import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { ExtensionsView } from "./extensions-view";

export const metadata: Metadata = { title: "Domain extensions" };

export default function DomainExtensionsPage() {
  return (
    <RequirePermission permission="domains.view">
      <ExtensionsView />
    </RequirePermission>
  );
}
