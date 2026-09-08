"use client";

import React from "react";
import { Card, CardContent } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { ClipboardList, CheckCircle2, AlertCircle, CheckCheck, XCircle } from "lucide-react";
import { useGetWorkPlannerDashboardQuery } from "@/store/slices/workPlannerApiSlice";

export function WorkPlannerStatsWidgets() {
  const { data, isLoading } = useGetWorkPlannerDashboardQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  const plans = data?.plans || {};
  const tasks = data?.tasks || {};

  const statCards = [
    { label: "Total Plans", value: data?.totalPlans || 0, icon: ClipboardList, color: "text-primary", bg: "bg-primary/10" },
    { label: "Planned", value: (plans.planned || 0) + (plans.approved || 0) + (plans.active || 0) + (plans.draft || 0) + (plans.submitted || 0), icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: "Completed Plans", value: plans.completed || 0, icon: CheckCheck, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Cancelled Plans", value: plans.cancelled || 0, icon: XCircle, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-950/40" },
    { label: "Overdue Tasks", value: tasks.overdue || 0, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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
