"use client";

import { useMemo } from "react";
import type { TabItem } from "../shared/utility-account-workspace-types";
import type { EnergyAuditRecordCompletionContext } from "./use-electrical-energy-utility-account-workspace";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/portal/ui/hover-card";

interface UtilityAuditProgressProps {
  tabs: TabItem[];
  recordCompletionContext: EnergyAuditRecordCompletionContext;
}

function resolveEntityId(entityId: any): string {
  if (!entityId) return "";
  if (typeof entityId === "object") {
    return String(entityId._id ?? "");
  }
  return String(entityId);
}

export function UtilityAuditProgress({
  tabs,
  recordCompletionContext,
}: UtilityAuditProgressProps) {
  const { totalRecordsCount, completedRecordsCount, percentage, breakdown } = useMemo(() => {
    let total = 0;
    let completed = 0;
    const items: {
      label: string;
      completed: number;
      total: number;
      isDone: boolean;
    }[] = [];

    const isTabActive = (tabId: string) => tabs.some((t) => t.id === tabId);

    const {
      tariffs = [],
      billingRecords = [],
      hvacRecords = [],
      acRecords = [],
      lightingRecords = [],
      streetLightRecords = [],
      fanRecords = [],
      luxRecords = [],
      upsRecords = [],
      miscRecords = [],
      solarPlants = [],
      solarGenerationRecords = [],
      dgSets = [],
      dgAuditRecords = [],
      transformers = [],
      transformerAuditRecords = [],
      pumps = [],
      pumpAuditRecords = [],
    } = recordCompletionContext;

    // 1. TARIFF
    if (isTabActive("tarrif")) {
      const tariffTotal = tariffs.length || 1;
      const tariffCompleted = tariffs.filter((r) => r.is_completed === true).length;
      total += tariffTotal;
      completed += tariffCompleted;
      items.push({
        label: "Utility Tariff",
        completed: tariffCompleted,
        total: tariffTotal,
        isDone: tariffCompleted === tariffTotal,
      });
    }

    // 2. BILLING
    if (isTabActive("utility-billing-records")) {
      const billingTotal = billingRecords.length;
      const billingCompleted = billingRecords.filter((r) => r.is_completed === true).length;
      total += billingTotal;
      completed += billingCompleted;
      items.push({
        label: "Billing Records",
        completed: billingCompleted,
        total: billingTotal,
        isDone: billingCompleted === billingTotal && billingTotal > 0,
      });
    }

    // 3. HVAC
    if (isTabActive("hvac")) {
      const hvacTotal = hvacRecords.length;
      const hvacCompleted = hvacRecords.filter((r) => r.is_completed === true).length;
      total += hvacTotal;
      completed += hvacCompleted;
      items.push({
        label: "HVAC Audit",
        completed: hvacCompleted,
        total: hvacTotal,
        isDone: hvacCompleted === hvacTotal && hvacTotal > 0,
      });
    }

    // 4. AC
    if (isTabActive("ac")) {
      const acTotal = acRecords.length;
      const acCompleted = acRecords.filter((r) => r.is_completed === true).length;
      total += acTotal;
      completed += acCompleted;
      items.push({
        label: "AC Audit",
        completed: acCompleted,
        total: acTotal,
        isDone: acCompleted === acTotal && acTotal > 0,
      });
    }

    // 5. LIGHTING
    if (isTabActive("lighting")) {
      const lightingTotal = lightingRecords.length;
      const lightingCompleted = lightingRecords.filter((r) => r.is_completed === true).length;
      total += lightingTotal;
      completed += lightingCompleted;
      items.push({
        label: "Lighting Audit",
        completed: lightingCompleted,
        total: lightingTotal,
        isDone: lightingCompleted === lightingTotal && lightingTotal > 0,
      });
    }

    // 5.1 STREET LIGHT
    if (isTabActive("street-light")) {
      const streetLightTotal = streetLightRecords.length;
      const streetLightCompleted = streetLightRecords.filter((r) => r.is_completed === true).length;
      total += streetLightTotal;
      completed += streetLightCompleted;
      items.push({
        label: "Street Light Audit",
        completed: streetLightCompleted,
        total: streetLightTotal,
        isDone: streetLightCompleted === streetLightTotal && streetLightTotal > 0,
      });
    }

    // 6. FAN
    if (isTabActive("fan")) {
      const fanTotal = fanRecords.length;
      const fanCompleted = fanRecords.filter((r) => r.is_completed === true).length;
      total += fanTotal;
      completed += fanCompleted;
      items.push({
        label: "Fan Audit",
        completed: fanCompleted,
        total: fanTotal,
        isDone: fanCompleted === fanTotal && fanTotal > 0,
      });
    }

    // 7. LUX
    if (isTabActive("lux")) {
      const luxTotal = luxRecords.length;
      const luxCompleted = luxRecords.filter((r) => r.is_completed === true).length;
      total += luxTotal;
      completed += luxCompleted;
      items.push({
        label: "LUX Measurement",
        completed: luxCompleted,
        total: luxTotal,
        isDone: luxCompleted === luxTotal && luxTotal > 0,
      });
    }

    // 7.1 UPS
    if (isTabActive("ups")) {
      const upsTotal = upsRecords.length;
      const upsCompleted = upsRecords.filter((r) => r.is_completed === true).length;
      total += upsTotal;
      completed += upsCompleted;
      items.push({
        label: "UPS Audit",
        completed: upsCompleted,
        total: upsTotal,
        isDone: upsCompleted === upsTotal && upsTotal > 0,
      });
    }

    // 8. MISC
    if (isTabActive("misc")) {
      const miscTotal = miscRecords.length;
      const miscCompleted = miscRecords.filter((r) => r.is_completed === true).length;
      total += miscTotal;
      completed += miscCompleted;
      items.push({
        label: "Misc Audit",
        completed: miscCompleted,
        total: miscTotal,
        isDone: miscCompleted === miscTotal && miscTotal > 0,
      });
    }

    // 9. PUMPS (Entity based)
    if (isTabActive("pump")) {
      const pumpsTotal = pumps.length;
      const pumpsCompleted = pumps.filter((p) =>
        pumpAuditRecords.some(
          (r) => resolveEntityId(r.pump_id) === p._id && r.is_completed === true,
        ),
      ).length;
      total += pumpsTotal;
      completed += pumpsCompleted;
      items.push({
        label: "Pump Audit",
        completed: pumpsCompleted,
        total: pumpsTotal,
        isDone: pumpsCompleted === pumpsTotal && pumpsTotal > 0,
      });
    }

    // 10. DG SETS (Entity based)
    if (isTabActive("dg-sets")) {
      const dgTotal = dgSets.length;
      const dgCompleted = dgSets.filter((dg) =>
        dgAuditRecords.some(
          (r) => resolveEntityId(r.dg_set_id) === dg._id && r.is_completed === true,
        ),
      ).length;
      total += dgTotal;
      completed += dgCompleted;
      items.push({
        label: "DG Audit",
        completed: dgCompleted,
        total: dgTotal,
        isDone: dgCompleted === dgTotal && dgTotal > 0,
      });
    }

    // 11. TRANSFORMERS (Entity based)
    if (isTabActive("transformer")) {
      const transTotal = transformers.length;
      const transCompleted = transformers.filter((t) =>
        transformerAuditRecords.some(
          (r) => resolveEntityId(r.transformer_id) === t._id && r.is_completed === true,
        ),
      ).length;
      total += transTotal;
      completed += transCompleted;
      items.push({
        label: "Transformer Audit",
        completed: transCompleted,
        total: transTotal,
        isDone: transCompleted === transTotal && transTotal > 0,
      });
    }

    // 12. SOLAR
    if (isTabActive("solar-plants")) {
      const solarTotal = solarPlants.length * (billingRecords.length || 1);
      const solarCompleted = solarGenerationRecords.filter((r) => r.is_completed === true).length;
      total += solarTotal;
      completed += solarCompleted;
      items.push({
        label: "Solar Audit",
        completed: solarCompleted,
        total: solarTotal,
        isDone: solarCompleted === solarTotal && solarTotal > 0,
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
            Audit Checklist Details
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] leading-relaxed">
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
