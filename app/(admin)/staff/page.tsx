import { Suspense } from "react";
import type { Metadata } from "next";
import { RequirePermission } from "@/components/auth";
import { StaffView } from "./staff-view";

export const metadata: Metadata = { title: "Staff" };

// StaffView reads its filters from the URL (useSearchParams), which needs a Suspense boundary.
export default function StaffPage() {
  return (
    <RequirePermission permission="staff.view">
      <Suspense>
        <StaffView />
      </Suspense>
    </RequirePermission>
  );
}
