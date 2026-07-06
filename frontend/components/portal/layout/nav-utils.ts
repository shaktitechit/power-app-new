import { navItems as superAdminNav } from "@/components/portal/super-admin/nav";
import { navItems as adminNav } from "@/components/portal/admin/nav";
import { navItems as managerNav } from "@/components/portal/manager/nav";
import { navItems as auditorNav } from "@/components/portal/auditor/nav";
import type { NavItem } from "./nav-types";

/** Maps a backend role string to its portal's sidebar nav items. */
export const ROLE_NAV_MAP: Record<string, NavItem[]> = {
  super_admin: superAdminNav,
  admin: adminNav,
  manager: managerNav,
  auditor: auditorNav,
};

/** Returns the nav items for the given role (empty array if unknown). */
export function getNavItemsForRole(role?: string | null): NavItem[] {
  return ROLE_NAV_MAP[role ?? ""] ?? [];
}
