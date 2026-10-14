import {
  Activity,
  ChartNoAxesColumnIncreasing,
  Cpu,
  FileText,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Server,
  Shield,
  ShoppingBag,
  SlidersVertical,
  Tag,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PermissionKey } from "@/types/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission needed to see the item (from the Roles catalog). Omitted for pages every staff member can open. */
  permission?: PermissionKey;
  /** Count shown as a badge, e.g. pending orders. Static for now; will come from the API. */
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** The admin sidebar, in display order. Used by the desktop sidebar, the icon rail and the mobile drawer. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Reports", href: "/reports", icon: ChartNoAxesColumnIncreasing, permission: "reports.view" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Clients", href: "/clients", icon: Users, permission: "clients.view" },
      { label: "Orders", href: "/orders", icon: ShoppingBag, permission: "orders.view", badge: 6 },
      { label: "Invoices", href: "/invoices", icon: FileText, permission: "invoices.view" },
      { label: "Hosting services", href: "/hosting", icon: Server, permission: "services.view" },
      { label: "Domains", href: "/domains", icon: Globe, permission: "domains.view" },
      { label: "Products & pricing", href: "/products", icon: Tag, permission: "products.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Servers", href: "/servers", icon: Cpu, permission: "servers.view" },
      { label: "Support tickets", href: "/tickets", icon: MessageSquare, permission: "tickets.view" },
      { label: "Activity log", href: "/activity", icon: Activity },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Staff", href: "/staff", icon: User, permission: "staff.view" },
      { label: "Roles & permissions", href: "/roles", icon: Shield, permission: "roles.view" },
      { label: "Settings", href: "/settings", icon: SlidersVertical, permission: "settings.view" },
    ],
  },
];

/** True when `pathname` is the item's page or one of its sub-pages (/clients/42 → Clients). */
export function isNavItemActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
