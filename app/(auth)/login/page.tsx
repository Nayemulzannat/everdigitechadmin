import type { Metadata } from "next";
import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Staff sign-in. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next } = await searchParams;
  return (
    <AuthShell>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
