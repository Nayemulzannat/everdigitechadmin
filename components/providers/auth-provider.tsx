"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authKeys, getMe, login as apiLogin, logout as apiLogout } from "@/lib/api/auth";
import { hasPermission } from "@/lib/auth/can";
import { LOGIN_PATH, isPublicPath, loginUrlFor } from "@/lib/auth/routes";
import { clearSignedIn, hasSignedInCookie, markSignedIn } from "@/lib/auth/session-cookie";
import type { AuthRole, AuthUser, LoginRequest, Me } from "@/types/auth";
import type { PermissionKey } from "@/types/permissions";

export interface AuthContextValue {
  user: AuthUser | null;
  role: AuthRole | null;
  permissions: readonly PermissionKey[];
  /** True until GET /me has answered for the first time. */
  isLoading: boolean;
  /** GET /me failed for a reason other than "signed out" (e.g. the API is down). */
  error: Error | null;
  retry: () => void;
  /** Whether the user has the permission (any of them, for an array). Super Admin always passes. */
  can: (permission: PermissionKey | readonly PermissionKey[]) => boolean;
  /** Signs in and stores the session. Rejects with LoginError for wrong credentials, locked or suspended. */
  login: (values: LoginRequest) => Promise<Me>;
  /** Signs out and goes to /login. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const meQuery = useQuery({ queryKey: authKeys.me, queryFn: getMe, staleTime: 5 * 60_000, retry: false });
  const me = meQuery.data ?? null;
  const signedOut = meQuery.isSuccess && meQuery.data === null;

  // Signed out (401 from GET /me) on an admin route: drop the hint cookie and go to /login, keeping ?next=.
  // Signed in but the hint cookie is missing (e.g. it expired before the session): put it back for proxy.ts.
  useEffect(() => {
    if (signedOut) {
      clearSignedIn();
      if (!isPublicPath(pathname)) router.replace(loginUrlFor(`${pathname}${window.location.search}`));
    } else if (me && !hasSignedInCookie()) {
      markSignedIn(false);
    }
  }, [signedOut, me, pathname, router]);

  const login = useCallback(
    async (values: LoginRequest) => {
      const signedIn = await apiLogin(values);
      // Nothing cached for a previous user should leak into this session.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== authKeys.me[0] });
      queryClient.setQueryData(authKeys.me, signedIn);
      markSignedIn(values.remember);
      return signedIn;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    clearSignedIn();
    await apiLogout();
    // A full page load drops every cached query and any in-memory state of the old session.
    window.location.assign(LOGIN_PATH);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me?.user ?? null,
      role: me?.role ?? null,
      permissions: me?.permissions ?? [],
      isLoading: meQuery.isPending,
      error: meQuery.error,
      retry: () => void meQuery.refetch(),
      can: (permission) => hasPermission(me, permission),
      login,
      logout,
    }),
    [me, meQuery, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
