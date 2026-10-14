import { describe, expect, it } from "vitest";
import { PASSWORD_RULES, forgotPasswordSchema, resetPasswordSchema } from "./password";

const reset = (password: string, passwordConfirmation = password) => resetPasswordSchema.safeParse({ password, passwordConfirmation });
const messages = (result: ReturnType<typeof reset>) => (result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));

describe("resetPasswordSchema", () => {
  it("accepts a strong password typed twice", () => {
    expect(reset("Correct-Horse-9-Battery").success).toBe(true);
  });

  it.each([
    ["too short", "Aa1-short"],
    ["no upper case", "lowercase-only-123"],
    ["no lower case", "UPPERCASE-ONLY-123"],
    ["no number", "No-Numbers-In-Here"],
  ])("rejects a password with %s", (_name, password) => {
    expect(messages(reset(password))[0]).toMatch(/^password: Use at least 12 characters/);
  });

  it("asks for both fields when empty", () => {
    expect(messages(reset("", ""))).toEqual(["password: Choose a new password.", "passwordConfirmation: Type the password again."]);
  });

  it("rejects a confirmation that differs", () => {
    expect(messages(reset("Correct-Horse-9-Battery", "Correct-Horse-9-Batterx"))).toEqual(["passwordConfirmation: The two passwords don't match."]);
  });
});

describe("PASSWORD_RULES", () => {
  it("checks each rule on its own, for the live checklist", () => {
    const passes = (value: string) => PASSWORD_RULES.filter((r) => r.test(value)).map((r) => r.id);
    expect(passes("")).toEqual([]);
    expect(passes("abcDEF")).toEqual(["case"]);
    expect(passes("123456789012")).toEqual(["length", "number"]);
    expect(passes("Correct-Horse-9-Battery")).toEqual(["length", "case", "number"]);
  });
});

describe("forgotPasswordSchema", () => {
  it("trims and validates the email", () => {
    expect(forgotPasswordSchema.parse({ email: "  me@everdigitech.com " }).email).toBe("me@everdigitech.com");
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
