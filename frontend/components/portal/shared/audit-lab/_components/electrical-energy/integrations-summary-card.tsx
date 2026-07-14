"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/portal/ui/card";
import { Zap, Activity, Receipt, FileText, Sun, Cpu, Droplet, Wind, Thermometer, Lightbulb, Battery, Layers, Eye } from "lucide-react";
import { cn } from "@/components/portal/lib/utils";
import type { FacilityAuditEnergyUtilityNest } from "@/store/slices/auditApiSlice";

const DATASHEET_WIDGET_CONFIGS = [
  { key: "tariff", dbKey: "tariff", label: "Tariff", icon: Receipt },
  { key: "utility-billing-records", dbKey: "billing", label: "Billing", icon: FileText },
  { key: "solar-plants", dbKey: "solar", label: "Solar Plants", icon: Sun },
  { key: "dg-sets", dbKey: "dg", label: "DG Sets", icon: Zap },
  { key: "transformer", dbKey: "transformer", label: "Transformer", icon: Cpu },
  { key: "pump", dbKey: "pump", label: "Pump", icon: Droplet },
  { key: "hvac", dbKey: "hvac", label: "HVAC", icon: Wind },
  { key: "ac", dbKey: "ac", label: "AC", icon: Thermometer },
  { key: "lighting", dbKey: "lighting", label: "Lighting", icon: Lightbulb },
  { key: "street-light", dbKey: "street-light", label: "Street Light", icon: Lightbulb },
  { key: "fan", dbKey: "fan", label: "Fan", icon: Wind },
  { key: "lux", dbKey: "lux", label: "Lux", icon: Eye },
  { key: "ups", dbKey: "ups", label: "UPS", icon: Battery },
  { key: "misc", dbKey: "misc", label: "Misc", icon: Layers },
] as const;

interface IntegrationsSummaryCardProps {
  utilityAccounts: FacilityAuditEnergyUtilityNest[];
  totalSanctionedDemand: number;
  demandUnit: string;
}

export function IntegrationsSummaryCard({
  utilityAccounts,
  totalSanctionedDemand,
  demandUnit,
}: IntegrationsSummaryCardProps) {
  const datasheetCounts = DATASHEET_WIDGET_CONFIGS.map((cfg) => {
    const count = utilityAccounts.filter((nest) => {
      const accDetails = nest.utility_account as any;
      return accDetails?.dataSheet?.[cfg.dbKey]?.connected === true;
    }).length;
    return { ...cfg, count };
  });

  return (
    <Card className="-mx-4 -mt-6 sm:-mx-6 border-x-0 border-t-0 rounded-none bg-card/45 backdrop-blur-md shadow-sm border-b border-border/60">
      <CardHeader className="px-4 sm:px-6 py-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Audit DataSheet Integrations Summary
          </CardTitle>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1 border rounded px-1.5 py-0.5 bg-background/50">
            <Zap className="h-3 w-3 text-emerald-500" />
            Accounts: {utilityAccounts.length}
          </span>
          <span className="flex items-center gap-1 border rounded px-1.5 py-0.5 bg-background/50">
            <Activity className="h-3 w-3 text-emerald-500" />
            Total Demand: {totalSanctionedDemand.toLocaleString()} {demandUnit}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-2 pt-0">
        <div className="grid gap-1.5 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {datasheetCounts.map((cfg) => {
            const IconComponent = cfg.icon;
            const hasConnected = cfg.count > 0;
            return (
              <div
                key={cfg.key}
                className={cn(
                  "flex items-center justify-between rounded-md border p-1.5 text-[11px] transition-colors duration-200",
                  hasConnected
                    ? "bg-emerald-500/[0.03] border-emerald-500/25 text-emerald-800 dark:text-emerald-400"
                    : "bg-muted/10 border-border/40 text-muted-foreground/50"
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <IconComponent className={cn("h-3 w-3 shrink-0", hasConnected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/35")} />
                  <span className="font-medium truncate">{cfg.label}</span>
                </div>
                <span className={cn(
                  "font-bold px-1 py-0.2 rounded-full text-[9px] leading-none shrink-0",
                  hasConnected 
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                    : "bg-muted/50 text-muted-foreground/45"
                )}>
                  {cfg.count}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
