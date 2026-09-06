"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  IndianRupee,
  Receipt,
  User,
  ArrowRight,
  FileText,
  CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { StatsCard } from "@/components/portal/ui/stats-card";
import { Button } from "@/components/portal/ui/button";
import {
  useGetExpenseDashboardQuery,
  useGetExpensesQuery,
  type Expense,
} from "@/store/slices/expenseManagerApiSlice";
import { useAppSelector } from "@/store/hooks";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/20",
  submitted: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400",
  under_review: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400",
  reimbursed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DashboardExpensesWidget() {
  const user = useAppSelector((state) => state.auth.user);
  const rolePrefix = user?.role ? `/${user.role.replace("_", "-")}` : "";

  const [filterView, setFilterView] = useState<"today" | "all">("today");

  const { data: dashboardData, isLoading: statsLoading } = useGetExpenseDashboardQuery();
  const { data: todayExpensesData, isLoading: todayLoading } = useGetExpensesQuery({ tab: "today", limit: 6 });
  const { data: recentExpensesData, isLoading: recentLoading } = useGetExpensesQuery({ limit: 6 });

  const isLoading = statsLoading || todayLoading || recentLoading;

  const todayExpenses = todayExpensesData?.expenses || [];
  const recentExpenses = recentExpensesData?.expenses || [];

  const todayTotalAmount = todayExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const todayCount = todayExpensesData?.total ?? 0;
  const totalCount = recentExpensesData?.total ?? 0;

  const s = dashboardData?.summary || {};
  const totalAmount = dashboardData?.totalAmount ?? 0;
  const pendingCount = (s.submitted?.count || 0) + (s.under_review?.count || 0);
  const approvedCount = s.approved?.count || 0;

  const displayExpenses = filterView === "today" ? todayExpenses : recentExpenses;
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
              title="Today's Expense Total"
              value={formatCurrency(todayTotalAmount)}
              icon={Receipt}
              description={`${todayCount} expense${todayCount !== 1 ? "s" : ""} logged today`}
            />
            <StatsCard
              title="Total Expense Amount"
              value={formatCurrency(totalAmount)}
              icon={IndianRupee}
              description="Logged across organization"
            />
            <StatsCard
              title="Pending Approval"
              value={pendingCount}
              icon={Clock}
              description="Submitted for verification"
            />
            <StatsCard
              title="Approved Expenses"
              value={approvedCount}
              icon={CheckCircle2}
              description="Verified & approved"
            />
          </>
        )}
      </div>

      {/* Main List Container */}
      <Card className="min-w-0 gap-0 border-border bg-card py-0">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 [.border-b]:pb-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base text-card-foreground">
                Expenses
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {filterView === "today" ? "Expenses recorded for today" : "All recent expense records & status tracking"}
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
                All Recent ({totalCount})
              </button>
            </div>

            <Link
              href={`${rolePrefix}/expense-manager`}
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
            ) : displayExpenses.length > 0 ? (
              displayExpenses.map((expense: Expense) => {
                const dateStr = expense.expenseDate
                  ? new Date(expense.expenseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "N/A";

                return (
                  <Link
                    key={expense._id}
                    href={`${rolePrefix}/expense-manager`}
                    className="group flex min-w-0 flex-col justify-between gap-2.5 rounded-xl border border-border bg-muted/20 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                            {formatCategory(expense.category)}
                          </span>
                          <h3 className="line-clamp-1 text-sm font-semibold leading-snug text-foreground group-hover:text-primary mt-1">
                            {expense.description || "Expense Record"}
                          </h3>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border capitalize leading-none ${
                            STATUS_COLORS[expense.status] || STATUS_COLORS.draft
                          }`}
                        >
                          {expense.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground truncate">
                          <User className="h-3 w-3 shrink-0" />
                          {expense.employeeId?.name || "Employee"}
                        </span>
                        <span className="font-bold text-foreground">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{dateStr}</span>
                      {expense.receiptUrl ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <FileText className="h-3 w-3" /> Receipt Attached
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">No receipt</span>
                      )}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">
                  {filterView === "today" ? "No expenses logged for today." : "No expenses found."}
                </p>
                {filterView === "today" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setFilterView("all")}
                  >
                    View All Expenses
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
