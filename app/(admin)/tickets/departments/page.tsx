import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { DepartmentsView } from "./departments-view";

export const metadata: Metadata = { title: "Ticket departments" };

export default function DepartmentsPage() {
  return (
    <RequirePermission permission="tickets.view">
      <DepartmentsView />
    </RequirePermission>
  );
}
