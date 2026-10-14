import { z } from "zod";

/** The rules the API enforces for staff passwords (Password::defaults()), minus the data-breach check it does itself. */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_RULES = [
  { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (v: string) => v.length >= PASSWORD_MIN_LENGTH },
  { id: "case", label: "Upper and lower case letters", test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "number", label: "A number", test: (v: string) => /\d/.test(v) },
] as const;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .pipe(z.email("Enter a valid email address, like you@everdigitech.com.")),
});

export type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(1, "Choose a new password."),
    passwordConfirmation: z.string().min(1, "Type the password again."),
  })
  .superRefine((values, ctx) => {
    if (!PASSWORD_RULES.every((rule) => rule.test(values.password)) && values.password) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "Use at least 12 characters, with upper and lower case letters and a number." });
    }
    if (values.passwordConfirmation && values.password !== values.passwordConfirmation) {
      ctx.addIssue({ code: "custom", path: ["passwordConfirmation"], message: "The two passwords don't match." });
    }
  });

export type ResetPasswordValues = z.output<typeof resetPasswordSchema>;
