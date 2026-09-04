"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { DataTable, Column } from "@/components/portal/ui/data-table";
import { Button } from "@/components/portal/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import { EnquiryStatusPill } from "@/components/portal/shared/components/enquiry/enquiry-status-pill";
import { FollowUpOutcomePill } from "@/components/portal/shared/components/enquiry/follow-up-fields";
import {
  assigneeLabel,
  filterEnquiriesForUser,
} from "@/components/portal/lib/enquiryAccess";
import {
  countFollowUpQueues,
  isActivePipelineEnquiry,
  matchesFollowUpQueueTab,
  sortByNextFollowUp,
  type FollowUpQueueTab,
} from "@/components/portal/lib/enquiryFollowUps";
import { formatDisplayDate } from "@/components/portal/lib/quotationConstants";
import { type Enquiry, useGetEnquiriesQuery, useGetLatestFollowUpsQuery } from "@/store/slices/enquiryApiSlice";
import { useAppSelector } from "@/store/hooks";
import { ArrowLeft, CalendarClock, MessageSquare } from "lucide-react";

const PAGE_SIZE = 10;
const REMARKS_PREVIEW_LENGTH = 72;

function truncateRemarks(value?: string | null) {
  const text = value?.trim();
  if (!text) return null;
  if (text.length <= REMARKS_PREVIEW_LENGTH) return text;
  return `${text.slice(0, REMARKS_PREVIEW_LENGTH).trimEnd()}…`;
}

export default function EnquiryFollowUpsPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const [queueTab, setQueueTab] = useState<FollowUpQueueTab>("overdue");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetEnquiriesQuery();
  const { data: latestFollowUpsData, isLoading: isLatestFollowUpsLoading } =
    useGetLatestFollowUpsQuery();

  const latestFollowUps = latestFollowUpsData?.data ?? {};

  const enquiries = useMemo(
    () => filterEnquiriesForUser(data?.data ?? [], user),
    [data?.data, user],
  );

  const activeEnquiries = useMemo(
    () => enquiries.filter(isActivePipelineEnquiry),
    [enquiries],
  );

  const queueCounts = useMemo(
    () => countFollowUpQueues(activeEnquiries),
    [activeEnquiries],
  );

  const filtered = useMemo(() => {
    const matched = activeEnquiries.filter((row) =>
      matchesFollowUpQueueTab(row, queueTab),
    );
    return sortByNextFollowUp(matched);
  }, [activeEnquiries, queueTab]);

  const totalPages =
    filtered.length === 0 ? 1 : Math.ceil(filtered.length / PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [queueTab]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const columns: Column<Enquiry>[] = [
    {
      key: "name",
      header: "Enquiry",
      render: (row) => (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
            <MessageSquare className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground sm:text-base">
              {row.name}
            </p>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {row.city}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "enquiry_status",
      header: "Status",
      render: (row) => <EnquiryStatusPill status={row.enquiry_status} />,
    },
    {
      key: "next_followup_date",
      header: "Next follow-up",
      render: (row) => (
        <span className="text-sm font-medium text-foreground">
          {row.next_followup_date
            ? formatDisplayDate(row.next_followup_date)
            : "—"}
        </span>
      ),
    },
    {
      key: "assigned_to",
      header: "Auditor",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {assigneeLabel(row.assigned_to) ?? "—"}
        </span>
      ),
    },
    {
      key: "assigned_manager_to",
      header: "Manager",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {assigneeLabel(row.assigned_manager_to) ?? "—"}
        </span>
      ),
    },
    {
      key: "assigned_admin_to",
      header: "Admin",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {assigneeLabel(row.assigned_admin_to) ?? "—"}
        </span>
      ),
    },
    {
      key: "last_outcome",
      header: "Last outcome",
      hideOnMobile: true,
      render: (row) => {
        const latest = latestFollowUps[row._id];
        if (!latest?.outcome) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return <FollowUpOutcomePill outcome={latest.outcome} />;
      },
    },
    {
      key: "last_remarks",
      header: "Last remarks",
      hideOnMobile: true,
      render: (row) => {
        const remarks = latestFollowUps[row._id]?.remarks;
        const preview = truncateRemarks(remarks);
        if (!preview) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <span
            className="block max-w-[220px] truncate text-sm text-foreground"
            title={remarks?.trim() || undefined}
          >
            {preview}
          </span>
        );
      },
    },
  ];

  const FollowUpsTable = DataTable as typeof DataTable<Enquiry>;

  return (
    <DashboardLayout
      title="Follow-ups"
      subtitle="Upcoming and overdue enquiry follow-ups"
    >
      <div className="mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/enquiries" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to enquiries
          </Link>
        </Button>
      </div>

      <Tabs
        value={queueTab}
        onValueChange={(value) => setQueueTab(value as FollowUpQueueTab)}
        className="mb-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="overdue" className="gap-1.5 px-3 py-2 text-xs sm:text-sm">
            Overdue
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {queueCounts.overdue}
            </span>
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-1.5 px-3 py-2 text-xs sm:text-sm">
            Today
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {queueCounts.today}
            </span>
          </TabsTrigger>
          <TabsTrigger value="week" className="gap-1.5 px-3 py-2 text-xs sm:text-sm">
            This week
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {queueCounts.week}
            </span>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5 px-3 py-2 text-xs sm:text-sm">
            Later
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {queueCounts.scheduled}
            </span>
          </TabsTrigger>
          <TabsTrigger value="none" className="gap-1.5 px-3 py-2 text-xs sm:text-sm">
            No date
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {queueCounts.none}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
        <span>
          Showing active pipeline enquiries only. Open a row to log follow-up activity.
        </span>
      </div>

      <FollowUpsTable
        columns={columns}
        data={paginated}
        loading={isLoading || isLatestFollowUpsLoading}
        onRowClick={(row) => row && router.push(`/enquiries/${row._id}?tab=followups`)}
        emptyMessage={
          queueTab === "none"
            ? "All active enquiries have a next follow-up date set."
            : "No enquiries in this follow-up queue."
        }
      />

      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {filtered.length === 0
            ? "Nothing in this queue."
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                page * PAGE_SIZE,
                filtered.length,
              )} of ${filtered.length} enquiries`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span className="tabular-nums text-xs text-muted-foreground sm:text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading || filtered.length === 0}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
