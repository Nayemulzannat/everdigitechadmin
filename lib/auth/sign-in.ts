import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .pipe(z.email("Enter a valid email address, like you@everdigitech.com.")),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});

export type SignInValues = z.output<typeof signInSchema>;
