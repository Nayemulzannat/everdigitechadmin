"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import type { PermissionKey } from "@/types/permissions";

export interface CanProps {
  /** One permission, or several where any one is enough. */
  permission: PermissionKey | readonly PermissionKey[];
  children: ReactNode;
  /** Rendered instead when the permission is missing. Nothing by default. */
  fallback?: ReactNode;
}

/** Renders `children` only when the signed-in user has the permission. Super Admin always sees them. */
export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = useAuth();
  return can(permission) ? children : fallback;
}
