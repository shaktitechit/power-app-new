"use client";

import { useMemo } from "react";
import type { TabItem } from "../shared/utility-account-workspace-types";
import type { SafetyAuditRecordCompletionContext } from "@/components/portal/lib/electrical-audit/safety-audit-preview-sheet";
import { SAFETY_AUDIT_STEP_LABELS } from "@/components/portal/lib/electrical-audit/safety-audit-workflow";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/portal/ui/hover-card";

interface SafetyAuditProgressProps {
  tabs: TabItem[];
  recordCompletionContext: SafetyAuditRecordCompletionContext;
}

export function SafetyAuditProgress({
  tabs,
  recordCompletionContext,
}: SafetyAuditProgressProps) {
  const { totalRecordsCount, completedRecordsCount, percentage, breakdown } =
    useMemo(() => {
      let total = 0;
      let completed = 0;
      const items: {
        label: string;
        completed: number;
        total: number;
        isDone: boolean;
      }[] = [];

      for (const tab of tabs) {
        if (tab.id === "details") continue;

        const records =
          recordCompletionContext[
            tab.id as keyof SafetyAuditRecordCompletionContext
          ] ?? [];
        const sectionTotal = records.length;
        const sectionCompleted = records.filter(
          (record) => record.is_completed === true,
        ).length;

        total += sectionTotal;
        completed += sectionCompleted;
        items.push({
          label: SAFETY_AUDIT_STEP_LABELS[tab.id] ?? tab.label,
          completed: sectionCompleted,
          total: sectionTotal,
          isDone: sectionCompleted === sectionTotal && sectionTotal > 0,
        });
      }

      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        totalRecordsCount: total,
        completedRecordsCount: completed,
        percentage: percent,
        breakdown: items,
      };
    }, [tabs, recordCompletionContext]);

  if (totalRecordsCount === 0) return null;

  const pendingRecordsCount = totalRecordsCount - completedRecordsCount;

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <div className="flex-shrink-0 mb-4 bg-muted/30 border border-muted/50 rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-all select-none">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-muted-foreground flex items-center gap-1.5">
              Audit Progress:
              <span className="text-foreground font-bold">{percentage}%</span>
              <span className="text-muted-foreground font-normal">
                ({completedRecordsCount}/{totalRecordsCount} records completed)
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {completedRecordsCount} Completed
              </span>
              <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                {pendingRecordsCount} Pending
              </span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground border-b pb-1.5 uppercase tracking-wide">
            Safety Audit Checklist Details
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {breakdown.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-[11px] leading-relaxed"
              >
                <span className="text-muted-foreground font-medium truncate max-w-[180px]">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {item.completed} / {item.total}
                  </span>
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      item.isDone ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
