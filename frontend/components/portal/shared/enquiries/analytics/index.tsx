"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { StatsCard } from "@/components/portal/ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { Skeleton } from "@/components/portal/ui/skeleton";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  CircleSlash,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { filterEnquiriesForUser } from "@/components/portal/lib/enquiryAccess";
import {
  activePipelineEnquiries,
  assigneeAnalyticsData,
  assigneeChartData,
  outcomeChartData,
  pipelineChartData,
  sumExpectedValue,
  type AssigneeAnalyticsRow,
} from "@/components/portal/lib/enquiryAnalytics";
import { TERMINAL_ENQUIRY_STATUSES, pipelineStatusValue } from "@/components/portal/lib/enquiryConstants";
import { formatInr } from "@/components/portal/lib/quotationConstants";
import { DataTable, type Column } from "@/components/portal/ui/data-table";
import { useGetEnquiriesQuery } from "@/store/slices/enquiryApiSlice";
import { useAppSelector } from "@/store/hooks";

const OUTCOME_COLORS = ["#059669", "#dc2626", "#64748b"];
const ASSIGNEE_STACK_COLORS = {
  Active: "hsl(var(--primary))",
  Won: "#059669",
  Other: "#94a3b8",
};

const ASSIGNEE_TABLE_COLUMNS: Column<AssigneeAnalyticsRow>[] = [
  {
    key: "assignee",
    header: "Assignee",
    render: (row) => (
      <span className="font-medium text-foreground">{row.assignee}</span>
    ),
  },
  {
    key: "count",
    header: "Total",
    className: "text-right tabular-nums",
    render: (row) => row.count,
  },
  {
    key: "active",
    header: "Active",
    className: "text-right tabular-nums",
    hideOnMobile: true,
    render: (row) => row.active,
  },
  {
    key: "won",
    header: "Won",
    className: "text-right tabular-nums",
    hideOnMobile: true,
    render: (row) => row.won,
  },
  {
    key: "other",
    header: "Lost / dropped",
    className: "text-right tabular-nums",
    hideOnMobile: true,
    render: (row) => row.other,
  },
  {
    key: "value",
    header: "Expected value",
    className: "text-right tabular-nums",
    render: (row) => formatInr(row.value),
  },
];

type AssigneeTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: {
      assignee?: string;
      Active?: number;
      Won?: number;
      Other?: number;
      value?: number;
    };
  }>;
};

function AssigneeAnalyticsTooltip({ active, payload }: AssigneeTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const total = (row.Active ?? 0) + (row.Won ?? 0) + (row.Other ?? 0);

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{row.assignee}</p>
      <p className="mt-1 text-muted-foreground">Total: {total}</p>
      <p className="text-muted-foreground">Active: {row.Active ?? 0}</p>
      <p className="text-muted-foreground">Won: {row.Won ?? 0}</p>
      <p className="text-muted-foreground">Lost / dropped: {row.Other ?? 0}</p>
      <p className="mt-1 font-medium text-foreground">
        Expected value: {formatInr(row.value ?? 0)}
      </p>
    </div>
  );
}

function AssigneeAnalyticsPanel({
  title,
  chartData,
  tableData,
}: {
  title: string;
  chartData: ReturnType<typeof assigneeChartData>;
  tableData: AssigneeAnalyticsRow[];
}) {
  const AssigneeTable = DataTable as typeof DataTable<AssigneeAnalyticsRow>;

  return (
    <Card className="min-w-0 border-border bg-card py-0">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="h-80">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No assignment data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="assignee"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-24}
                  textAnchor="end"
                  height={72}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip content={<AssigneeAnalyticsTooltip />} />
                <Legend />
                <Bar
                  dataKey="Active"
                  stackId="assignee"
                  fill={ASSIGNEE_STACK_COLORS.Active}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Won"
                  stackId="assignee"
                  fill={ASSIGNEE_STACK_COLORS.Won}
                />
                <Bar
                  dataKey="Other"
                  stackId="assignee"
                  fill={ASSIGNEE_STACK_COLORS.Other}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <AssigneeTable
          columns={ASSIGNEE_TABLE_COLUMNS}
          data={tableData}
          emptyMessage="No assignment data yet."
          className="border-0 bg-transparent shadow-none"
        />
      </CardContent>
    </Card>
  );
}

