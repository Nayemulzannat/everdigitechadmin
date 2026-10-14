"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Alert, Button, Input, buttonVariants } from "@/components/ui";
import { forgotPassword } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/errors";
import { forgotPasswordSchema } from "@/lib/auth/password";

/** Email → "Check your email". The answer is the same whether or not the address belongs to an admin. */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      setMessage(await forgotPassword(values));
      setSentTo(values.email);
    } catch (raw) {
      setError(toApiError(raw).message);
    }
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-6">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-card bg-primary-soft text-primary">
          <MailCheck className="size-6" strokeWidth={1.8} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">Check your email</h1>
          <p role="status" className="text-[15px] text-text-muted">
            {message || "If that email belongs to an admin account, we have sent a password reset link."}
          </p>
          <p className="text-[15px] text-text-muted">
            We sent it to <strong className="text-text">{sentTo}</strong> if it matches an account. The link works for 60 minutes.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/login" className={buttonVariants({ className: "h-12 w-full text-[15px]" })}>
            Back to sign in
          </Link>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              reset();
              setSentTo(null);
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">Forgot your password?</h1>
        <p className="text-[15px] text-text-muted">Enter your staff email and we&apos;ll send you a link to choose a new one.</p>
      </div>

      {error ? (
        <Alert tone="danger" role="alert" title="Couldn't send the link">
          {error}
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
        <Button type="submit" loading={isSubmitting} className="h-12 w-full text-[15px]">
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <Link href="/login" className="inline-flex min-h-11 items-center gap-2 self-start text-[13px] font-bold no-underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>
    </div>
  );
}
