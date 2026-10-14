import { ApiError } from "@/lib/api/errors";
import type {
  CreateStaffInput,
  StaffCounts,
  StaffIndexResponse,
  StaffMember,
  StaffParams,
  StaffRoleOption,
  StaffStats,
  StaffStatus,
  UpdateStaffInput,
} from "@/types/staff";
import { assertMockPermission } from "./auth";
import { getMockRoleSnapshot } from "./roles";

// The people from design/Staff.dc.html. Kept in memory, so changes last until a full reload. Times are relative to
// when the page loads, so "Today" and "Yesterday" always make sense. The rules the real API enforces (self, last
// Super Admin) are shown by the page itself; this mock only checks the email and the permission.

const ROLE_IDS = ["super", "admin", "billing", "support", "sales"] as const;

function roleOption(id: string): StaffRoleOption {
  const role = getMockRoleSnapshot(id);
  if (!role) throw new ApiError(404, "That role doesn't exist.");
  return { id: role.id, name: role.name, description: role.description, isSuperAdmin: role.locked };
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const daysAgo = (days: number) => hoursAgo(days * 24);

type Seed = [
  name: string,
  email: string,
  role: (typeof ROLE_IDS)[number],
  status: StaffStatus,
  twoFactor: boolean,
  lastLoginAt: string | null,
  device: string | null,
  ip: string | null,
  extra?: Partial<StaffMember>,
];

const SEED: Seed[] = [
  // The mock sign-in's Super Admin has the id "staff-super", so the page can tag this row "You".
  ["Nayemul Zannat", "nayemul@everdigitech.com", "super", "active", true, hoursAgo(0.05), "Chrome on Windows", "103.112.1.10", { id: "staff-super" }],
  ["Rakibul Islam", "rakib@everdigitech.com", "admin", "active", true, hoursAgo(3), "Chrome on macOS", "103.112.1.14"],
  ["Tasnim Ferdous", "tasnim@everdigitech.com", "admin", "active", true, hoursAgo(30), "Edge on Windows", "103.112.4.80"],
  ["Shafiqul Alam", "shafiq@everdigitech.com", "billing", "active", true, hoursAgo(5), "Chrome on Windows", "103.112.1.22"],
  ["Mitu Akter", "mitu@everdigitech.com", "billing", "active", false, hoursAgo(6), "Safari on iPhone", "103.112.7.5"],
  ["Jahid Hasan", "jahid@everdigitech.com", "support", "active", true, hoursAgo(2), "Chrome on Windows", "103.112.1.9"],
  ["Sumaiya Rahman", "sumaiya@everdigitech.com", "support", "active", false, hoursAgo(4), "Chrome on Android", "45.64.200.3"],
  ["Nadia Chowdhury", "nadia@everdigitech.com", "support", "active", true, daysAgo(6), "Firefox on Windows", "103.112.1.31"],
  ["Arman Hossain", "arman@everdigitech.com", "support", "active", false, daysAgo(7), "Chrome on Windows", "27.147.9.60"],
  ["Imran Kabir", "imran@everdigitech.com", "support", "suspended", false, daysAgo(21), "Chrome on Windows", "103.112.1.77", { suspendedBy: "Nayemul Zannat" }],
  ["Rezaul Karim", "rezaul@everdigitech.com", "sales", "invited", false, null, null, null, { invitedAt: daysAgo(2) }],
];

let nextId = 100;

let staff: StaffMember[] = SEED.map(([name, email, roleId, status, twoFactor, lastLoginAt, device, ip, extra], index) => {
  const role = roleOption(roleId);
  return {
    id: `st-${index + 1}`,
    name,
    email,
    phone: null,
    avatarUrl: null,
    status,
    role: { id: role.id, name: role.name, isSuperAdmin: role.isSuperAdmin },
    invitedAt: null,
    lastLoginAt,
    lastLoginIp: ip,
    lastLoginDevice: device,
    suspendedBy: null,
    twoFactorEnabled: twoFactor,
    createdAt: daysAgo(90 - index),
    ...extra,
  };
});

const delay = () => new Promise((resolve) => setTimeout(resolve, 400));
const copy = (member: StaffMember): StaffMember => ({ ...member, role: member.role && { ...member.role } });

function findOrThrow(id: string) {
  const member = staff.find((m) => m.id === id);
  if (!member) throw new ApiError(404, "That item doesn't exist or was removed.");
  return member;
}

function counts(list: StaffMember[]): StaffCounts {
  const out: StaffCounts = { all: list.length, active: 0, invited: 0, suspended: 0 };
  for (const m of list) out[m.status] += 1;
  return out;
}

function stats(): StaffStats {
  const signedUp = staff.filter((m) => m.status === "active");
  return {
    total: staff.length,
    active: signedUp.length,
    invited: staff.filter((m) => m.status === "invited").length,
    suspended: staff.filter((m) => m.status === "suspended").length,
    twoFactorOn: signedUp.filter((m) => m.twoFactorEnabled).length,
    twoFactorOf: signedUp.length,
    roles: ROLE_IDS.length,
    activeSuperAdmins: staff.filter((m) => m.role?.isSuperAdmin && m.status !== "suspended").length,
  };
}

/** Filters, counts and pages the mock staff like GET /api/admin/staff, in the same paginated shape. */
export async function getMockStaff(params: StaffParams, pageSize: number): Promise<StaffIndexResponse> {
  await delay();
  assertMockPermission("staff.view");

  const query = params.search.trim().toLowerCase();
  const inScope = staff.filter(
    (m) =>
      (params.role === "all" || m.role?.id === params.role) &&
      (!query || `${m.name} ${m.email}`.toLowerCase().includes(query)),
  );
  const matches = params.status === "all" ? inScope : inScope.filter((m) => m.status === params.status);
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(Math.max(1, params.page), pageCount);
  const items = matches.slice((page - 1) * pageSize, page * pageSize).map(copy);
  const from = items.length ? (page - 1) * pageSize + 1 : null;

  return {
    data: items,
    meta: {
      current_page: page,
      last_page: pageCount,
      per_page: pageSize,
      total: matches.length,
      from,
      to: from === null ? null : from + items.length - 1,
      counts: counts(inScope),
      stats: stats(),
    },
  };
}

export async function getMockStaffRoles(): Promise<StaffRoleOption[]> {
  await delay();
  assertMockPermission("staff.view");
  return ROLE_IDS.map(roleOption);
}

export async function createMockStaff(data: CreateStaffInput): Promise<StaffMember> {
  await delay();
  assertMockPermission("staff.create");
  const email = data.email.trim().toLowerCase();
  if (staff.some((m) => m.email.toLowerCase() === email)) {
    throw new ApiError(422, "A staff member with this email already exists.", {
      code: "validation_failed",
      errors: { email: ["A staff member with this email already exists."] },
    });
  }
  const role = roleOption(data.role);
  const member: StaffMember = {
    id: `st-${nextId++}`,
    name: data.name.trim(),
    email,
    phone: data.phone?.trim() || null,
    avatarUrl: null,
    status: "invited",
    role: { id: role.id, name: role.name, isSuperAdmin: role.isSuperAdmin },
    invitedAt: new Date().toISOString(),
    lastLoginAt: null,
    lastLoginIp: null,
    lastLoginDevice: null,
    suspendedBy: null,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  };
  staff = [...staff, member];
  return copy(member);
}

export async function updateMockStaff(id: string, data: UpdateStaffInput): Promise<StaffMember> {
  await delay();
  assertMockPermission("staff.edit");
  const member = findOrThrow(id);
  const role = roleOption(data.role);
  const status: StaffStatus = data.status === "suspended" ? "suspended" : member.invitedAt ? "invited" : "active";
  const updated: StaffMember = {
    ...member,
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    role: { id: role.id, name: role.name, isSuperAdmin: role.isSuperAdmin },
    status,
    suspendedBy: status === "suspended" ? (member.suspendedBy ?? "You") : null,
  };
  staff = staff.map((m) => (m.id === id ? updated : m));
  return copy(updated);
}

export async function deleteMockStaff(id: string): Promise<void> {
  await delay();
  assertMockPermission("staff.delete");
  findOrThrow(id);
  staff = staff.filter((m) => m.id !== id);
}

export async function resendMockInvite(id: string): Promise<void> {
  await delay();
  assertMockPermission("staff.create");
  const member = findOrThrow(id);
  if (member.lastLoginAt) throw new ApiError(422, "This person has already signed in.", { code: "already_active" });
  staff = staff.map((m) => (m.id === id ? { ...m, invitedAt: new Date().toISOString() } : m));
}
