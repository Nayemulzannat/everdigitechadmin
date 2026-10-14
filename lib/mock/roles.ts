import { allPermissionKeys, normalizePermissions, type PermissionKey, type PermissionModule } from "@/lib/permissions";
import type { CreateRoleInput, Role, UpdateRoleInput } from "@/types/roles";
import { assertMockPermission } from "./auth";

// Modules, roles and default grants from design/Roles.dc.html. Kept in memory, so edits last until a full reload.

const CRUD: PermissionModule["actions"] = ["view", "create", "edit", "delete"];

export const MOCK_MODULES: PermissionModule[] = [
  { key: "clients", label: "Clients", description: "Profiles, contacts and notes", actions: CRUD, special: { action: "login_as", label: "Log in as client" } },
  { key: "orders", label: "Orders", description: "New orders and fraud checks", actions: CRUD, special: { action: "approve", label: "Approve or cancel" } },
  { key: "invoices", label: "Invoices", description: "Billing, credit notes, quotes", actions: CRUD, special: { action: "refund", label: "Issue refunds" } },
  { key: "payments", label: "Payments", description: "Transactions and gateways", actions: ["view", "create", "edit"], special: { action: "approve", label: "Approve manual payments" } },
  { key: "services", label: "Hosting services", description: "Accounts on cPanel and other panels", actions: CRUD, special: { action: "server_login", label: "Server sign-in" } },
  { key: "domains", label: "Domains", description: "Registrations, renewals, transfers", actions: CRUD, special: { action: "dns", label: "DNS and EPP codes" } },
  { key: "servers", label: "Servers", description: "Servers, groups and API keys", actions: CRUD, special: null },
  { key: "products", label: "Products & pricing", description: "Packages, TLD prices, coupons", actions: CRUD, special: null },
  { key: "tickets", label: "Support tickets", description: "Replies, departments, canned replies", actions: CRUD, special: { action: "assign", label: "Assign to staff" } },
  { key: "reports", label: "Reports", description: "Income, growth and staff reports", actions: ["view"], special: { action: "export", label: "Export data" } },
  { key: "staff", label: "Staff", description: "Staff accounts and sign-in history", actions: CRUD, special: null },
  { key: "roles", label: "Roles & permissions", description: "This page", actions: CRUD, special: null },
  { key: "settings", label: "Settings", description: "Company, email, automation", actions: ["view", "edit"], special: null },
];

const ALL = allPermissionKeys(MOCK_MODULES);
const grant = (keys: string[]) => normalizePermissions(MOCK_MODULES, keys);

let roles: Role[] = [
  { id: "super", name: "Super Admin", description: "Full control, including staff and roles.", locked: true, staffCount: 1, permissions: ALL },
  {
    id: "admin",
    name: "Admin",
    description: "Runs the business day to day, without staff or settings.",
    locked: false,
    staffCount: 2,
    permissions: ALL.filter((k) => !/^(staff|roles)\./.test(k) && k !== "settings.edit"),
  },
  {
    id: "billing",
    name: "Billing Manager",
    description: "Invoices, payments, refunds and orders.",
    locked: false,
    staffCount: 2,
    permissions: grant([
      "clients.view", "orders.view", "orders.edit", "orders.approve", "invoices.view", "invoices.create", "invoices.edit",
      "invoices.delete", "invoices.refund", "payments.view", "payments.create", "payments.edit", "payments.approve",
      "reports.view", "reports.export",
    ]),
  },
  {
    id: "support",
    name: "Support Staff",
    description: "Answers tickets and helps with hosting and domains.",
    locked: false,
    staffCount: 5,
    permissions: grant([
      "clients.view", "services.view", "services.server_login", "domains.view", "domains.dns",
      "tickets.view", "tickets.create", "tickets.edit", "tickets.assign",
    ]),
  },
  {
    id: "sales",
    name: "Sales",
    description: "Creates clients and orders, sees products.",
    locked: false,
    staffCount: 1,
    permissions: grant(["clients.view", "clients.create", "clients.edit", "orders.view", "orders.create", "products.view", "tickets.view"]),
  },
];

const delay = () => new Promise((resolve) => setTimeout(resolve, 400));
const copy = (role: Role): Role => ({ ...role, permissions: [...role.permissions] });

function findOrThrow(id: string) {
  const role = roles.find((r) => r.id === id);
  if (!role) throw new Error("This role no longer exists.");
  return role;
}

function assertNameFree(name: string, exceptId?: string) {
  const taken = roles.some((r) => r.id !== exceptId && r.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (taken) throw new Error(`A role called "${name.trim()}" already exists.`);
}

/** Current state of a role, without delay. Used by mock sign-in to look up permissions. */
export function getMockRoleSnapshot(id: string): Role | null {
  const role = roles.find((r) => r.id === id);
  return role ? copy(role) : null;
}

export async function getMockPermissions(): Promise<PermissionModule[]> {
  await delay();
  assertMockPermission("roles.view");
  return MOCK_MODULES.map((m) => ({ ...m, actions: [...m.actions] }));
}

export async function getMockRoles(): Promise<Role[]> {
  await delay();
  assertMockPermission("roles.view");
  return roles.map(copy);
}

export async function updateMockRole(id: string, data: UpdateRoleInput): Promise<Role> {
  await delay();
  assertMockPermission("roles.edit");
  const role = findOrThrow(id);
  if (role.locked) throw new Error(`${role.name} can't be changed.`);
  assertNameFree(data.name, id);
  const updated: Role = {
    ...role,
    name: data.name.trim(),
    description: data.description.trim(),
    permissions: normalizePermissions(MOCK_MODULES, data.permissions) as PermissionKey[],
  };
  roles = roles.map((r) => (r.id === id ? updated : r));
  return copy(updated);
}

export async function createMockRole(data: CreateRoleInput): Promise<Role> {
  await delay();
  assertMockPermission("roles.create");
  assertNameFree(data.name);
  const base = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "role";
  let id = base;
  for (let n = 2; roles.some((r) => r.id === id); n++) id = `${base}-${n}`;
  const role: Role = { id, name: data.name.trim(), description: data.description.trim(), locked: false, staffCount: 0, permissions: [] };
  roles = [...roles, role];
  return copy(role);
}

export async function deleteMockRole(id: string): Promise<void> {
  await delay();
  assertMockPermission("roles.delete");
  const role = findOrThrow(id);
  if (role.locked) throw new Error(`${role.name} can't be deleted.`);
  roles = roles.filter((r) => r.id !== id);
}
