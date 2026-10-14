"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui";
import { AuthProvider } from "./auth-provider";
import { QueryProvider } from "./query-provider";

/** Everything every page needs: data fetching, the signed-in user and toasts. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
      <Toaster />
    </QueryProvider>
  );
}