export default function EnquiryAnalyticsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "super_admin";
  const { data, isLoading } = useGetEnquiriesQuery();

  const enquiries = useMemo(
    () => filterEnquiriesForUser(data?.data ?? [], user),
    [data?.data, user],
  );

  const stats = useMemo(() => {
    const active = activePipelineEnquiries(enquiries);
    const won = enquiries.filter(
      (row) => pipelineStatusValue(row.enquiry_status ?? "") === "won",
    );
    const terminal = enquiries.filter((row) =>
      TERMINAL_ENQUIRY_STATUSES.has(
        pipelineStatusValue(row.enquiry_status ?? ""),
      ),
    );

    return {
      total: enquiries.length,
      active: active.length,
      won: won.length,
      terminal: terminal.length,
      pipelineValue: sumExpectedValue(active),
      wonValue: sumExpectedValue(won),
      stageData: pipelineChartData(enquiries),
      outcomeData: outcomeChartData(enquiries),
      auditorData: assigneeChartData(enquiries, "assigned_to"),
      managerData: assigneeChartData(enquiries, "assigned_manager_to"),
      adminData: assigneeChartData(enquiries, "assigned_admin_to"),
      auditorTable: assigneeAnalyticsData(enquiries, "assigned_to"),
      managerTable: assigneeAnalyticsData(enquiries, "assigned_manager_to"),
      adminTable: assigneeAnalyticsData(enquiries, "assigned_admin_to"),
    };
  }, [enquiries]);

  return (
    <DashboardLayout
      title="Enquiry analytics"
      subtitle="Pipeline volume, value, and outcomes"
    >
      <div className="mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/enquiries" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to enquiries
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
            <StatsCard
              title="Total enquiries"
              value={stats.total}
              icon={Users}
              description="In your visible pipeline"
            />
            <StatsCard
              title="Active pipeline"
              value={stats.active}
              icon={TrendingUp}
              description="Not yet won, lost, or dropped"
            />
            <StatsCard
              title="Won"
              value={stats.won}
              icon={CheckCircle2}
              description={formatInr(stats.wonValue)}
            />
            <StatsCard
              title="Active pipeline value"
              value={formatInr(stats.pipelineValue)}
              icon={BarChart3}
              description="Expected value in open stages"
            />
          </div>

          <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="min-w-0 border-border bg-card py-0">
              <CardHeader className="border-b border-border/60 px-4 py-3">
                <CardTitle className="text-base">Pipeline by stage</CardTitle>
              </CardHeader>
              <CardContent className="h-80 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.stageData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="min-w-0 border-border bg-card py-0">
              <CardHeader className="border-b border-border/60 px-4 py-3">
                <CardTitle className="text-base">Decision outcomes</CardTitle>
              </CardHeader>
              <CardContent className="h-80 p-4">
                {stats.outcomeData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No won, lost, or dropped enquiries yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.outcomeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {stats.outcomeData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {isSuperAdmin ? (
            <div className="mt-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Assignment analytics
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enquiry volume by assigned auditor, manager, and admin.
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
                <AssigneeAnalyticsPanel
                  title="By assigned auditor"
                  chartData={stats.auditorData}
                  tableData={stats.auditorTable}
                />
                <AssigneeAnalyticsPanel
                  title="By assigned manager"
                  chartData={stats.managerData}
                  tableData={stats.managerTable}
                />
                <AssigneeAnalyticsPanel
                  title="By assigned admin"
                  chartData={stats.adminData}
                  tableData={stats.adminTable}
                />
              </div>
            </div>
          ) : null}

          <Card className="mt-4 border-border bg-muted/20 py-0">
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-muted-foreground">
              <CircleSlash className="h-4 w-4 shrink-0" />
              <span>
                {stats.terminal} enquiries have reached a terminal decision stage.
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
