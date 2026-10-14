import type { Metadata } from "next";
import { AuthShell } from "../_components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set your password" };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/**
 * Where the links in the emails lead: /reset-password?token=…&email=… for "Forgot password", and the same plus
 * &invite=1 for a new staff member's "Set your password" link.
 */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <AuthShell>
      <ResetPasswordForm token={first(params.token)} email={first(params.email)} invite={first(params.invite) === "1"} />
    </AuthShell>
  );
}
