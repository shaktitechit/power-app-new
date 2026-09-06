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
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
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
