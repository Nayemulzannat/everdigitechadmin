import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { RolesView } from "./roles-view";

export const metadata: Metadata = { title: "Roles & permissions" };

export default function RolesPage() {
  return (
    <RequirePermission permission="roles.view">
      <RolesView />
    </RequirePermission>
  );
}
