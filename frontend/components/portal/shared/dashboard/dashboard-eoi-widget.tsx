"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CircleCheck, FileEdit, Mail, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { StatsCard } from "@/components/portal/ui/stats-card";
import { EoiStatusPill } from "@/components/portal/shared/components/eoi/eoi-status-pill";
import { eoiDashboardStats, recentEois } from "@/components/portal/lib/eoiDashboard";
import { formatDisplayDate } from "@/components/portal/lib/quotationConstants";
import { eoiEnquiryLabel, eoiRecipientLabel } from "@/components/portal/lib/eoiConstants";
import { useGetEoisQuery } from "@/store/slices/eoiApiSlice";

export function DashboardEoiWidget() {
  const { data, isLoading } = useGetEoisQuery();
  const eois = data?.data ?? [];

  const stats = useMemo(() => eoiDashboardStats(eois), [eois]);
  const recent = useMemo(() => recentEois(eois, 5), [eois]);

  return (
    <div className="space-y-3">
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
            <StatsCard title="Total EOIs" value={stats.total} icon={Mail} />
            <StatsCard title="Draft" value={stats.draft} icon={FileEdit} />
            <StatsCard title="Sent" value={stats.sent} icon={Send} />
            <StatsCard title="Accepted" value={stats.accepted} icon={CircleCheck} />
          </>
        )}
      </div>

      <Card className="min-w-0 gap-0 border-border bg-card py-0">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 [.border-b]:pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base text-card-foreground">
                Recent EOIs
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Latest expressions of interest
              </p>
            </div>
          </div>
          <Link
            href="/eois"
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent className="min-w-0 p-3 sm:p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map((row) => (
                <Link
                  key={row._id}
                  href={`/eois/${row._id}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {row.eoiRef}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {eoiRecipientLabel(row)} • {eoiEnquiryLabel(row)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <EoiStatusPill status={row.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDisplayDate(row.eoiDate)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No EOIs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
