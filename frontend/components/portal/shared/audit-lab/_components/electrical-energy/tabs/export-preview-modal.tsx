"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/portal/ui/button";
import { Badge } from "@/components/portal/ui/badge";
import { Checkbox } from "@/components/portal/ui/checkbox";
import { Download, FileText, FileSpreadsheet, X, Printer } from "lucide-react";
import type { SheetColumn, SheetRow } from "./data-table";
import { calculateTariffKpi } from "./kpis/tarrif-kpi";
import { calculateHvacKpi } from "./kpis/hvac-kpi";
import { calculateBillingKpi } from "./kpis/billing-kpi";
import { calculateAcKpi } from "./kpis/ac-kpi";
import { calculateFanKpi } from "./kpis/fan-kpi";
import { calculateLightingKpi } from "./kpis/lighting-kpi";
import { calculateLuxKpi } from "./kpis/lux-kpi";
import { calculateMiscKpi } from "./kpis/misc-kpi";
import { calculateStreetLightKpi } from "./kpis/street-light-kpi";
import { calculateUpsKpi } from "./kpis/ups-kpi";
import { calculateSolarKpi } from "./kpis/solar-kpi";
import { calculateSolarGenerationKpi } from "./kpis/solar-generation-kpi";
import { calculateDgSetKpi } from "./kpis/dg-set-kpi";
import { calculateDgSetRecordKpi } from "./kpis/dg-set-record-kpi";
import { calculatePumpKpi } from "./kpis/pump-kpi";
import { calculatePumpRecordKpi } from "./kpis/pump-record-kpi";
import { calculateTransformerKpi } from "./kpis/transformer-kpi";
import { calculateTransformerRecordKpi } from "./kpis/transformer-record-kpi";

interface ExportPreviewModalProps {
  open: boolean;
  onClose: () => void;
  type: "pdf" | "xls";
  title: string;
  columns: SheetColumn[];
  rows: SheetRow[];
}

