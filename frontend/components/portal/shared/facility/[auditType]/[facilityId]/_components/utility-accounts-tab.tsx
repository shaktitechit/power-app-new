"use client";

import {
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
        <Card className="gap-0 border-border bg-card py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base text-card-foreground">Utility Accounts</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
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
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card
                  key={i}
                  className="flex min-w-0 flex-col gap-2 overflow-hidden border-border bg-card py-0"
                >
                  <div className="flex flex-col gap-2 p-3">
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
                </Card>
              ))}
            </div>
          ) : paginatedUtilityAccounts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-0 rounded-xl border border-dashed border-border bg-card py-0 p-8 text-center">
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
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                    : null;
                const includedSections = filterIncludedDataSheetSections(
                  row.dataSheet,
                );

                return (
                  <Card
                    key={row._id}
                    onClick={() => onConnectionClick(row)}
                    className="group relative flex min-w-0 cursor-pointer flex-col gap-0 overflow-hidden border-border bg-card py-0 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 flex-col gap-2 p-3">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            className="truncate text-sm font-semibold leading-snug text-foreground group-hover:text-primary"
                            title={row.account_number}
                          >
                            {row.account_number}
                          </h3>
                          {row.location ? (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {row.location}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize leading-none text-muted-foreground">
                          {row.connection_type}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {demandText || row.provider ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {[demandText, row.provider].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium leading-none sm:text-xs ${
                                auditCompleted
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              }`}
                            >
                              {auditCompleted ? "Completed" : "Pending"}
                            </span>
                            {row.category ? (
                              <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium leading-none text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 sm:text-xs">
                                {row.category}
                              </span>
                            ) : null}
                            {includedSections.length > 0 ? (
                              <div
                                className="flex flex-wrap items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {includedSections.map((section) => {
                                  const Icon = section.icon;
                                  return (
                                    <div
                                      key={section.key}
                                      title={`${section.label} included`}
                                      className={cn(
                                        "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                                        section.activeClass,
                                      )}
                                    >
                                      <Icon className="h-3 w-3" />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CircularProgress
                            percentage={percentage}
                            size={36}
                            strokeWidth={3}
                            className="shrink-0"
                            breakdown={breakdown}
                          />
                        </div>
                      </div>

                      {showUtilityActions ? (
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canUpdateUtilityAccount ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Edit utility account"
                              onClick={(e) => onEditUtilityAccount(e, row)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          ) : null}
                          {canDeleteUtilityAccount ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Delete utility account"
                              onClick={(e) => onDeleteUtilityAccount(e, row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
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
        <Card className="gap-0 border-border bg-card py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base text-card-foreground">Utility Accounts</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
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
