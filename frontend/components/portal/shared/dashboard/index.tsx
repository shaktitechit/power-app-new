"use client";

import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { StatsCard } from "@/components/portal/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { StatusBadge } from "@/components/portal/ui/status-badge";
import {
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  LockKeyhole,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useEffect, useState } from "react";
import {
  useGetDashboardRecentFacilitiesQuery,
  useGetDashboardSummaryQuery,
} from "@/store/slices/dashboardApiSlice";
import { FacilityUtilityAuditProgress } from "@/components/portal/shared/facility/[auditType]/[facilityId]/_components/facility-utility-audit-progress";
import { formatRelativeTime } from "@/components/portal/layout/header-utils";
import { facilityPath } from "@/components/portal/lib/facilityRoutes";

function isFacilityAuditClosed(facility: {
  audit_closure?: { closed_at?: string };
}): boolean {
  return Boolean(facility.audit_closure?.closed_at);
}

function supportsFacilityUtilityProgress(auditType?: string): boolean {
  return (
    auditType === "Electrical Energy Audit" ||
    auditType === "Electrical Safety Audit"
  );
}

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [mounted, setMounted] = useState(false);

  const { data: summaryResponse, isLoading: summaryLoading } =
    useGetDashboardSummaryQuery();

  const { data: recentFacilitiesResponse, isLoading: recentFacilitiesLoading } =
    useGetDashboardRecentFacilitiesQuery({ limit: 6 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const dashboardStats = summaryResponse?.data;
  const recentFacilities = recentFacilitiesResponse?.data ?? [];

  if (!mounted) return null;

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Welcome back, ${user?.name || "User"}`}
    >
      <div className="mb-6 grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4 lg:p-6">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg sm:h-12 sm:w-12" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-12" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Open Facilities"
              value={dashboardStats?.openFacilities ?? 0}
              icon={DoorOpen}
              description="Audit still in progress"
            />
            <StatsCard
              title="Closed Facilities"
              value={dashboardStats?.closedFacilities ?? 0}
              icon={LockKeyhole}
              description="Audit closure completed"
            />
            <StatsCard
              title="Completed Utility Accounts"
              value={dashboardStats?.completedUtilityAccounts ?? 0}
              icon={CheckCircle2}
              description="Final audit submitted"
            />
            <StatsCard
              title="Pending Utility Accounts"
              value={dashboardStats?.pendingUtilityAccounts ?? 0}
              icon={Clock}
              description="Awaiting completion"
            />
          </>
        )}
      </div>

      <Card className="min-w-0 border-border bg-card">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg text-card-foreground">
                Recent facilities
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest updates across your portfolio
              </p>
            </div>
          </div>
          <Link
            href="/facilities"
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>

        <CardContent className="min-w-0 pt-6">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {recentFacilitiesLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-[8.5rem] min-w-0 flex-col rounded-xl border border-border bg-muted/20 p-3 sm:min-h-0 sm:p-4"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))
            ) : recentFacilities.length > 0 ? (
              recentFacilities.map(({ facility, utilityProgress }) => {
                const auditClosed = isFacilityAuditClosed(facility);
                return (
                  <Link
                    key={facility._id}
                    href={facilityPath(facility.audit_type, facility._id)}
                    className="group flex min-h-[8.5rem] min-w-0 flex-col rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 sm:min-h-0 sm:p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary sm:text-base">
                          {facility.name}
                        </h3>
                        <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
                          {facility.city || "Unknown city"}
                        </p>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <StatusBadge
                          status={
                            (facility.status as "active" | "inactive") || "active"
                          }
                        />
                        <span
                          title={
                            auditClosed
                              ? "Facility audit closed"
                              : "Facility audit open"
                          }
                          className={`inline-flex max-w-full rounded-full px-2 py-0.5 text-[10px] font-medium leading-none sm:max-w-none sm:text-xs ${
                            auditClosed
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          }`}
                        >
                          <span className="truncate sm:whitespace-normal">
                            {auditClosed ? "Audit closed" : "Audit open"}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 min-w-0 space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:mt-4 sm:text-sm">
                      <p className="truncate capitalize">
                        {facility.facility_type || "Facility"}
                      </p>
                      <div className="flex min-w-0 items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 truncate">
                          Updated{" "}
                          {formatRelativeTime(
                            facility.updatedAt || facility.createdAt,
                          )}
                        </span>
                      </div>
                      {supportsFacilityUtilityProgress(facility.audit_type) &&
                      utilityProgress ? (
                        <div
                          className="pt-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <FacilityUtilityAuditProgress
                            size={36}
                            strokeWidth={3}
                            summary={utilityProgress}
                          />
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="col-span-full text-sm text-muted-foreground">
                No facilities found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
