"use client";

import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { StatsCard } from "@/components/portal/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/portal/ui/tabs";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  DoorOpen,
  LockKeyhole,
  MessageSquare,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { useEffect, useMemo, useState } from "react";
import {
  useGetDashboardRecentFacilitiesQuery,
  useGetDashboardSummaryQuery,
} from "@/store/slices/dashboardApiSlice";
import { useGetEnquiriesQuery } from "@/store/slices/enquiryApiSlice";
import { useGetQuotationsQuery } from "@/store/slices/quotationApiSlice";
import { FacilityUtilityAuditProgress } from "@/components/portal/shared/facility/[auditType]/[facilityId]/_components/facility-utility-audit-progress";
import { facilityPath } from "@/components/portal/lib/facilityRoutes";
import { filterEnquiriesForUser } from "@/components/portal/lib/enquiryAccess";
import { activePipelineEnquiries } from "@/components/portal/lib/enquiryAnalytics";
import { countFollowUpQueues } from "@/components/portal/lib/enquiryFollowUps";
import { DashboardEnquiryWidget } from "@/components/portal/shared/dashboard/dashboard-enquiry-widget";
import { DashboardFollowUpsWidget } from "@/components/portal/shared/dashboard/dashboard-follow-ups-widget";
import { DashboardQuotationWidget } from "@/components/portal/shared/dashboard/dashboard-quotation-widget";

type DashboardTab = "facilities" | "enquiries" | "follow-ups" | "quotations";

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
  const [activeTab, setActiveTab] = useState<DashboardTab>("facilities");

  const { data: summaryResponse, isLoading: summaryLoading } =
    useGetDashboardSummaryQuery();

  const { data: recentFacilitiesResponse, isLoading: recentFacilitiesLoading } =
    useGetDashboardRecentFacilitiesQuery({ limit: 6 });

  const { data: enquiriesResponse } = useGetEnquiriesQuery();
  const { data: quotationsResponse } = useGetQuotationsQuery(undefined, {
    skip: user?.role === "auditor",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const dashboardStats = summaryResponse?.data;
  const recentFacilities = (recentFacilitiesResponse?.data ?? [])
    .filter((item) => !isFacilityAuditClosed(item.facility))
    .slice(0, 6);
  const showQuotationWidget = user?.role !== "auditor";

  const enquiries = useMemo(
    () => filterEnquiriesForUser(enquiriesResponse?.data ?? [], user),
    [enquiriesResponse?.data, user],
  );
  const pipelineEnquiries = useMemo(
    () => activePipelineEnquiries(enquiries),
    [enquiries],
  );
  const followUpCounts = useMemo(
    () => countFollowUpQueues(pipelineEnquiries),
    [pipelineEnquiries],
  );
  const quotationCount = quotationsResponse?.data?.length ?? 0;

  if (!mounted) return null;

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Welcome back, ${user?.name || "User"}`}
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as DashboardTab)}
        className="space-y-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger
            value="facilities"
            className="gap-1.5 px-3 py-2 text-xs sm:text-sm"
          >
            <Building2 className="h-3.5 w-3.5" />
            Facilities
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {dashboardStats?.openFacilities ?? 0}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="enquiries"
            className="gap-1.5 px-3 py-2 text-xs sm:text-sm"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Enquiries
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {enquiries.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="follow-ups"
            className="gap-1.5 px-3 py-2 text-xs sm:text-sm"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Follow-ups
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {followUpCounts.today + followUpCounts.overdue}
            </span>
          </TabsTrigger>
          {showQuotationWidget ? (
            <TabsTrigger
              value="quotations"
              className="gap-1.5 px-3 py-2 text-xs sm:text-sm"
            >
              <Receipt className="h-3.5 w-3.5" />
              Quotations
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {quotationCount}
              </span>
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="facilities" className="mt-0 space-y-4">
          <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
            {summaryLoading ? (
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

          <Card className="min-w-0 gap-0 border-border bg-card py-0">
            <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 [.border-b]:pb-3">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base text-card-foreground">
                    Recent facilities
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
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

            <CardContent className="min-w-0 p-3 sm:p-4">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentFacilitiesLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-16 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                      </div>
                    </div>
                  ))
                ) : recentFacilities.length > 0 ? (
                  recentFacilities.map(({ facility, utilityProgress }) => {
                    const auditClosed = isFacilityAuditClosed(facility);
                    const showProgress =
                      supportsFacilityUtilityProgress(facility.audit_type) &&
                      Boolean(utilityProgress);
                    return (
                      <Link
                        key={facility._id}
                        href={facilityPath(facility.audit_type, facility._id)}
                        className="group flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                              {facility.name}
                            </h3>
                            {facility.audit_number ? (
                              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/75">
                                {facility.audit_number}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize leading-none text-muted-foreground">
                            {facility.facility_type || "Facility"}
                          </span>
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="truncate text-xs text-muted-foreground">
                              {facility.city || "Unknown city"}
                            </p>
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
                              {facility.audit_type ? (
                                <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium leading-none text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 sm:text-xs">
                                  {facility.audit_type}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {showProgress ? (
                            <div
                              className="shrink-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <FacilityUtilityAuditProgress
                                compact
                                size={36}
                                strokeWidth={3}
                                summary={utilityProgress ?? undefined}
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
        </TabsContent>

        <TabsContent value="enquiries" className="mt-0">
          <DashboardEnquiryWidget />
        </TabsContent>

        <TabsContent value="follow-ups" className="mt-0">
          <DashboardFollowUpsWidget />
        </TabsContent>

        {showQuotationWidget ? (
          <TabsContent value="quotations" className="mt-0">
            <DashboardQuotationWidget />
          </TabsContent>
        ) : null}
      </Tabs>
    </DashboardLayout>
  );
}
