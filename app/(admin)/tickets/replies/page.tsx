import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { RepliesView } from "./replies-view";

export const metadata: Metadata = { title: "Saved replies" };

export default function RepliesPage() {
  return (
    <RequirePermission permission="tickets.edit">
      <RepliesView />
    </RequirePermission>
  );
}
