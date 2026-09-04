"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, CalendarClock, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { StatsCard } from "@/components/portal/ui/stats-card";
import { EnquiryStatusPill } from "@/components/portal/shared/components/enquiry/enquiry-status-pill";
import { assigneeLabel, filterEnquiriesForUser } from "@/components/portal/lib/enquiryAccess";
import {
  countFollowUpQueues,
  followUpQueueEnquiries,
} from "@/components/portal/lib/enquiryFollowUps";
import { activePipelineEnquiries } from "@/components/portal/lib/enquiryAnalytics";
import { formatDisplayDate } from "@/components/portal/lib/quotationConstants";
import { useGetEnquiriesQuery } from "@/store/slices/enquiryApiSlice";
import { useAppSelector } from "@/store/hooks";

function FollowUpList({
  title,
  items,
  tone,
}: {
  title: string;
  items: ReturnType<typeof followUpQueueEnquiries>;
  tone: "overdue" | "today";
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          Nothing due {tone === "today" ? "today" : "in this queue"}.
        </p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((row) => (
            <Link
              key={row._id}
              href={`/enquiries/${row._id}?tab=followups`}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    row.enquiry_number,
                    assigneeLabel(row.assigned_to) ?? "Unassigned auditor",
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <EnquiryStatusPill status={row.enquiry_status} />
                <span
                  className={`text-xs font-medium ${
                    tone === "overdue"
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {formatDisplayDate(row.next_followup_date)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardFollowUpsWidget() {
  const user = useAppSelector((state) => state.auth.user);
  const { data, isLoading } = useGetEnquiriesQuery();

  const enquiries = useMemo(
    () => filterEnquiriesForUser(data?.data ?? [], user),
    [data?.data, user],
  );

  const activeEnquiries = useMemo(
    () => activePipelineEnquiries(enquiries),
    [enquiries],
  );

  const queueCounts = useMemo(
    () => countFollowUpQueues(activeEnquiries),
    [activeEnquiries],
  );

  const overdue = useMemo(
    () => followUpQueueEnquiries(activeEnquiries, "overdue"),
    [activeEnquiries],
  );

  const today = useMemo(
    () => followUpQueueEnquiries(activeEnquiries, "today"),
    [activeEnquiries],
  );

  return (
    <div className="space-y-3">
      <div className="grid min-w-0 grid-cols-2 gap-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
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
              title="Due today"
              value={queueCounts.today}
              icon={CalendarDays}
              description="Active pipeline follow-ups"
            />
            <StatsCard
              title="Overdue"
              value={queueCounts.overdue}
              icon={AlertTriangle}
              description="Past follow-up date"
            />
          </>
        )}
      </div>

      <Card className="min-w-0 gap-0 border-border bg-card py-0">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 [.border-b]:pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base text-card-foreground">
                Follow-up queue
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Today and overdue enquiries needing action
              </p>
            </div>
          </div>
          <Link
            href="/enquiries/follow-ups"
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            View queue
          </Link>
        </CardHeader>
        <CardContent className="min-w-0 grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
          {isLoading ? (
            <>
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </>
          ) : (
            <>
              <FollowUpList title="Due today" items={today} tone="today" />
              <FollowUpList title="Overdue" items={overdue} tone="overdue" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
