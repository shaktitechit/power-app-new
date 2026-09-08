import React from "react";
import { Badge } from "@/components/portal/ui/badge";
import { Building2, Briefcase, Home, Palmtree } from "lucide-react";

export const PLAN_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  visits: { label: "Site Visits", icon: Building2, color: "bg-purple-100 text-purple-700 border-purple-200" },
  work_from_office: { label: "Work From Office", icon: Briefcase, color: "bg-blue-100 text-blue-700 border-blue-200" },
  work_from_home: { label: "Work From Home", icon: Home, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  leave: { label: "On Leave", icon: Palmtree, color: "bg-amber-100 text-amber-700 border-amber-200" },
};

export const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  // Legacy
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  scheduled: "bg-purple-50 text-purple-700 border-purple-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export function renderPlanStatusBadge(status: string) {
  const color = STATUS_COLORS[status] || "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[10px] capitalize font-medium ${color}`}>
      {status ? status.replace("_", " ") : "draft"}
    </Badge>
  );
}

export function renderPlanTypeBadge(type: string) {
  const cfg = PLAN_TYPE_CONFIG[type];
  if (!cfg) return <Badge variant="outline" className="text-[11px]">Work Plan</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.color} hover:${cfg.color} gap-1 text-[11px] font-medium border`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export function formatPlanDate(dateStr?: string | Date) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

export function formatTime(dateStr?: string | Date | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Past plan dates allow structure changes only through end of planDate + 3 days. Current/future have no bar. */
export function isWorkPlanStructureWindowExpired(
  planDate?: string | Date | null,
  options?: { bypass?: boolean; now?: Date }
) {
  if (options?.bypass) return false;
  if (!planDate) return false;
  const planDayStart = new Date(planDate);
  if (isNaN(planDayStart.getTime())) return false;
  planDayStart.setHours(0, 0, 0, 0);

  const now = options?.now ? new Date(options.now) : new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (planDayStart.getTime() >= todayStart.getTime()) return false;

  const maxDate = new Date(planDayStart);
  maxDate.setDate(maxDate.getDate() + 3);
  maxDate.setHours(23, 59, 59, 999);
  return now > maxDate;
}

/** Earliest YYYY-MM-DD a non–super-admin may create/edit a plan for (today − 3 days). */
export function getMinAllowedWorkPlanDate(now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 3);
  return d.toISOString().split("T")[0];
}

/** True when planDate is earlier than today − 3 days (super admin bypass). */
export function isWorkPlanDateTooFarInPast(
  planDate?: string | Date | null,
  options?: { bypass?: boolean; now?: Date }
) {
  if (options?.bypass) return false;
  if (!planDate) return false;
  const planDayStart = new Date(planDate);
  if (isNaN(planDayStart.getTime())) return false;
  planDayStart.setHours(0, 0, 0, 0);
  const minAllowed = new Date(options?.now || new Date());
  minAllowed.setHours(0, 0, 0, 0);
  minAllowed.setDate(minAllowed.getDate() - 3);
  return planDayStart.getTime() < minAllowed.getTime();
}