export function ExportPreviewModal({
  open,
  onClose,
  type,
  title,
  columns,
  rows,
}: ExportPreviewModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedIndices(new Set(rows.map((_, index) => index)));
    }
  }, [open, rows]);

  const exportRows = useMemo(
    () => rows.filter((_, index) => selectedIndices.has(index)),
    [rows, selectedIndices],
  );

  const allSelected = rows.length > 0 && selectedIndices.size === rows.length;
  const someSelected = selectedIndices.size > 0 && !allSelected;
  const hasSelection = selectedIndices.size > 0;

  const toggleRow = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIndices((prev) => {
      if (rows.length > 0 && prev.size === rows.length) {
        return new Set();
      }
      return new Set(rows.map((_, index) => index));
    });
  }, [rows]);

  if (!open) return null;

  const handleDownload = async () => {
    if (!hasSelection) return;
    setDownloading(true);
    try {
      if (type === "xls") {
        await downloadXLS(title, columns, exportRows);
      } else {
        await downloadPDF(title, columns, exportRows);
      }
    } finally {
      setDownloading(false);
      onClose();
    }
  };

  const handleDownloadWord = () => {
    if (!hasSelection) return;
    downloadWord(title, columns, exportRows);
  };

  const handlePrint = () => {
    if (!hasSelection) return;
    window.print();
  };

  return (
    <div id="export-preview-modal-root" className="fixed inset-0 z-50 flex flex-col bg-background text-foreground print:bg-white">
      {/* Header */}
      <header className="print:hidden flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {type === "pdf" ? (
              <FileText className="h-5 w-5 text-red-500" />
            ) : (
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">
              {type === "pdf" ? "PDF Export Preview" : "Excel Export Preview"}
            </h2>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px]">
            {selectedIndices.size} of {rows.length} selected · {columns.length} columns
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Preview Table */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
        <div className="hidden print:block print:px-6 print:pt-6 print:pb-3">
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedIndices.size} selected record(s) · Exported {new Date().toLocaleString()}
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border print:border-none print:overflow-visible">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead className="print:table-header-group">
              <tr className={type === "pdf" ? "bg-red-50 dark:bg-red-950/20" : "bg-emerald-50 dark:bg-emerald-950/20"}>
                <th className="print:hidden border border-border px-2 py-2 w-10 text-center">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </th>
                <th className="border border-border px-3 py-2 font-bold text-muted-foreground w-10 text-center">#</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="border border-border px-3 py-2 font-semibold text-foreground whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="border border-border px-3 py-8 text-center text-muted-foreground"
                  >
                    No records to export.
                  </td>
                </tr>
              ) : (
                rows.map((row, rIdx) => {
                  const isSelected = selectedIndices.has(rIdx);
                  return (
                  <tr
                    key={rIdx}
                    data-export-selected={isSelected ? "true" : "false"}
                    className={`export-preview-row hover:bg-muted/20 transition-colors ${
                      isSelected ? "bg-primary/5" : "opacity-50 print:hidden"
                    }`}
                  >
                    <td className="print:hidden border border-border px-2 py-2 text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRow(rIdx)}
                        aria-label={`Select row ${rIdx + 1}`}
                      />
                    </td>
                    <td className="border border-border px-3 py-2 text-center font-mono text-muted-foreground">
                      {rIdx + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="border border-border px-3 py-2 font-medium whitespace-nowrap"
                      >
                        {String(row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
                })
              )}
            </tbody>

            {/* Averages/Summary Row for Tariff sheet */}
            {(columns.some((c) => c.key === "basic_energy_charges_rs_per_unit") || title.toLowerCase().includes("tariff") || title.toLowerCase().includes("tarrif")) && exportRows.length > 0 && (() => {
              const kpi = calculateTariffKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Counts */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "effective_from") {
                        val = `Total: ${kpi.total} | Cur: ${kpi.current} | Hist: ${kpi.historical}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "basic_energy_charges_rs_per_unit") {
                        val = `Avg Cur: ₹${kpi.avgEnergy}`;
                      } else if (col.key === "fixed_charges_rs_per_kW_or_per_kVA") {
                        val = `Avg Cur: ₹${kpi.avgFixed}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Billing sheet */}
            {(columns.some((c) => c.key === "monthly_electricity_bill_rs") || title.toLowerCase().includes("billing")) && exportRows.length > 0 && (() => {
              const kpi = calculateBillingKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "account_number") {
                        val = `Accts: ${kpi.totalAccounts} | Bills: ${kpi.totalRecords}`;
                      } else if (col.key === "billing_period_start") {
                        val = `Latest Period End: ${kpi.latestPeriodEnd}`;
                      } else if (col.key === "monthly_electricity_bill_rs") {
                        val = `Total: ₹${kpi.totalBill}`;
                      } else if (col.key === "units_kWh") {
                        val = `Total: ${kpi.totalKwh} kWh`;
                      } else if (col.key === "units_kVAh") {
                        val = `Total: ${kpi.totalKvah} kVAh`;
                      } else if (col.key === "fixed_charges_rs") {
                        val = `Total: ₹${kpi.totalFixed}`;
                      } else if (col.key === "demand_charges_rs") {
                        val = `Total: ₹${kpi.totalDemand}`;
                      } else if (col.key === "energy_charges_rs") {
                        val = `Total: ₹${kpi.totalEnergy}`;
                      } else if (col.key === "taxes_and_rent_rs") {
                        val = `Total: ₹${kpi.totalTaxesRent}`;
                      } else if (col.key === "other_charges_rs") {
                        val = `Total: ₹${kpi.totalOther}`;
                      } else if (col.key === "penalty_rs") {
                        val = `Total: ₹${kpi.totalPenalty}`;
                      } else if (col.key === "rebate_subsidy_rs") {
                        val = `Total: ₹${kpi.totalRebate}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "monthly_electricity_bill_rs") {
                        val = `Avg: ₹${kpi.avgBill}`;
                      } else if (col.key === "units_kWh") {
                        val = `Avg: ${kpi.avgKwh} kWh`;
                      } else if (col.key === "units_kVAh") {
                        val = `Avg: ${kpi.avgKvah} kVAh`;
                      } else if (col.key === "mdi_kVA") {
                        val = `Avg MDI: ${kpi.avgMdi} kVA`;
                      } else if (col.key === "pf") {
                        val = `Avg PF: ${kpi.avgPf}`;
                      } else if (col.key === "billing_period_start") {
                        val = `Grid Cost: ₹${kpi.gridCostKvah}/kVAh | ₹${kpi.gridCostKwh}/kWh`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for HVAC sheet */}
            {(columns.some((c) => c.key.includes("average_cooling_produced_TR")) || title.toLowerCase().includes("hvac")) && exportRows.length > 0 && (() => {
              const kpi = calculateHvacKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key.includes("average_cooling_produced_TR")) {
                        val = `Records: ${kpi.totalRecords}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("cooling produced")) {
                        val = `Avg: ${kpi.avgCooling} TR`;
                      } else if (col.label.toLowerCase().includes("chiller power")) {
                        val = `Avg: ${kpi.avgChillerPower} kW`;
                      } else if (col.label.toLowerCase().includes("auxiliary power")) {
                        val = `Avg: ${kpi.avgAuxPower} kW`;
                      } else if (col.label.toLowerCase().includes("plant power")) {
                        val = `Avg: ${kpi.avgPlantPower} kW`;
                      } else if (col.label.toLowerCase().includes("plant efficiency")) {
                        val = `Avg: ${kpi.avgEfficiency} kW/TR`;
                      } else if (col.label.toLowerCase().includes("coefficient of performance") || col.label.toLowerCase().includes("cop")) {
                        val = `Avg COP: ${kpi.avgCop}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for AC sheet */}
            {(columns.some((c) => c.key === "specific_power_kW_per_TR") || title.toLowerCase().includes("ac")) && exportRows.length > 0 && (() => {
              const kpi = calculateAcKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "unit_id") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("connected load")) {
                        val = `Total: ${kpi.totalLoad} kW`;
                      } else if (col.label.toLowerCase().includes("annual energy consumption")) {
                        val = `Total: ${kpi.totalAnnualEnergy} kWh`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("specific power")) {
                        val = `Avg: ${kpi.avgSpecificPower} kW/TR`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Fan sheet */}
            {(columns.some((c) => c.key === "loading_factor_percent") || title.toLowerCase().includes("fan")) && exportRows.length > 0 && (() => {
              const kpi = calculateFanKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("make & model") || col.key === "make_model") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("quantity")) {
                        val = `Total: ${kpi.totalQty} Nos`;
                      } else if (col.label.toLowerCase().includes("connected load")) {
                        val = `Total: ${kpi.totalLoad} kW`;
                      } else if (col.label.toLowerCase().includes("annual energy consumption")) {
                        val = `Total: ${kpi.totalAnnualEnergy} kWh`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("rated power")) {
                        val = `Avg: ${kpi.avgRatedPower} W`;
                      } else if (col.label.toLowerCase().includes("measured power")) {
                        val = `Avg: ${kpi.avgMeasuredPower} W`;
                      } else if (col.label.toLowerCase().includes("loading factor")) {
                        val = `Avg: ${kpi.avgLoadingFactor}%`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Lighting sheet */}
            {(columns.some((c) => c.key === "annual_energy_kWh") || title.toLowerCase().includes("lighting")) && exportRows.length > 0 && (() => {
              const kpi = calculateLightingKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "area_location") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("quantity")) {
                        val = `Total: ${kpi.totalQty} Nos`;
                      } else if (col.label.toLowerCase().includes("connected load")) {
                        val = `Total: ${kpi.totalLoad} kW`;
                      } else if (col.label.toLowerCase().includes("annual energy")) {
                        val = `Total: ${kpi.totalAnnualEnergy} kWh`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("wattage")) {
                        val = `Avg: ${kpi.avgWattage} W`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Lux sheet */}
            {(columns.some((c) => c.key === "average_lux") || title.toLowerCase().includes("lux")) && exportRows.length > 0 && (() => {
              const kpi = calculateLuxKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "area_location") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("compliance")) {
                        val = `Comp: ${kpi.compliantCount} | Non-Comp: ${kpi.nonCompliantCount} (${kpi.compliancePercentage}%)`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("required lux")) {
                        val = `Avg Req: ${kpi.avgRequiredLux}`;
                      } else if (col.label.toLowerCase().includes("average lux")) {
                        val = `Avg Meas: ${kpi.avgMeasuredLux}`;
                      } else if (col.key === "remarks") {
                        val = `Avg Gap: ${kpi.avgLuxGap}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Misc sheet */}
            {(columns.some((c) => c.key === "load_factor_percent") || title.toLowerCase().includes("misc")) && exportRows.length > 0 && (() => {
              const kpi = calculateMiscKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "equipment_name") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("quantity")) {
                        val = `Total: ${kpi.totalQty}`;
                      } else if (col.label.toLowerCase().includes("rated power")) {
                        val = `Total Connected: ${kpi.totalLoad} kW`;
                      } else if (col.label.toLowerCase().includes("annual energy")) {
                        val = `Total: ${kpi.totalAnnualEnergy} kWh`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("rated power")) {
                        val = `Avg Rated: ${kpi.avgRatedPower} kW`;
                      } else if (col.label.toLowerCase().includes("load factor")) {
                        val = `Avg LF: ${kpi.avgLoadFactor}%`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Street Light sheet */}
            {(columns.some((c) => c.key === "annual_energy_kWh") || title.toLowerCase().includes("street light") || title.toLowerCase().includes("street-light")) && exportRows.length > 0 && (() => {
              const kpi = calculateStreetLightKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "area_location") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("quantity")) {
                        val = `Total: ${kpi.totalQty} Nos`;
                      } else if (col.label.toLowerCase().includes("connected load")) {
                        val = `Total: ${kpi.totalLoad} kW`;
                      } else if (col.label.toLowerCase().includes("annual energy")) {
                        val = `Total: ${kpi.totalAnnualEnergy} kWh`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("wattage")) {
                        val = `Avg: ${kpi.avgWattage} W`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for UPS sheet */}
            {(columns.some((c) => c.key === "rated_capacity_kVA") || title.toLowerCase().includes("ups")) && exportRows.length > 0 && (() => {
              const kpi = calculateUpsKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "ups_tag_asset_id") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("rated capacity")) {
                        val = `Total: ${kpi.totalCapacity} kVA`;
                      } else if (col.label.toLowerCase().includes("rated output power")) {
                        val = `Total: ${kpi.totalPower} kW`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("load factor")) {
                        val = `Avg LF: ${kpi.avgLoadFactor}`;
                      } else if (col.label.toLowerCase().includes("battery age")) {
                        val = `Avg Age: ${kpi.avgBatteryAge} yrs`;
                      } else if (col.label.toLowerCase().includes("room temp")) {
                        val = `Avg Temp: ${kpi.avgRoomTemp}°C`;
                      } else if (col.label.toLowerCase().includes("efficiency") && !col.label.toLowerCase().includes("nameplate")) {
                        val = `Avg Eff: ${kpi.avgEfficiency}%`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Solar configuration sheet */}
            {(columns.some((c) => c.key === "panel_rating_watt") || (title.toLowerCase().includes("solar") && (title.toLowerCase().includes("plant") || title.toLowerCase().includes("setup")))) && exportRows.length > 0 && (() => {
              const kpi = calculateSolarKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "plant_name") {
                        val = `Plants: ${kpi.totalPlants}`;
                      } else if (col.label.toLowerCase().includes("plant rating") || col.label.toLowerCase().includes("capacity")) {
                        val = `Total: ${kpi.totalCapacityKwWp} kWp`;
                      } else if (col.label.toLowerCase().includes("no of panels")) {
                        val = `Total: ${kpi.totalPanels}`;
                      } else if (col.label.toLowerCase().includes("inverter rating")) {
                        val = `Total: ${kpi.totalInverterCapacity} kW`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("panel rating") || col.key === "panel_rating_watt") {
                        val = `Avg Panel: ${kpi.avgPanelRating} W`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Solar generation sheet */}
            {(columns.some((c) => c.key === "solar_generation_kWh") || (title.toLowerCase().includes("solar") && title.toLowerCase().includes("generation"))) && exportRows.length > 0 && (() => {
              const kpi = calculateSolarGenerationKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "bill_no" || col.key === "billing_period_start") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("import kwh")) {
                        val = `Total: ${kpi.totalImport} kWh`;
                      } else if (col.label.toLowerCase().includes("export kwh")) {
                        val = `Total: ${kpi.totalExport} kWh`;
                      } else if (col.label.toLowerCase().includes("solar generation kwh")) {
                        val = `Total: ${kpi.totalGeneration} kWh`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("solar generation kwh")) {
                        val = `Avg Gen/Day: ${kpi.avgGenerationPerDay} kWh`;
                      } else if (col.label.toLowerCase().includes("import kwh")) {
                        val = `Total Net: ${kpi.totalNet} kWh`;
                      } else if (col.label.toLowerCase().includes("export kwh")) {
                        val = `Avg Spec Gen: ${kpi.avgSpecificGeneration} kWh/kWp`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for DG set configurations sheet */}
            {(columns.some((c) => c.key === "rated_active_power_kW") || (title.toLowerCase().includes("dg") && (title.toLowerCase().includes("set") || title.toLowerCase().includes("setup")))) && exportRows.length > 0 && (() => {
              const kpi = calculateDgSetKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "dg_number") {
                        val = `DG Sets: ${kpi.totalSets}`;
                      } else if (col.label.toLowerCase().includes("rated capacity")) {
                        val = `Total: ${kpi.totalCapacityKva} kVA`;
                      } else if (col.label.toLowerCase().includes("active power")) {
                        val = `Total: ${kpi.totalActivePowerKw} kW`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("year")) {
                        val = `Avg Year: ${kpi.avgYear}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for DG audit records sheet */}
            {(columns.some((c) => c.key === "measured_kW_output") || (title.toLowerCase().includes("dg") && (title.toLowerCase().includes("record") || title.toLowerCase().includes("audit")))) && exportRows.length > 0 && (() => {
              const kpi = calculateDgSetRecordKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "dg_set_id" || col.key === "dg_set") {
                        val = `Records: ${kpi.totalRecords}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("measured kw output")) {
                        val = `Avg: ${kpi.avgKwOutput} kW`;
                      } else if (col.label.toLowerCase().includes("measured kva output")) {
                        val = `Avg: ${kpi.avgKvaOutput} kVA`;
                      } else if (col.label.toLowerCase().includes("power factor")) {
                        val = `Avg PF: ${kpi.avgPf}`;
                      } else if (col.label.toLowerCase().includes("dg cost per kwh")) {
                        val = `Avg: ₹${kpi.avgDgCost}`;
                      } else if (col.label.toLowerCase().includes("grid cost per kwh")) {
                        val = `Avg: ₹${kpi.avgGridCost}`;
                      } else if (col.label.toLowerCase().includes("average loading")) {
                        val = `Avg Loading: ${kpi.avgLoading} kW`;
                      } else if (col.label.toLowerCase().includes("specific fuel consumption")) {
                        val = `Avg SFC: ${kpi.avgSfc} L/kWh`;
                      } else if (col.label.toLowerCase().includes("calculated efficiency")) {
                        val = `Avg Eff: ${kpi.avgEfficiency}%`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Pump configurations sheet */}
            {(columns.some((c) => c.key === "rated_flow_m3_per_hr") || (title.toLowerCase().includes("pump") && (title.toLowerCase().includes("setup") || title.toLowerCase().includes("config")))) && exportRows.length > 0 && (() => {
              const kpi = calculatePumpKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "pump_tag_number") {
                        val = `Pumps: ${kpi.totalPumps}`;
                      } else if (col.label.toLowerCase().includes("rated power")) {
                        val = `Total: ${kpi.totalPower} kW/HP`;
                      } else if (col.label.toLowerCase().includes("rated flow")) {
                        val = `Total: ${kpi.totalFlow} m³/hr`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("rated head")) {
                        val = `Avg Head: ${kpi.avgHead} m`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Pump audit records sheet */}
            {(columns.some((c) => c.key === "suction_head_m") || (title.toLowerCase().includes("pump") && (title.toLowerCase().includes("record") || title.toLowerCase().includes("audit")))) && exportRows.length > 0 && (() => {
              const kpi = calculatePumpRecordKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "pump_id" || col.key === "pump") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("daily energy consumption")) {
                        val = `Total: ${kpi.totalDailyEnergy} kWh`;
                      } else if (col.label.toLowerCase().includes("annual energy consumption")) {
                        val = `Total: ${kpi.totalAnnualEnergy} kWh`;
                      } else if (col.label.toLowerCase().includes("vfd installed")) {
                        val = `VFDs: ${kpi.vfdCount}`;
                      } else if (col.label.toLowerCase().includes("valve throttling")) {
                        val = `Throttled: ${kpi.throttlingCount}`;
                      } else if (col.label.toLowerCase().includes("leakages observed")) {
                        val = `Leakages: ${kpi.leakageCount}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("input power")) {
                        val = `Avg: ${kpi.avgInputPower} kW`;
                      } else if (col.label.toLowerCase().includes("efficiency")) {
                        val = `Avg Eff: ${kpi.avgEfficiency}%`;
                      } else if (col.label.toLowerCase().includes("motor loading")) {
                        val = `Avg Load: ${kpi.avgMotorLoading}%`;
                      } else if (col.label.toLowerCase().includes("specific energy")) {
                        val = `Avg SEC: ${kpi.avgSpecificEnergy} kWh/m³`;
                      } else if (col.label.toLowerCase().includes("actual flow")) {
                        val = `Avg Flow: ${kpi.avgActualFlow} m³/hr`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Transformer configurations sheet */}
            {(columns.some((c) => c.key === "rated_LV_V") || (title.toLowerCase().includes("transformer") && (title.toLowerCase().includes("setup") || title.toLowerCase().includes("config") || title.toLowerCase().includes("transformers")))) && exportRows.length > 0 && (() => {
              const kpi = calculateTransformerKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "transformer_tag") {
                        val = `Transformers: ${kpi.totalTransformers}`;
                      } else if (col.label.toLowerCase().includes("rated capacity")) {
                        val = `Total: ${kpi.totalCapacityKva} kVA`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("no load loss")) {
                        val = `Avg: ${kpi.avgNoLoadLoss} kW`;
                      } else if (col.label.toLowerCase().includes("full load loss")) {
                        val = `Avg: ${kpi.avgFullLoadLoss} kW`;
                      } else if (col.label.toLowerCase().includes("efficiency")) {
                        val = `Avg Eff: ${kpi.avgEfficiency}%`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}

            {/* Averages/Summary Row for Transformer audit records sheet */}
            {(columns.some((c) => c.key === "power_factor_LT") || (title.toLowerCase().includes("transformer") && (title.toLowerCase().includes("record") || title.toLowerCase().includes("audit")))) && exportRows.length > 0 && (() => {
              const kpi = calculateTransformerRecordKpi(columns, exportRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      Σ
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.key === "transformer_id" || col.key === "transformer") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("annual energy supplied")) {
                        val = `Total: ${kpi.totalEnergySupplied} kWh`;
                      } else if (col.label.toLowerCase().includes("annual energy losses")) {
                        val = `Total: ${kpi.totalEnergyLosses} kWh`;
                      } else if (col.label.toLowerCase().includes("cost of losses")) {
                        val = `Total: ₹${kpi.totalCostOfLosses}`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="border border-border px-3 py-2 text-center font-mono text-[10px] text-muted-foreground bg-muted/10">
                      x̄
                    </td>
                    {columns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("percent loading")) {
                        val = `Avg Load: ${kpi.avgPercentLoading}%`;
                      } else if (col.label.toLowerCase().includes("power factor")) {
                        val = `Avg PF: ${kpi.avgPowerFactorLt}`;
                      } else if (col.label.toLowerCase().includes("load factor")) {
                        val = `Avg LF: ${kpi.avgLoadFactor}%`;
                      }
                      return (
                        <td
                          key={col.key}
                          className="border border-border px-3 py-2 whitespace-nowrap truncate text-[11px] text-primary"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      </main>

      {/* Footer */}
      <footer className="print:hidden shrink-0 border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            Select rows to include in export.{" "}
            {type === "pdf"
              ? "PDF and Excel downloads use the current selection."
              : "Excel and PDF downloads use the current selection."}{" "}
            Print and Word export include selected rows only.
          </p>
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={rows.length === 0}>
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadWord}
              disabled={!hasSelection}
              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/30"
            >
              <FileText className="h-4 w-4" />
              Download Word
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!hasSelection}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloading || !hasSelection}
              className={
                type === "pdf"
                  ? "bg-red-600 hover:bg-red-700 text-white gap-2"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              }
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading..." : `Download ${type === "pdf" ? "PDF" : "XLS"}`}
            </Button>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #export-preview-modal-root,
          #export-preview-modal-root * {
            visibility: visible;
          }
          #export-preview-modal-root {
            position: absolute;
            inset: 0;
            overflow: visible;
          }
          #export-preview-modal-root .export-preview-row[data-export-selected="false"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── PDF Download ────────────────────────────────────────────────────────────
async function downloadPDF(title: string, columns: SheetColumn[], rows: SheetRow[]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new (jsPDF as any)({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 15);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Exported on: ${new Date().toLocaleString()}`, 14, 21);
  doc.text(`${rows.length} records`, 14, 26);

  autoTable(doc, {
    startY: 32,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${sanitizeFilename(title)}.pdf`);
}

// ─── XLS Download ─────────────────────────────────────────────────────────────
async function downloadXLS(title: string, columns: SheetColumn[], rows: SheetRow[]) {
  const XLSX = await import("xlsx");

  const wsData = [
    columns.map((c) => c.label),
    ...rows.map((row) => columns.map((c) => row[c.key] ?? "")),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = columns.map((c) => {
    const maxLen = Math.max(
      c.label.length,
      ...rows.map((row) => String(row[c.key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${sanitizeFilename(title)}.xlsx`);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-\s]/gi, "_").replace(/\s+/g, "_");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadWord(title: string, columns: SheetColumn[], rows: SheetRow[]) {
  const headerCells = columns
    .map((col) => `<th style="border:1px solid #cbd5e1;padding:6pt;background:#eff6ff;font-weight:bold;">${escapeHtml(col.label)}</th>`)
    .join("");

  const bodyRows = rows
    .map(
      (row, index) => `
      <tr>
        <td style="border:1px solid #cbd5e1;padding:6pt;text-align:center;color:#64748b;">${index + 1}</td>
        ${columns
          .map(
            (col) =>
              `<td style="border:1px solid #cbd5e1;padding:6pt;">${escapeHtml(String(row[col.key] ?? "—"))}</td>`,
          )
          .join("")}
      </tr>`,
    )
    .join("");

  const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: A4 landscape; margin: 0.75in; }
    body { font-family: Calibri, Arial, sans-serif; color: #111827; }
    h1 { font-size: 18pt; color: #1e3a8a; margin-bottom: 6pt; }
    p.meta { font-size: 9pt; color: #64748b; margin-bottom: 16pt; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Exported on ${escapeHtml(new Date().toLocaleString())} · ${rows.length} selected record(s)</p>
  <table>
    <thead>
      <tr>
        <th style="border:1px solid #cbd5e1;padding:6pt;background:#eff6ff;font-weight:bold;width:32pt;">#</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob(["\ufeff" + htmlContent], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
