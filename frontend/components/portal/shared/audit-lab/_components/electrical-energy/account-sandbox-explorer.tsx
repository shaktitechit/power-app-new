"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/portal/ui/card";
import { Badge } from "@/components/portal/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/portal/ui/tabs";
import { 
  FileText, 
  Sun, 
  Cpu, 
  Droplet, 
  Receipt,
  Zap,
  Wind,
  Thermometer,
  Lightbulb,
  Battery,
  Layers,
  Eye,
  Folder,
} from "lucide-react";
import type { FacilityAuditEnergyUtilityNest } from "@/store/slices/auditApiSlice";
import { buildUtilityAuditPreviewSheetTabs } from "./lib/utility-audit-preview-sheet";

// ─── Sub-component imports ───
import { AccountSelectorPopover } from "./account-selector-popover";
import { SandboxDataTable } from "./tabs/data-table";
import { TariffTab } from "./tabs/tariff-tab";
import { BillingTab } from "./tabs/billing-tab";
import { SolarTab } from "./tabs/solar-tab";
import { DgTab } from "./tabs/dg-tab";
import { TransformerTab } from "./tabs/transformer-tab";
import { PumpTab } from "./tabs/pump-tab";
import { HvacTab } from "./tabs/hvac-tab";
import { AcTab } from "./tabs/ac-tab";
import { LightingTab } from "./tabs/lighting-tab";
import { StreetLightTab } from "./tabs/street-light-tab";
import { FanTab } from "./tabs/fan-tab";
import { LuxTab } from "./tabs/lux-tab";
import { UpsTab } from "./tabs/ups-tab";
import { MiscTab } from "./tabs/misc-tab";
import { DocumentsTab } from "./tabs/documents-tab";

