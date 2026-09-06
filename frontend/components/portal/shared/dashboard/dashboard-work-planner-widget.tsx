"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ListChecks,
  Briefcase,
  User,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { StatsCard } from "@/components/portal/ui/stats-card";
import { Button } from "@/components/portal/ui/button";
import {
  useGetWorkPlannerDashboardQuery,
  useGetWorkPlansQuery,
  type WorkPlan,
} from "@/store/slices/workPlannerApiSlice";
import { useAppSelector } from "@/store/hooks";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/20",
  submitted: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400",
  approved: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400",
};

const PLAN_TYPE_LABELS: Record<string, string> = {
  visits: "Site Visits",
  work_from_office: "Work From Office",
  work_from_home: "Work From Home",
  leave: "On Leave",
};

export function DashboardWorkPlannerWidget() {
  const user = useAppSelector((state) => state.auth.user);
  const rolePrefix = user?.role ? `/${user.role.replace("_", "-")}` : "";

  const [filterView, setFilterView] = useState<"today" | "all">("today");

  const { data: dashboardStats, isLoading: statsLoading } = useGetWorkPlannerDashboardQuery();
  const { data: todayPlansData, isLoading: todayLoading } = useGetWorkPlansQuery({ tab: "today", limit: 6 });
  const { data: recentPlansData, isLoading: recentLoading } = useGetWorkPlansQuery({ limit: 6 });

  const isLoading = statsLoading || todayLoading || recentLoading;

  const todayPlans = todayPlansData?.plans || [];
  const recentPlans = recentPlansData?.plans || [];

  const summary = dashboardStats?.plans || {};
  const totalPlans = dashboardStats?.totalPlans ?? recentPlansData?.total ?? 0;
  const todayCount = todayPlansData?.total ?? 0;
  const approvedCount = summary.approved ?? 0;
  const pendingCount = (summary.submitted ?? 0) + (summary.draft ?? 0);

  const displayPlans = filterView === "today" ? todayPlans : recentPlans;
  const isDisplayLoading = filterView === "today" ? todayLoading : recentLoading;

  return (
    <div className="space-y-3">
      {/* 4 Stats Cards */}
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="gap-0 border-border bg-card py-0">
              <CardContent className="flex items-center gap-3 p-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg sm:h-10 sm:w-10" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Today's Work Plans"
              value={todayCount}
              icon={CalendarCheck}
              description="Scheduled for today"
            />
            <StatsCard
              title="Total Work Plans"
              value={totalPlans}
              icon={Calendar}
              description="Created across org"
            />
            <StatsCard
              title="Approved Plans"
              value={approvedCount}
              icon={CheckCircle2}
              description="Approved & active"
            />
            <StatsCard
              title="Pending / Draft"
              value={pendingCount}
              icon={Clock}
              description="Awaiting action"
            />
          </>
        )}
      </div>

      {/* Main List Container */}
      <Card className="min-w-0 gap-0 border-border bg-card py-0">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 [.border-b]:pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base text-card-foreground">
                Work Plans
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {filterView === "today" ? "Work plans scheduled for today" : "All recent work plans & activities"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Filter Toggles */}
            <div className="inline-flex rounded-lg border p-0.5 bg-muted/40 text-xs">
              <button
                type="button"
                onClick={() => setFilterView("today")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filterView === "today"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today ({todayCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterView("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filterView === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Recent ({totalPlans})
              </button>
            </div>

            <Link
              href={`${rolePrefix}/work-planner`}
              className="shrink-0 text-xs font-medium text-primary hover:underline flex items-center gap-1 border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-md"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>

        <CardContent className="min-w-0 p-3 sm:p-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isDisplayLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex justify-between items-center mt-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))
            ) : displayPlans.length > 0 ? (
              displayPlans.map((plan: WorkPlan) => {
                const planDate = plan.date || plan.period?.startDate;
                const dateStr = planDate ? new Date(planDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A";
                const visitsCount = plan.visits?.length || 0;
                const worksCount = plan.works?.length || 0;

                return (
                  <Link
                    key={plan._id}
                    href={`${rolePrefix}/work-planner/${plan._id}`}
                    className="group flex min-w-0 flex-col justify-between gap-2.5 rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                          {plan.title || "Work Plan"}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border capitalize leading-none ${
                            STATUS_COLORS[plan.status] || STATUS_COLORS.draft
                          }`}
                        >
                          {plan.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <User className="h-3 w-3 text-muted-foreground/70" />
                          {plan.owner?.name || "Member"}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Calendar className="h-3 w-3 text-muted-foreground/70" />
                          {dateStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 font-medium">
                        <Briefcase className="h-3 w-3 text-primary" />
                        {PLAN_TYPE_LABELS[plan.planType] || plan.planType}
                      </span>
                      <span>
                        {visitsCount > 0 ? `${visitsCount} visit${visitsCount > 1 ? "s" : ""}` : `${worksCount} task${worksCount !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">
                  {filterView === "today" ? "No work plans scheduled for today." : "No work plans found."}
                </p>
                {filterView === "today" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setFilterView("all")}
                  >
                    View All Recent Plans
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
