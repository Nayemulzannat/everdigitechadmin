"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert, Button, Checkbox, Input } from "@/components/ui";
import { LoginError } from "@/lib/api/auth";
import { HOME_PATH, safeNextPath } from "@/lib/auth/routes";
import { signInSchema } from "@/lib/auth/sign-in";
import type { LoginErrorCode } from "@/types/auth";

const SERVER_ERRORS: Record<LoginErrorCode, { title: string; text: string }> = {
  invalid_credentials: {
    title: "Email or password is incorrect",
    text: "Check them and try again. After 5 failed attempts the account is locked for 15 minutes.",
  },
  locked: {
    title: "Account locked for 15 minutes",
    text: "There were too many failed sign-in attempts. Try again later or reset your password.",
  },
  suspended: {
    title: "This account is suspended",
    text: "You can't sign in until a Super Admin restores your access.",
  },
};

// The customer-facing area lives on another site; set its URL per environment.
const CLIENT_AREA_URL = process.env.NEXT_PUBLIC_CLIENT_AREA_URL ?? "#";

/** `next`: where to go after signing in (from ?next=). Anything that isn't a path in this app is ignored. */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<LoginErrorCode | null>(null);
  const [otherError, setOtherError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Stays pending until /dashboard has loaded, so the spinner doesn't stop before the page changes.
  const [redirecting, startRedirect] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setOtherError(null);
    try {
      await login(values);
    } catch (error) {
      if (error instanceof LoginError) setServerError(error.code);
      else setOtherError(error instanceof Error ? error.message : "Signing in didn't work. Try again.");
      return;
    }
    startRedirect(() => router.replace(safeNextPath(next) ?? HOME_PATH));
  });

  const busy = isSubmitting || redirecting;
  const banner = serverError ? SERVER_ERRORS[serverError] : null;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">Sign in</h1>
        <p className="text-[15px] text-text-muted">Use your staff email and password.</p>
      </div>

      {banner ? (
        <Alert tone="danger" role="alert" title={banner.title}>
          {banner.text}
        </Alert>
      ) : null}
      {otherError ? (
        <Alert tone="danger" role="alert" title="Couldn't sign in">
          {otherError}
        </Alert>
      ) : null}

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-[18px]">
        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@everdigitech.com"
          controlSize="lg"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Your password"
          controlSize="lg"
          error={errors.password?.message}
          labelAction={
            <a href="/forgot-password" className="-my-3 inline-flex min-h-11 items-center text-[13px] font-bold no-underline">
              Forgot password?
            </a>
          }
          trailing={
            <Button
              iconOnly
              variant="ghost"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-controls="password"
              onClick={() => setShowPassword((shown) => !shown)}
              className="rounded-nav text-text-muted"
            >
              {showPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
            </Button>
          }
          {...register("password")}
        />

        <Checkbox label="Keep me signed in on this device" {...register("remember")} />

        <Button type="submit" loading={busy} className="h-12 w-full text-[15px]">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-[13px] leading-relaxed text-text-muted">
        Looking for your hosting account?{" "}
        <a href={CLIENT_AREA_URL} className="font-bold whitespace-nowrap no-underline">
          Go to the client area
        </a>
      </p>
    </div>
  );
}
