import { describe, expect, it } from "vitest";
import { isPublicPath, loginUrlFor, safeNextPath } from "./routes";

describe("safeNextPath", () => {
  it("keeps paths inside the app, with their query", () => {
    expect(safeNextPath("/clients")).toBe("/clients");
    expect(safeNextPath("/clients?status=active&page=2")).toBe("/clients?status=active&page=2");
  });

  it("rejects anything that could leave the app (open redirect)", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example/clients")).toBeNull();
    // Browsers treat "/\evil.example" like "//evil.example".
    expect(safeNextPath(String.raw`/\evil.example`)).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("clients")).toBeNull();
  });

  it("rejects /login so signing in can't loop back to the login page", () => {
    expect(safeNextPath("/login")).toBeNull();
    expect(safeNextPath("/login?next=/clients")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
});

describe("loginUrlFor", () => {
  it("keeps the current URL as an encoded ?next=", () => {
    expect(loginUrlFor("/clients?page=2")).toBe("/login?next=%2Fclients%3Fpage%3D2");
  });

  it("drops ?next= when there's nowhere useful to return to", () => {
    expect(loginUrlFor("/")).toBe("/login");
    expect(loginUrlFor("/login")).toBe("/login");
  });
});

describe("isPublicPath", () => {
  it("treats /login and its siblings as public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/forgot-password")).toBe(true);
    expect(isPublicPath("/reset-password")).toBe(true);
  });

  it("treats admin pages as protected, including look-alike prefixes", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/clients/42")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});
