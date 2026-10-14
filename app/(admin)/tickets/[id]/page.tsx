import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { TicketView } from "./ticket-view";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RequirePermission permission="tickets.view">
      <TicketView id={id} />
    </RequirePermission>
  );
}
