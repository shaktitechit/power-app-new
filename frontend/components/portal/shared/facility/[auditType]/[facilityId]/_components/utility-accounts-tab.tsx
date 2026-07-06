"use client";

import {
  ArrowRight,
  ChevronDown,
  Pencil,
  Plug,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  filterIncludedDataSheetSections,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import { mapUtilityCompletionBreakdown } from "@/components/portal/lib/electrical-audit/utility-completion-step-labels";
import { cnHideUtilityAuditEdits } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { cn } from "@/components/portal/lib/utils";
import { Button } from "@/components/portal/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/portal/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Input } from "@/components/portal/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { Skeleton } from "@/components/portal/ui/skeleton";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";
import {
  UTILITY_ACCOUNTS_PAGE_SIZE,
  isUtilityAccountAuditComplete,
  type UtilityAccountStatusFilter,
} from "./facility-utils";
import { CircularProgress } from "./circular-progress";

interface UtilityAccountsTabProps {
  facilityAuditClosed: boolean;
  isUtilityAccountComingSoonRoute: boolean;
  isUtilityAccountWorkspaceRoute: boolean;
  utilitiesLoading: boolean;
  utilityAccounts: UtilityAccount[];
  paginatedUtilityAccounts: UtilityAccount[];
  utilitySearchQuery: string;
  utilityStatusFilter: UtilityAccountStatusFilter;
  onUtilityStatusFilterChange: (filter: UtilityAccountStatusFilter) => void;
  utilityPage: number;
  utilityTotalFiltered: number;
  utilityTotalPages: number;
  canCreateUtilityAccount: boolean;
  canUpdateUtilityAccount: boolean;
  canDeleteUtilityAccount: boolean;
  onUtilitySearchChange: (query: string) => void;
  onUtilityPageChange: (page: number) => void;
  onAddUtilityAccount: () => void;
  onBulkAddUtilityAccounts: () => void;
  onEditUtilityAccount: (
    e: React.MouseEvent<HTMLButtonElement>,
    utilityAccount: UtilityAccount,
  ) => void;
  onDeleteUtilityAccount: (
    e: React.MouseEvent<HTMLButtonElement>,
    utilityAccount: UtilityAccount,
  ) => void;
  onConnectionClick: (utilityAccount: UtilityAccount) => void;
}

export function UtilityAccountsTab({
  facilityAuditClosed,
  isUtilityAccountComingSoonRoute,
  isUtilityAccountWorkspaceRoute,
  utilitiesLoading,
  utilityAccounts,
  paginatedUtilityAccounts,
  utilitySearchQuery,
  utilityStatusFilter,
  onUtilityStatusFilterChange,
  utilityPage,
  utilityTotalFiltered,
  utilityTotalPages,
  canCreateUtilityAccount,
  canUpdateUtilityAccount,
  canDeleteUtilityAccount,
  onUtilitySearchChange,
  onUtilityPageChange,
  onAddUtilityAccount,
  onBulkAddUtilityAccounts,
  onEditUtilityAccount,
  onDeleteUtilityAccount,
  onConnectionClick,
}: UtilityAccountsTabProps) {
  return (
    <div className="space-y-4">
      {isUtilityAccountComingSoonRoute ? (
        <Card className="border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-card-foreground">Utility Accounts</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-sm text-muted-foreground">
              Right now, only{" "}
              <span className="font-medium text-foreground">Electrical Energy Audit</span>{" "}
              and{" "}
              <span className="font-medium text-foreground">Electrical Safety Audit</span>{" "}
              support utility account workflows here.{" "}
              <span className="font-medium text-foreground">Thermal Audit</span> and{" "}
              <span className="font-medium text-foreground">Lightning Arrester Audit</span>{" "}
              are coming soon.
            </p>
          </CardContent>
        </Card>
      ) : isUtilityAccountWorkspaceRoute ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <h3 className="text-base font-medium text-foreground sm:text-lg">
                Utility Accounts
              </h3>
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search account, location, type, provider, flags..."
                  value={utilitySearchQuery}
                  onChange={(e) => onUtilitySearchChange(e.target.value)}
                  className="bg-input pl-9"
                />
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Select
                value={utilityStatusFilter}
                onValueChange={(value) =>
                  onUtilityStatusFilterChange(value as UtilityAccountStatusFilter)
                }
              >
                <SelectTrigger className="w-full bg-input sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              {canCreateUtilityAccount ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className={cnHideUtilityAuditEdits(
                        facilityAuditClosed,
                        "w-full shrink-0 sm:w-auto",
                      )}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Utility Account
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onAddUtilityAccount}>
                      Single account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onBulkAddUtilityAccounts}>
                      Bulk import
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>

          {utilitiesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card
                  key={i}
                  className="w-full rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex w-full max-w-md items-center gap-3">
                      <Skeleton className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
                      <div className="w-full space-y-2">
                        <Skeleton className="h-4 w-1/3 animate-pulse bg-muted" />
                        <Skeleton className="h-3.5 w-1/2 animate-pulse bg-muted" />
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-4 sm:w-auto">
                      <Skeleton className="h-8 w-24 animate-pulse bg-muted" />
                      <Skeleton className="h-8 w-24 animate-pulse bg-muted" />
                      <Skeleton className="h-8 w-16 animate-pulse bg-muted" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : paginatedUtilityAccounts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Plug className="mb-4 h-12 w-12 animate-pulse text-muted-foreground/50" />
              <h3 className="text-lg font-semibold text-foreground">
                No utility accounts found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {utilitySearchQuery.trim() || utilityStatusFilter !== "all"
                  ? "No utility accounts match your search or status filter."
                  : "No connections found for this facility. Add one to get started."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {paginatedUtilityAccounts.map((row) => {
                const auditCompleted = isUtilityAccountAuditComplete(row);

                const percentage = row.completionStats?.percentage ?? 0;
                const breakdown = mapUtilityCompletionBreakdown(
                  row.completionStats?.breakdown,
                );

                const showUtilityActions =
                  isUtilityAccountWorkspaceRoute &&
                  !facilityAuditClosed &&
                  !auditCompleted &&
                  (canUpdateUtilityAccount || canDeleteUtilityAccount);

                const hasNewDemand =
                  row.sanctioned_demand_value !== undefined &&
                  row.sanctioned_demand_value !== null;
                const demandText = hasNewDemand
                  ? `${row.sanctioned_demand_value} ${row.sanctioned_demand_unit || "kVA"}`
                  : row.sanctioned_demand_kVA != null
                    ? `${row.sanctioned_demand_kVA} kVA`
                    : "—";

                return (
                  <Card
                    key={row._id}
                    onClick={() => onConnectionClick(row)}
                    className={cn(
                      "group w-full cursor-pointer overflow-hidden rounded-xl border border-border border-l-4 bg-card p-4 transition-all duration-200 hover:shadow-md",
                      auditCompleted
                        ? "border-l-emerald-500 hover:border-l-emerald-600"
                        : "border-l-amber-500 hover:border-l-amber-600",
                    )}
                  >
                    {/* Row 1: Icon + Account name + tags */}
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Plug className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="truncate font-semibold text-foreground"
                            title={row.account_number}
                          >
                            {row.account_number}
                          </span>
                          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-foreground">
                            {row.connection_type}
                          </span>
                          {row.category ? (
                            <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                              {row.category}
                            </span>
                          ) : null}
                        </div>
                        {row.location ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {row.location}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Row 2: Demand, Provider, Section icons */}
                    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-muted/20 pt-3 text-xs text-muted-foreground">
                      <div>
                        <span className="block text-[10px] uppercase text-muted-foreground/75">Demand</span>
                        <span className="text-sm font-medium text-foreground">{demandText}</span>
                      </div>

                      {row.provider ? (
                        <div className="min-w-0">
                          <span className="block text-[10px] uppercase text-muted-foreground/75">Provider</span>
                          <span
                            className="block max-w-[140px] truncate text-sm font-medium text-foreground"
                            title={row.provider}
                          >
                            {row.provider}
                          </span>
                        </div>
                      ) : null}

                      <div
                        className="ml-auto flex flex-wrap items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {filterIncludedDataSheetSections(row.dataSheet).map(
                          (section) => {
                            const Icon = section.icon;
                            return (
                              <div
                                key={section.key}
                                title={`${section.label} included`}
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
                                  section.activeClass,
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* Row 3: Progress ring, status badge, workspace link, edit/delete */}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-muted/20 pt-3">
                      <div className="flex items-center gap-2">
                        <CircularProgress
                          percentage={percentage}
                          size={28}
                          strokeWidth={3}
                          className="shrink-0"
                          breakdown={breakdown}
                        />
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            auditCompleted
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          }`}
                        >
                          {auditCompleted ? "Completed" : "Pending"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-xs font-semibold text-primary group-hover:underline">
                          <span>Workspace</span>
                          <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>

                        {showUtilityActions ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canUpdateUtilityAccount ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => onEditUtilityAccount(e, row)}
                                className="h-7 px-2 text-xs"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            ) : null}
                            {canDeleteUtilityAccount ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => onDeleteUtilityAccount(e, row)}
                                className="h-7 px-2 text-xs"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {utilitiesLoading ? (
                "Loading utility accounts…"
              ) : utilityTotalFiltered === 0 ? (
                <>
                  {utilityAccounts.length === 0
                    ? "No utility accounts yet."
                    : "No utility accounts match your search or status filter."}
                </>
              ) : (
                <>
                  Showing {(utilityPage - 1) * UTILITY_ACCOUNTS_PAGE_SIZE + 1}–
                  {Math.min(
                    utilityPage * UTILITY_ACCOUNTS_PAGE_SIZE,
                    utilityTotalFiltered,
                  )}{" "}
                  of{" "}
                  {utilityTotalFiltered} accounts
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  utilityPage <= 1 || utilitiesLoading || utilityAccounts.length === 0
                }
                onClick={() => onUtilityPageChange(Math.max(1, utilityPage - 1))}
              >
                Previous
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground sm:text-sm">
                Page {utilityPage} of {utilityTotalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  utilityPage >= utilityTotalPages ||
                  utilitiesLoading ||
                  utilityTotalFiltered === 0
                }
                onClick={() =>
                  onUtilityPageChange(Math.min(utilityTotalPages, utilityPage + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-card-foreground">Utility Accounts</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <p className="text-sm text-muted-foreground">
              Utility account management is not available for this URL. Use an
              Electrical Energy or Electrical Safety audit facility link, or check back
              when additional audit types are supported.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
