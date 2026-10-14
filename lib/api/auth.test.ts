import { describe, expect, it } from "vitest";
import { loginErrorCode } from "./auth";
import { ApiError } from "./errors";

const fail = (status: number, code?: string) => new ApiError(status, "message", code ? { code } : undefined);

describe("loginErrorCode", () => {
  it("maps the codes the Laravel API sends", () => {
    expect(loginErrorCode(fail(422, "invalid_credentials"))).toBe("invalid_credentials");
    expect(loginErrorCode(fail(429, "account_locked"))).toBe("locked");
    expect(loginErrorCode(fail(403, "account_suspended"))).toBe("suspended");
  });

  it("still accepts the older code names", () => {
    expect(loginErrorCode(fail(429, "locked"))).toBe("locked");
    expect(loginErrorCode(fail(423, "suspended"))).toBe("suspended");
  });

  it("falls back to the status when there is no code", () => {
    expect(loginErrorCode(fail(422))).toBe("invalid_credentials");
    expect(loginErrorCode(fail(429))).toBe("locked");
    expect(loginErrorCode(fail(423))).toBe("suspended");
  });

  it("is not a login error for other failures", () => {
    expect(loginErrorCode(fail(500))).toBeNull();
    expect(loginErrorCode(fail(0))).toBeNull();
    expect(loginErrorCode(fail(403, "forbidden"))).toBeNull();
    expect(loginErrorCode(fail(419, "csrf_token_mismatch"))).toBeNull();
  });
});
