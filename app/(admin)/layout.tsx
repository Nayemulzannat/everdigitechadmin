import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout";

// The signed-in user comes from AuthProvider (root layout); the shell waits for it.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
