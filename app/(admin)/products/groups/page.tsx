import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { GroupsView } from "./groups-view";

export const metadata: Metadata = { title: "Product groups" };

export default function ProductGroupsPage() {
  return (
    <RequirePermission permission="products.view">
      <GroupsView />
    </RequirePermission>
  );
}
