import { describe, expect, it } from "vitest";
import type { StaffMember, StaffRoleOption } from "@/types/staff";
import { REASONS, assignableRoles, isLastSuperAdmin, staffActions } from "./staff-rules";

const member = (over: Partial<StaffMember> & { super?: boolean } = {}): StaffMember => ({
  id: "2",
  name: "Rakibul Islam",
  email: "rakib@everdigitech.com",
  phone: null,
  avatarUrl: null,
  status: "active",
  role: { id: over.super ? "1" : "2", name: over.super ? "Super Admin" : "Admin", isSuperAdmin: Boolean(over.super) },
  invitedAt: null,
  lastLoginAt: null,
  lastLoginIp: null,
  lastLoginDevice: null,
  suspendedBy: null,
  twoFactorEnabled: false,
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

const boss = { id: "1", isSuperAdmin: true };
const manager = { id: "9", isSuperAdmin: false };
const many = { activeSuperAdmins: 3 };
const only = { activeSuperAdmins: 1 };

describe("staffActions", () => {
  it("allows everything on an ordinary person", () => {
    const actions = staffActions(member(), manager, many);
    for (const rule of Object.values(actions)) expect(rule).toEqual({ allowed: true });
  });

  it("does not let you suspend or remove yourself, but you can still edit", () => {
    const actions = staffActions(member({ id: "9" }), manager, many);
    expect(actions.suspend).toEqual({ allowed: false, reason: REASONS.suspendSelf });
    expect(actions.remove).toEqual({ allowed: false, reason: REASONS.removeSelf });
    expect(actions.edit.allowed).toBe(true);
    expect(actions.changeRole.allowed).toBe(true);
  });

  it("protects the last active Super Admin from suspend, remove and a role change", () => {
    const actions = staffActions(member({ id: "5", super: true }), boss, only);
    expect(actions.suspend).toEqual({ allowed: false, reason: REASONS.lastSuperAdmin });
    expect(actions.remove).toEqual({ allowed: false, reason: REASONS.lastSuperAdmin });
    expect(actions.changeRole).toEqual({ allowed: false, reason: REASONS.lastSuperAdmin });
    expect(actions.edit.allowed).toBe(true);
  });

  it("explains the last-Super-Admin rule before the self rule, like the API", () => {
    const actions = staffActions(member({ id: "1", super: true }), boss, only);
    expect(actions.suspend).toEqual({ allowed: false, reason: REASONS.lastSuperAdmin });
  });

  it("lets a Super Admin act on another when more than one is active", () => {
    const actions = staffActions(member({ id: "5", super: true }), boss, { activeSuperAdmins: 2 });
    expect(actions.suspend.allowed).toBe(true);
    expect(actions.remove.allowed).toBe(true);
    expect(actions.changeRole.allowed).toBe(true);
  });

  it("only lets a Super Admin change a Super Admin account", () => {
    const actions = staffActions(member({ id: "5", super: true }), manager, many);
    for (const rule of Object.values(actions)) expect(rule).toEqual({ allowed: false, reason: REASONS.superAdminOnly });
  });

  it("does not count a suspended Super Admin as the last one", () => {
    expect(isLastSuperAdmin(member({ super: true, status: "suspended" }), only)).toBe(false);
    expect(isLastSuperAdmin(member({ super: true, status: "invited" }), only)).toBe(true);
    expect(isLastSuperAdmin(member(), only)).toBe(false);
  });
});

describe("assignableRoles", () => {
  const roles: StaffRoleOption[] = [
    { id: "1", name: "Super Admin", description: "", isSuperAdmin: true },
    { id: "2", name: "Admin", description: "", isSuperAdmin: false },
    { id: "5", name: "Sales", description: "", isSuperAdmin: false },
  ];

  it("hides Super Admin from everyone but a Super Admin", () => {
    expect(assignableRoles(roles, { isSuperAdmin: false }).map((r) => r.name)).toEqual(["Admin", "Sales"]);
    expect(assignableRoles(roles, { isSuperAdmin: true }).map((r) => r.name)).toEqual(["Super Admin", "Admin", "Sales"]);
  });

  it("keeps the role someone already has, so the form can show it", () => {
    const current = { id: "1", name: "Super Admin", isSuperAdmin: true };
    expect(assignableRoles(roles, { isSuperAdmin: false }, current).map((r) => r.name)).toEqual(["Super Admin", "Admin", "Sales"]);
  });
});
