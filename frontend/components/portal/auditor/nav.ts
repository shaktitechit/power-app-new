import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  BarChart3,
  Calendar,
  Wallet,
} from "lucide-react";
import type { NavItem } from "../layout/nav-types";

/** Sidebar navigation items visible to the Auditor portal. */
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Work Planner", href: "/work-planner", icon: Calendar },
  { title: "Expense Manager", href: "/expense-manager", icon: Wallet },
  { title: "Facilities", href: "/facilities", icon: Building2 },
  { title: "Enquiries", href: "/enquiries", icon: MessageSquare },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
];
