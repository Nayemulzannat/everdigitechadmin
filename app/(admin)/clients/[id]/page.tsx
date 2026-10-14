import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { ClientDetailView } from "./client-detail-view";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;

  return (
    <RequirePermission permission="clients.view">
      <ClientDetailView id={id} />
    </RequirePermission>
  );
}
