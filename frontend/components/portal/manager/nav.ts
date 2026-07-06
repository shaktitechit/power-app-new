import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  BarChart3,
  FileText,
} from "lucide-react";
import type { NavItem } from "../layout/nav-types";

/** Sidebar navigation items visible to the Manager portal. */
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Facilities", href: "/facilities", icon: Building2 },
  { title: "Enquiries", href: "/enquiries", icon: MessageSquare },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Reports", href: "/reports", icon: FileText },
];
