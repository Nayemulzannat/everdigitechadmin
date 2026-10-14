"use client";

import { useAuth } from "@/components/providers/auth-provider";
import type { CurrentUser } from "./user-card";

/** The signed-in staff member for display. Only use inside the admin shell, which waits for sign-in. */
export function useCurrentUser(): CurrentUser {
  const { user, role } = useAuth();
  if (!user || !role) throw new Error("useCurrentUser must be used inside the admin shell.");
  return { name: user.name, email: user.email, role: role.name };
}
