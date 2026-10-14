"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Circle, CircleCheck, Eye, EyeOff, Link2Off, PartyPopper } from "lucide-react";
import { Alert, Button, Input, buttonVariants } from "@/components/ui";
import { resetPassword } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/errors";
import { PASSWORD_RULES, resetPasswordSchema } from "@/lib/auth/password";
import { cn } from "@/lib/cn";

interface ResetPasswordFormProps {
  /** From the link in the email. Both are needed. */
  token?: string;
  email?: string;
  /** A new staff member's "set your password" link rather than a "forgot password" one: only the wording differs. */
  invite: boolean;
}

type Stage = "form" | "done" | "expired";

/** A link that is missing its token or email, was already used, or has run out. */
function DeadLink({ invite }: { invite: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-card bg-warning-soft text-warning">
        <Link2Off className="size-6" strokeWidth={1.8} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">This link doesn&apos;t work</h1>
        <p className="text-[15px] text-text-muted">
          {invite
            ? "It may have expired (invites last 48 hours) or already been used. Ask a Super Admin to send you a new invite."
            : "It may have expired (reset links last 60 minutes) or already been used. Request a new one and use the latest email."}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {invite ? null : (
          <Link href="/forgot-password" className={buttonVariants({ className: "h-12 w-full text-[15px]" })}>
            Request a new link
          </Link>
        )}
        <Link href="/login" className={buttonVariants({ variant: invite ? "primary" : "ghost", className: "h-12 w-full text-[15px]" })}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export function ResetPasswordForm({ token, email, invite }: ResetPasswordFormProps) {
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", passwordConfirmation: "" } });
  const typed = useWatch({ control, name: "password" });

  if (!token || !email || stage === "expired") return <DeadLink invite={invite} />;

  if (stage === "done") {
    return (
      <div className="flex flex-col gap-6">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-card bg-success-soft text-success">
          <PartyPopper className="size-6" strokeWidth={1.8} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">{invite ? "Your password is set" : "Password changed"}</h1>
          <p role="status" className="text-[15px] text-text-muted">
            {invite ? "Welcome to EverDigitech. You can sign in now." : "You can sign in with your new password now."}
          </p>
        </div>
        <Link href="/login" className={buttonVariants({ className: "h-12 w-full text-[15px]" })}>
          Sign in
        </Link>
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await resetPassword({ token, email, password: values.password, password_confirmation: values.passwordConfirmation });
      setStage("done");
    } catch (raw) {
      const failure = toApiError(raw);
      if (failure.code === "invalid_reset_token") return setStage("expired");
      const passwordMessage = failure.fieldErrors?.password?.[0];
      if (passwordMessage) setFieldError("password", { type: "server", message: passwordMessage });
      else setError(failure.message);
    }
  });

  const toggle = (
    <Button
      iconOnly
      variant="ghost"
      aria-label={showPassword ? "Hide passwords" : "Show passwords"}
      onClick={() => setShowPassword((shown) => !shown)}
      className="rounded-nav text-text-muted"
    >
      {showPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
    </Button>
  );

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">{invite ? "Set your password" : "Choose a new password"}</h1>
        <p className="text-[15px] text-text-muted">
          {invite ? "Welcome to the EverDigitech admin console. Pick a password for " : "Pick a new password for "}
          <strong className="font-bold break-all text-text">{email}</strong>.
        </p>
      </div>

      {error ? (
        <Alert tone="danger" role="alert" title="Couldn't save the password">
          {error}
        </Alert>
      ) : null}

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-[18px]">
        <Input
          label={invite ? "Password" : "New password"}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="At least 12 characters"
          controlSize="lg"
          error={errors.password?.message}
          trailing={toggle}
          {...register("password")}
        />

        <ul aria-label="Password rules" className="-mt-2 flex flex-col gap-1 text-[13px]">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(typed);
            return (
              <li key={rule.id} className={cn("flex items-center gap-2", ok ? "text-success" : "text-text-muted")}>
                {ok ? <CircleCheck aria-hidden="true" className="size-4" /> : <Circle aria-hidden="true" className="size-4" />}
                {rule.label}
                <span className="sr-only">{ok ? " (done)" : " (not yet)"}</span>
              </li>
            );
          })}
        </ul>

        <Input
          label="Type it again"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          controlSize="lg"
          error={errors.passwordConfirmation?.message}
          {...register("passwordConfirmation")}
        />

        <Button type="submit" loading={isSubmitting} className="h-12 w-full text-[15px]">
          {isSubmitting ? "Saving…" : invite ? "Set password" : "Change password"}
        </Button>
      </form>

      <p className="text-[13px] leading-relaxed text-text-muted">We also reject passwords that have appeared in a known data breach.</p>
    </div>
  );
}
