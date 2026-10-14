import type { Client, ClientGroup, ClientStatus, ClientsIndexResponse, ClientsParams } from "@/types/clients";
import { assertMockPermission } from "./auth";

// The first 8 clients are the sample rows from design/Clients.dc.html. The rest are generated from a fixed seed
// (same list on every load) so there are exactly 1,248 clients with the design's tab counts:
// 1,102 active, 96 inactive, 50 closed.

const DESIGN_CLIENTS: Client[] = [
  { id: "cl-1", name: "Rahim Uddin", email: "rahim@example.com", company: "Uddin Traders", services: 3, domains: 5, balanceDue: 0, overdue: false, group: "regular", status: "active", joinedOn: "2024-01-12" },
  { id: "cl-2", name: "Nusrat Jahan", email: "nusrat@example.com", company: "Nusrat Bakes", services: 1, domains: 2, balanceDue: 1_450, overdue: false, group: "regular", status: "active", joinedOn: "2025-03-03" },
  { id: "cl-3", name: "Arif Hasan", email: "arif@technest.example", company: "TechNest Ltd", services: 6, domains: 14, balanceDue: 4_200, overdue: false, group: "reseller", status: "active", joinedOn: "2023-08-18" },
  { id: "cl-4", name: "Sabbir Hossain", email: "sabbir@example.com", company: null, services: 1, domains: 1, balanceDue: 0, overdue: false, group: "regular", status: "active", joinedOn: "2026-09-27" },
  { id: "cl-5", name: "Farhana Akter", email: "farhana@example.com", company: "Akter Fashion", services: 0, domains: 1, balanceDue: 1_800, overdue: true, group: "regular", status: "inactive", joinedOn: "2025-05-09" },
  { id: "cl-6", name: "Mahmudul Hasan", email: "mahmud@digicraft.example", company: "DigiCraft Agency", services: 9, domains: 22, balanceDue: 0, overdue: false, group: "vip", status: "active", joinedOn: "2022-02-02" },
  { id: "cl-7", name: "Tanvir Ahmed", email: "tanvir@example.com", company: null, services: 0, domains: 0, balanceDue: 0, overdue: false, group: "regular", status: "closed", joinedOn: "2023-11-14" },
  { id: "cl-8", name: "Sharmin Sultana", email: "sharmin@sultanaedu.example", company: "Sultana Edu", services: 2, domains: 2, balanceDue: 2_600, overdue: true, group: "regular", status: "active", joinedOn: "2024-07-21" },
];

const TOTAL = 1_248;
const STATUS_TOTALS: Record<ClientStatus, number> = { active: 1_102, inactive: 96, closed: 50 };

const FIRST = ["Rafiq", "Shakil", "Tania", "Mithila", "Imran", "Jannat", "Kamal", "Rumana", "Fahim", "Sadia", "Ashraf", "Nadia", "Habib", "Lubna", "Zahid", "Rokeya", "Tariq", "Shirin", "Mamun", "Afsana", "Nayeem", "Popy", "Sohel", "Mou"];
const LAST = ["Islam", "Rahman", "Hossain", "Ahmed", "Chowdhury", "Khan", "Akter", "Begum", "Sarker", "Mia", "Talukder", "Siddique"];
const COMPANIES = ["Green Leaf Foods", "Bay Tech", "Dhaka Prints", "Royal Tailors", "Padma Travels", "Nirob IT", "Shapla Crafts", "Meghna Logistics", "Bloom Florist", "Swapno Studio", "Karnaphuli Agro", "Sonar Bangla Shop"];

/** Small seeded PRNG (mulberry32) so the generated clients are identical on every run. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function buildClients(): Client[] {
  const rand = seeded(1248);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)] as T;

  // Exact status counts for the generated rows, then shuffled.
  const designCounts = DESIGN_CLIENTS.reduce<Record<ClientStatus, number>>(
    (acc, c) => ({ ...acc, [c.status]: acc[c.status] + 1 }),
    { active: 0, inactive: 0, closed: 0 },
  );
  const statuses: ClientStatus[] = (Object.keys(STATUS_TOTALS) as ClientStatus[]).flatMap((s) =>
    Array<ClientStatus>(STATUS_TOTALS[s] - designCounts[s]).fill(s),
  );
  for (let i = statuses.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j] as ClientStatus, statuses[i] as ClientStatus];
  }

  const generated = statuses.map((status, i): Client => {
    const first = pick(FIRST);
    const last = pick(LAST);
    const services = status === "closed" ? 0 : Math.floor(rand() * 8);
    const hasDue = status !== "closed" && rand() < 0.3;
    const groupRoll = rand();
    const group: ClientGroup = groupRoll < 0.8 ? "regular" : groupRoll < 0.95 ? "reseller" : "vip";
    const year = 2019 + Math.floor(rand() * 8);
    const month = 1 + Math.floor(rand() * (year === 2026 ? 9 : 12));
    const day = 1 + Math.floor(rand() * 28);
    return {
      id: `cl-${i + DESIGN_CLIENTS.length + 1}`,
      name: `${first} ${last}`,
      email: `${first}.${last}${i + 9}@example.com`.toLowerCase(),
      company: rand() < 0.6 ? pick(COMPANIES) : null,
      services,
      domains: services + Math.floor(rand() * 4),
      balanceDue: hasDue ? (10 + Math.floor(rand() * 170)) * 50 : 0,
      overdue: hasDue && rand() < 0.4,
      group,
      status,
      joinedOn: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    };
  });

  return [...DESIGN_CLIENTS, ...generated].slice(0, TOTAL);
}

const ALL_CLIENTS = buildClients();

/** Filters, counts and pages the mock clients like GET /api/admin/clients, in the same paginated shape. */
export async function getMockClients(params: ClientsParams, pageSize: number): Promise<ClientsIndexResponse> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  assertMockPermission("clients.view");

  const query = params.search.trim().toLowerCase();
  const matchesGroupAndSearch = ALL_CLIENTS.filter(
    (c) =>
      (params.group === "all" || c.group === params.group) &&
      (!query || `${c.name} ${c.email} ${c.company ?? ""}`.toLowerCase().includes(query)),
  );

  const counts = { all: matchesGroupAndSearch.length, active: 0, inactive: 0, closed: 0 };
  for (const c of matchesGroupAndSearch) counts[c.status] += 1;

  const matches = params.status === "all" ? matchesGroupAndSearch : matchesGroupAndSearch.filter((c) => c.status === params.status);
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(Math.max(1, params.page), pageCount);

  const items = matches.slice((page - 1) * pageSize, page * pageSize);
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
      counts,
    },
  };
}
