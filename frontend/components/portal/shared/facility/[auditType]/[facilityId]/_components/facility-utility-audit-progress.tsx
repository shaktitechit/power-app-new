"use client";

import { useMemo } from "react";
import { cn } from "@/components/portal/lib/utils";
import { hasUtilityFinalAuditSubmission } from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/portal/ui/hover-card";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";
import type { FacilityUtilityProgressSummary } from "@/store/slices/dashboardApiSlice";

export type { FacilityUtilityProgressSummary };

interface FacilityUtilityAuditProgressProps {
  utilityAccounts?: UtilityAccount[];
  summary?: FacilityUtilityProgressSummary;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function summarizeFacilityUtilityProgress(utilityAccounts: UtilityAccount[]) {
  if (utilityAccounts.length === 0) {
    return {
      percentage: 0,
      completedAccounts: 0,
      totalAccounts: 0,
      breakdown: [] as { label: string; isDone: boolean; detail: string }[],
    };
  }

  let totalCompletedSections = 0;
  let totalSections = 0;

  const breakdown = utilityAccounts.map((account) => {
    const stats = account.completionStats;
    const sectionCompleted = stats?.completed ?? 0;
    const sectionTotal = stats?.total ?? 0;

    totalCompletedSections += sectionCompleted;
    totalSections += sectionTotal;

    const auditSubmitted = hasUtilityFinalAuditSubmission(
      account.audit_step_submissions,
      account,
    );
    const sectionPercentage = stats?.percentage ?? 0;

    return {
      label: account.account_number || "Unnamed account",
      isDone: auditSubmitted,
      detail: auditSubmitted
        ? "Audit submitted"
        : sectionTotal > 0
          ? `${sectionPercentage}% sections complete`
          : "Pending",
    };
  });

  const completedAccounts = breakdown.filter((item) => item.isDone).length;
  const percentage =
    totalSections > 0
      ? Math.round((totalCompletedSections / totalSections) * 100)
      : Math.round((completedAccounts / utilityAccounts.length) * 100);

  return {
    percentage,
    completedAccounts,
    totalAccounts: utilityAccounts.length,
    breakdown,
  };
}

export function FacilityUtilityAuditProgress({
  utilityAccounts = [],
  summary: summaryProp,
  size = 48,
  strokeWidth = 4,
  className,
}: FacilityUtilityAuditProgressProps) {
  const computedSummary = useMemo(() => {
    if (summaryProp) return summaryProp;
    return summarizeFacilityUtilityProgress(utilityAccounts);
  }, [summaryProp, utilityAccounts]);
  const summary = computedSummary;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (summary.percentage / 100) * circumference;

  const progressRing = (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center select-none",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90 transform" width={size} height={size}>
        <circle
          className="stroke-current text-muted/20"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn(
            "stroke-current transition-all duration-500 ease-out",
            summary.percentage === 100
              ? "text-emerald-500"
              : summary.percentage > 50
                ? "text-primary"
                : "text-amber-500",
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-foreground">
        {summary.percentage}%
      </span>
    </div>
  );

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {summary.breakdown.length === 0 ? (
        progressRing
      ) : (
        <HoverCard openDelay={150}>
          <HoverCardTrigger asChild>
            <div className="shrink-0 cursor-help">{progressRing}</div>
          </HoverCardTrigger>
          <HoverCardContent className="w-72 select-none" align="end" side="bottom">
            <div className="space-y-2">
              <div className="border-b pb-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                  Facility Utility Progress
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {summary.completedAccounts} of {summary.totalAccounts} account
                  {summary.totalAccounts === 1 ? "" : "s"} audit submitted
                </p>
              </div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {summary.breakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-2 text-[10px] leading-normal"
                  >
                    <div className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {item.label}
                      </span>
                      <span className="block text-muted-foreground">
                        {item.detail}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                        item.isDone ? "bg-emerald-500" : "bg-amber-500",
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">Utility audit progress</p>
        <p className="text-[11px] text-muted-foreground">
          {summary.completedAccounts}/{summary.totalAccounts} submitted ·{" "}
          {summary.percentage}% overall
        </p>
      </div>
    </div>
  );
}
