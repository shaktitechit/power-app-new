import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  ListChecks,
  CircleCheck,
  Hourglass,
  ClipboardList,
  BarChart3,
  FileText,
  Users,
  Activity,
} from "lucide-react";
import type { NavItem } from "../layout/nav-types";

/** Sidebar navigation items visible to the Super Admin portal. */
export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Facilities", href: "/facilities", icon: Building2 },
  { title: "Enquiries", href: "/enquiries", icon: MessageSquare },
  {
    title: "Pending approval",
    icon: ListChecks,
    children: [
      { title: "Submitted enquiries", href: "/submited-enquiries", icon: CircleCheck },
    ],
  },
  { title: "Audits", href: "/audits", icon: ClipboardList },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Reports", href: "/reports", icon: FileText },
  { title: "Users", href: "/users", icon: Users },
  { title: "Performance", href: "/performance", icon: Activity },
];
