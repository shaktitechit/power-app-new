"use client";

import React from "react";
import { Card, CardContent } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { ClipboardList, Clock, CheckCircle2, AlertCircle, FileEdit, CheckCheck } from "lucide-react";
import { useGetWorkPlannerDashboardQuery } from "@/store/slices/workPlannerApiSlice";

export function WorkPlannerStatsWidgets() {
  const { data, isLoading } = useGetWorkPlannerDashboardQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  const plans = data?.plans || {};
  const tasks = data?.tasks || {};

  const statCards = [
    { label: "Total Plans", value: data?.totalPlans || 0, icon: ClipboardList, color: "text-primary", bg: "bg-primary/10" },
    { label: "Draft Plans", value: plans.draft || 0, icon: FileEdit, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
    { label: "Pending Approvals", value: plans.submitted || 0, icon: Clock, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: "Approved / Active", value: (plans.approved || 0) + (plans.active || 0), icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Completed Plans", value: plans.completed || 0, icon: CheckCheck, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Overdue Tasks", value: tasks.overdue || 0, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {statCards.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} className="border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-2.5 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
              <p className={`text-lg font-bold leading-tight mt-0.5 ${color}`}>{value}</p>
            </div>
            <div className={`p-1.5 rounded-lg shrink-0 ${bg}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
