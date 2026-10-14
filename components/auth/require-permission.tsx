"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import type { PermissionKey } from "@/types/permissions";
import { Forbidden } from "./forbidden";

/** Page-level guard: the page when allowed, otherwise the 403 page inside the shell. */
export function RequirePermission({ permission, children }: { permission: PermissionKey | readonly PermissionKey[]; children: ReactNode }) {
  const { can, isLoading } = useAuth();
  if (isLoading) return null;
  return can(permission) ? children : <Forbidden />;
}
