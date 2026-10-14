import { describe, expect, it } from "vitest";
import type { Me } from "@/types/auth";
import { hasPermission } from "./can";

const me = (permissions: Me["permissions"], isSuperAdmin = false): Me => ({
  user: { id: "1", name: "Test", email: "test@example.com" },
  role: { id: isSuperAdmin ? "super" : "support", name: isSuperAdmin ? "Super Admin" : "Support", isSuperAdmin },
  permissions,
});

describe("hasPermission", () => {
  it("is false when nobody is signed in", () => {
    expect(hasPermission(null, "clients.view")).toBe(false);
    expect(hasPermission(undefined, "clients.view")).toBe(false);
  });

  it("checks a single permission", () => {
    expect(hasPermission(me(["clients.view"]), "clients.view")).toBe(true);
    expect(hasPermission(me(["clients.view"]), "clients.edit")).toBe(false);
  });

  it("passes with any one of several permissions", () => {
    expect(hasPermission(me(["orders.create"]), ["clients.create", "orders.create"])).toBe(true);
    expect(hasPermission(me(["orders.view"]), ["clients.create", "orders.create"])).toBe(false);
  });

  it("lets Super Admin pass every check, even with an empty list", () => {
    expect(hasPermission(me([], true), "roles.delete")).toBe(true);
    expect(hasPermission(me([], true), ["anything.at_all"])).toBe(true);
  });
});