const DATASHEET_TABS_CONFIG = [
  { key: "tarrif", dbKey: "tariff", label: "Tariff", icon: Receipt },
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

interface AccountSandboxExplorerProps {
  utilityAccounts: FacilityAuditEnergyUtilityNest[];
  activeAccountIndex: number;
  onSelectAccountIndex: (index: number) => void;
}

export function AccountSandboxExplorer({
  utilityAccounts,
  activeAccountIndex,
  onSelectAccountIndex,
}: AccountSandboxExplorerProps) {
  const activeAccount = activeAccountIndex === -1 ? null : (utilityAccounts[activeAccountIndex] || null);
  const activeAccDetails = activeAccount?.utility_account as any;

  // Dynamic Tabs Resolution: If -1, show any tab that is connected in at least one account
  const visibleTabs = useMemo(() => {
    if (activeAccountIndex === -1) {
      return DATASHEET_TABS_CONFIG.filter((tab) =>
        utilityAccounts.some(
          (nest) => (nest.utility_account as any)?.dataSheet?.[tab.dbKey]?.connected === true
        )
      );
    }
    const dataSheet = activeAccDetails?.dataSheet || {};
    return DATASHEET_TABS_CONFIG.filter((tab) => dataSheet[tab.dbKey]?.connected === true);
  }, [utilityAccounts, activeAccountIndex, activeAccDetails]);

  const [activeTab, setActiveTab] = useState<string>("overview");

  // Keep active tab state in sync when active account changes
  useEffect(() => {
    setActiveTab("overview");
  }, [activeAccountIndex]);

  // Construct completion context for preview builder (either for single account, or aggregate of all)
  const recordCompletionContext = useMemo(() => {
    const targetNests = activeAccountIndex === -1 ? utilityAccounts : [utilityAccounts[activeAccountIndex]].filter(Boolean);

    // Helper: check if a given nest has a specific sheet connected
    const nestConnected = (nest: FacilityAuditEnergyUtilityNest, sheetKey: string): boolean =>
      (nest.utility_account as any)?.dataSheet?.[sheetKey]?.connected === true;

    const solarPlants = targetNests
      .filter((nest) => nestConnected(nest, "solar"))
      .flatMap((nest) =>
        (nest.solar_plants || []).map((p: any) => ({ ...p, account_number: (nest.utility_account as any)?.account_number }))
      );
    const solarGenRecords = targetNests
      .filter((nest) => nestConnected(nest, "solar"))
      .flatMap((nest) =>
        (nest.solar_plants || []).flatMap((p: any) =>
          (p.solar_generation_records || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        )
      );

    const dgSets = targetNests
      .filter((nest) => nestConnected(nest, "dg"))
      .flatMap((nest) =>
        (nest.dg_sets || []).map((dg: any) => ({ ...dg, account_number: (nest.utility_account as any)?.account_number }))
      );
    const dgAuditRecords = targetNests
      .filter((nest) => nestConnected(nest, "dg"))
      .flatMap((nest) =>
        (nest.dg_sets || []).flatMap((dg: any) =>
          (dg.dg_audit_records || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        )
      );

    const transformers = targetNests
      .filter((nest) => nestConnected(nest, "transformer"))
      .flatMap((nest) =>
        (nest.transformers || []).map((t: any) => ({ ...t, account_number: (nest.utility_account as any)?.account_number }))
      );
    const transformerAuditRecords = targetNests
      .filter((nest) => nestConnected(nest, "transformer"))
      .flatMap((nest) =>
        (nest.transformers || []).flatMap((t: any) =>
          (t.transformer_audit_records || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        )
      );

    const pumps = targetNests
      .filter((nest) => nestConnected(nest, "pump"))
      .flatMap((nest) =>
        (nest.pumps || []).map((p: any) => ({ ...p, account_number: (nest.utility_account as any)?.account_number }))
      );
    const pumpAuditRecords = targetNests
      .filter((nest) => nestConnected(nest, "pump"))
      .flatMap((nest) =>
        (nest.pumps || []).flatMap((p: any) =>
          (p.pump_audit_records || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        )
      );

    return {
      tariffs: targetNests
        .filter((nest) => nestConnected(nest, "tariff"))
        .flatMap((nest) =>
          (nest.tariffs || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      billingRecords: targetNests
        .filter((nest) => nestConnected(nest, "billing"))
        .flatMap((nest) =>
          (nest.billing_records || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      solarPlants,
      solarGenerationRecords: solarGenRecords,
      dgSets,
      dgAuditRecords,
      transformers,
      transformerAuditRecords,
      pumps,
      pumpAuditRecords,
      hvacRecords: targetNests
        .filter((nest) => nestConnected(nest, "hvac"))
        .flatMap((nest) =>
          (nest.hvac_audits || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      acRecords: targetNests
        .filter((nest) => nestConnected(nest, "ac"))
        .flatMap((nest) =>
          (nest.ac_audit_records || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      lightingRecords: targetNests
        .filter((nest) => nestConnected(nest, "lighting"))
        .flatMap((nest) =>
          (nest.lighting_audits || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      streetLightRecords: targetNests
        .filter((nest) => nestConnected(nest, "street-light"))
        .flatMap((nest) =>
          ((nest as any).street_light_audits || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      fanRecords: targetNests
        .filter((nest) => nestConnected(nest, "fan"))
        .flatMap((nest) =>
          (nest.fan_audit_records || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      luxRecords: targetNests
        .filter((nest) => nestConnected(nest, "lux"))
        .flatMap((nest) =>
          (nest.lux_measurements || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      upsRecords: targetNests
        .filter((nest) => nestConnected(nest, "ups"))
        .flatMap((nest) =>
          ((nest as any).ups_audits || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
      miscRecords: targetNests
        .filter((nest) => nestConnected(nest, "misc"))
        .flatMap((nest) =>
          (nest.misc_load_audits || []).map((r: any) => ({ ...r, account_number: (nest.utility_account as any)?.account_number }))
        ),
    };
  }, [utilityAccounts, activeAccountIndex]);


  // Build the dynamic sheets representation using helper
  const previewSheetTabs = useMemo(() => {
    return buildUtilityAuditPreviewSheetTabs(
      visibleTabs.map((tab) => tab.key),
      recordCompletionContext as any
    );
  }, [visibleTabs, recordCompletionContext]);

  const overviewSheetTab = useMemo(() => {
    const targetAccounts = activeAccountIndex === -1 ? utilityAccounts : [utilityAccounts[activeAccountIndex]].filter(Boolean);

    const columns = [
      { key: "account_number", label: "Account Number" },
      { key: "location", label: "Location / Section Tag" },
      { key: "category", label: "Tariff Category" },
      { key: "provider", label: "Utility Provider" },
      { key: "billing_cycle", label: "Billing Cycle" },
      { key: "sanctioned_demand", label: "Sanctioned Demand" },
    ];

    const rows = targetAccounts.map((nest) => {
      const details = nest.utility_account as any;
      return {
        account_number: details?.account_number || "—",
        location: details?.location || "—",
        category: details?.category || "—",
        provider: details?.provider || "—",
        billing_cycle: details?.billing_cycle || "—",
        sanctioned_demand: details?.sanctioned_demand_value 
          ? `${details.sanctioned_demand_value.toLocaleString()} ${details.sanctioned_demand_unit || "kVA"}`
          : "—",
      };
    });

    return {
      stepId: "overview",
      sheetKey: "overview",
      label: "Overview",
      sections: [
        {
          id: "overview-details",
          title: activeAccountIndex === -1 ? "All Utility Connections" : "General Connection Details",
          columns,
          rows,
        }
      ],
      rowCount: rows.length,
    };
  }, [utilityAccounts, activeAccountIndex]);

  return (
    <Card className="border-border/60 bg-card/30 backdrop-blur-md shadow-sm w-full">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Utility Account Workspace
            </span>
            
            {/* Searchable Utility Account Selector */}
            <div className="max-w-md">
              <AccountSelectorPopover
                utilityAccounts={utilityAccounts}
                activeAccountIndex={activeAccountIndex}
                onSelectAccountIndex={onSelectAccountIndex}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:self-end">
            <Badge variant="outline" className="text-xs px-2.5 py-0.5">
              Provider: {activeAccountIndex === -1 ? "Multiple" : (activeAccDetails?.provider || "—")}
            </Badge>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5">
              Cycle: {activeAccountIndex === -1 ? "Multiple" : (activeAccDetails?.billing_cycle || "—")}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/40 rounded-lg max-w-full overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs py-1.5">Overview</TabsTrigger>
            {visibleTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <TabsTrigger key={tab.key} value={tab.key} className="text-xs py-1.5 flex items-center gap-1.5">
                  <IconComponent className="h-3.5 w-3.5 shrink-0" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="documents" className="text-xs py-1.5 flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 shrink-0" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4 outline-none">
            <SandboxDataTable previewTab={overviewSheetTab} />
          </TabsContent>

          {/* DYNAMIC TAB SECTIONS (TARIFF, BILLING, SOLAR, ETC) */}
          {visibleTabs.map((tabCfg) => {
            const previewTab = previewSheetTabs.find((t) => t.stepId === tabCfg.key);
            if (!previewTab) return null;

            return (
              <TabsContent key={tabCfg.key} value={tabCfg.key} className="outline-none space-y-6">
                {tabCfg.key === "tarrif" && <TariffTab previewTab={previewTab} />}
                {tabCfg.key === "utility-billing-records" && <BillingTab previewTab={previewTab} />}
                {tabCfg.key === "solar-plants" && <SolarTab previewTab={previewTab} />}
                {tabCfg.key === "dg-sets" && <DgTab previewTab={previewTab} />}
                {tabCfg.key === "transformer" && <TransformerTab previewTab={previewTab} />}
                {tabCfg.key === "pump" && <PumpTab previewTab={previewTab} />}
                {tabCfg.key === "hvac" && <HvacTab previewTab={previewTab} />}
                {tabCfg.key === "ac" && <AcTab previewTab={previewTab} />}
                {tabCfg.key === "lighting" && <LightingTab previewTab={previewTab} />}
                {tabCfg.key === "street-light" && <StreetLightTab previewTab={previewTab} />}
                {tabCfg.key === "fan" && <FanTab previewTab={previewTab} />}
                {tabCfg.key === "lux" && <LuxTab previewTab={previewTab} />}
                {tabCfg.key === "ups" && <UpsTab previewTab={previewTab} />}
                {tabCfg.key === "misc" && <MiscTab previewTab={previewTab} />}
              </TabsContent>
            );
          })}

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="space-y-4 outline-none">
            <DocumentsTab utilityAccounts={utilityAccounts} activeAccountIndex={activeAccountIndex} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
