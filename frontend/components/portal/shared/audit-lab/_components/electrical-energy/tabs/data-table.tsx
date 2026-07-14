"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Badge } from "@/components/portal/ui/badge";
import { cn } from "@/components/portal/lib/utils";
import { Button } from "@/components/portal/ui/button";
import { 
  ArrowUpDown, 
  Filter, 
  RotateCcw,
  Eye,
  Settings,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import { ExportPreviewModal } from "./export-preview-modal";
import { calculateTariffKpi } from "./kpis/tarrif-kpi";
import { calculateBillingKpi } from "./kpis/billing-kpi";
import { calculateHvacKpi } from "./kpis/hvac-kpi";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/portal/ui/dropdown-menu";

export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

export type UtilityAuditPreviewSheetSection = {
  id: string;
  title: string;
  columns: SheetColumn[];
  rows: SheetRow[];
};

export type UtilityAuditPreviewSheetTab = {
  stepId: string;
  sheetKey: string;
  label: string;
  sections: UtilityAuditPreviewSheetSection[];
  rowCount: number;
};

interface SandboxDataTableProps {
  previewTab: UtilityAuditPreviewSheetTab;
}

function getColLetter(index: number): string {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode(65 + (temp % 26)) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function SandboxDataTable({ previewTab }: SandboxDataTableProps) {
  // ─── Multi-sheet Tab State (for Solar, DG, Transformer, Pump which have 2 sections) ───
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Reset active section index when the active previewTab changes — land on first connected section
  useEffect(() => {
    const firstConnectedIdx = previewTab.sections.findIndex(
      (s) => !(s.columns.length === 1 && s.columns[0].key === "message")
    );
    setActiveSectionIndex(firstConnectedIdx >= 0 ? firstConnectedIdx : 0);
  }, [previewTab]);

  const activeSection = previewTab.sections[activeSectionIndex] || previewTab.sections[0];
  if (!activeSection) return null;

  // ─── Spreadsheet States (Dynamic columns and rows) ───
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; colKey: string } | null>(null);

  // Column Visibility state
  const [visibleColKeys, setVisibleColKeys] = useState<string[]>([]);

  // Sort & Filter states
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  // Export modal state
  const [exportModal, setExportModal] = useState<{ open: boolean; type: "pdf" | "xls" }>({ open: false, type: "pdf" });

  // Reset spreadsheet state when section changes
  useEffect(() => {
    setColumns(activeSection.columns);
    setRows(activeSection.rows);
    setSortConfig(null);
    setActiveFilters({});
    setSelectedCell(null);
    setVisibleColKeys(activeSection.columns.map((c) => c.key));

    // Initial widths
    const initialWidths: Record<string, number> = {};
    activeSection.columns.forEach((col) => {
      initialWidths[col.key] = col.width || Math.max(120, col.label.length * 9);
    });
    setColWidths(initialWidths);
  }, [activeSection]);

  // Keep visible columns in sync: by default all columns are checked/visible
  useEffect(() => {
    const validKeys = columns.map((c) => c.key);
    setVisibleColKeys((prev) => {
      const kept = prev.filter((k) => validKeys.includes(k));
      const added = validKeys.filter((k) => !prev.includes(k));
      return [...kept, ...added];
    });
  }, [columns]);

  // Filter columns based on visibility settings
  const activeColumns = useMemo(() => {
    return columns.filter((col) => visibleColKeys.includes(col.key));
  }, [columns, visibleColKeys]);

  // ─── Column Resize logic ───
  const resizeStartRef = useRef<{ colKey: string; startWidth: number; startX: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStartRef.current = {
      colKey,
      startWidth: colWidths[colKey] || 120,
      startX: e.clientX,
    };
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizeStartRef.current) return;
    const { colKey, startWidth, startX } = resizeStartRef.current;
    const deltaX = e.clientX - startX;
    setColWidths((prev) => ({
      ...prev,
      [colKey]: Math.max(50, startWidth + deltaX),
    }));
  };

  const handleResizeEnd = () => {
    resizeStartRef.current = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };



  // ─── Sorting & Filtering logic ───
  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortConfig({ key, direction });
  };

  const toggleFilter = (key: string, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[key] ?? [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const clearFilter = (key: string) => {
    setActiveFilters((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Get distinct values for filter list
  const getFilterOptions = (colKey: string): string[] => {
    const vals = rows.map((r) => String(r[colKey] ?? "—"));
    return Array.from(new Set(vals));
  };

  // Process rows by applying sorting and filtering
  const processedRows = useMemo(() => {
    let result = [...rows];

    // Filter
    Object.entries(activeFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        result = result.filter((row) => values.includes(String(row[key] ?? "—")));
      }
    });

    // Sort
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        const aStr = String(aVal ?? "").toLowerCase();
        const bStr = String(bVal ?? "").toLowerCase();
        return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [rows, sortConfig, activeFilters]);

  const isMessageSection = columns.length === 1 && columns[0].key === "message";

  // ─── A section is "connected" if it has real data rows (not a message placeholder) ───
  const isConnectedSection = (section: UtilityAuditPreviewSheetSection) =>
    !(section.columns.length === 1 && section.columns[0].key === "message");

  const connectedSections = previewTab.sections.filter(isConnectedSection);

  return (
    <div className="flex flex-col space-y-4 w-full h-full min-h-0">
      {/* ── Operations Ribbon (Formula feature removed) ── */}
      {!isMessageSection && (
        <div className="flex flex-col gap-3 p-2.5 rounded-lg border border-border/80 bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Worksheet Controls: {activeSection.title}
            </span>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              {processedRows.length} visible rows
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Columns Visibility Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="xs" variant="outline" className="h-8 gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Columns Visibility
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto" align="end">
                <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">Toggle Column Visibility</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs" onSelect={(e) => e.preventDefault()} onClick={() => setVisibleColKeys(columns.map((c) => c.key))}>
                  Select All Columns
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs text-destructive" onSelect={(e) => e.preventDefault()} onClick={() => setVisibleColKeys([])}>
                  Hide All Columns
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {columns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColKeys.includes(col.key)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                      setVisibleColKeys((prev) =>
                        checked 
                          ? [...prev, col.key] 
                          : prev.filter((k) => k !== col.key)
                      );
                    }}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>


            {/* Reset Button */}
            <Button 
              size="xs" 
              variant="outline" 
              className="h-8 text-muted-foreground gap-1"
              onClick={() => {
                setRows(activeSection.rows);
                setColumns(activeSection.columns);
                setSortConfig(null);
                setActiveFilters({});
                setVisibleColKeys(activeSection.columns.map((c) => c.key));
              }}
              title="Reset Grid"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Grid
            </Button>

            {/* Export PDF */}
            <Button
              size="xs"
              variant="outline"
              className="h-8 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 dark:border-red-900 dark:hover:bg-red-950/30"
              onClick={() => setExportModal({ open: true, type: "pdf" })}
            >
              <FileText className="h-3.5 w-3.5" /> Export PDF
            </Button>

            {/* Export XLS */}
            <Button
              size="xs"
              variant="outline"
              className="h-8 gap-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200 dark:border-emerald-900 dark:hover:bg-emerald-950/30"
              onClick={() => setExportModal({ open: true, type: "xls" })}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export XLS
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Google Sheets Grid ── */}
      {isMessageSection ? (
        <div className="text-xs text-muted-foreground p-8 text-center border rounded-lg border-dashed">
          {rows[0]?.message || "No records configured."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-background max-w-full">
          <table className="min-w-full text-xs text-left border-collapse table-fixed">
            <thead className="bg-muted/50 sticky top-0 z-10">
              {/* Letters Row (A, B, C...) */}
              <tr className="border-b border-border bg-muted/40">
                <th className="w-12 text-center p-1 text-[9px] font-bold text-muted-foreground border-r border-border"></th>
                {activeColumns.map((col, cIdx) => (
                  <th
                    key={`letter-${col.key}`}
                    style={{ width: colWidths[col.key] || 120 }}
                    className="p-1 text-center text-[9px] font-bold text-muted-foreground/60 border-r border-border select-none"
                  >
                    {getColLetter(cIdx)}
                  </th>
                ))}
              </tr>
              {/* Header Label / Title Row */}
              <tr className="border-b border-border">
                <th className="w-12 text-center py-2 font-bold text-muted-foreground border-r border-border bg-muted/30">#</th>
                {activeColumns.map((col) => {
                  const filterOptions = getFilterOptions(col.key);
                  const isFiltered = (activeFilters[col.key]?.length ?? 0) > 0;

                  return (
                    <th
                      key={col.key}
                      style={{ width: colWidths[col.key] || 120 }}
                      className="p-0 border-r border-border bg-muted/30 relative select-none font-semibold text-foreground"
                    >
                      <div className="flex items-center justify-between px-2.5 py-2 group">
                        <span className="truncate pr-4">{col.label}</span>
                        
                        {/* Sort & Filter Dropdown */}
                        <DropdownMenu onOpenChange={(open) => { if (!open) setFilterSearchQuery(""); }}>
                          <DropdownMenuTrigger asChild>
                            <button className={cn(
                              "p-0.5 hover:bg-muted rounded transition-colors duration-200",
                              (isFiltered || sortConfig?.key === col.key)
                                ? "text-primary"
                                : "text-muted-foreground/50 hover:text-muted-foreground"
                            )}>
                              <Filter className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem className="gap-2" onClick={() => handleSort(col.key, "asc")}>
                              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /> Sort A-Z / Min-Max
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleSort(col.key, "desc")}>
                              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /> Sort Z-A / Max-Min
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                              <Filter className="h-3.5 w-3.5" /> Filter values
                            </div>
                            
                            {/* Filter Search Input */}
                            <div className="px-2 pb-2">
                              <input
                                type="text"
                                value={filterSearchQuery}
                                onChange={(e) => setFilterSearchQuery(e.target.value)}
                                placeholder="Search values..."
                                onSelect={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                              />
                            </div>

                            <div className="max-h-36 overflow-y-auto">
                              {filterOptions
                                .filter((opt) =>
                                  String(opt ?? "")
                                    .toLowerCase()
                                    .includes(filterSearchQuery.toLowerCase())
                                )
                                .map((opt, oIdx) => (
                                  <DropdownMenuCheckboxItem
                                    key={oIdx}
                                    checked={activeFilters[col.key]?.includes(opt) || false}
                                    onSelect={(e) => e.preventDefault()}
                                    onCheckedChange={() => toggleFilter(col.key, opt)}
                                  >
                                    {opt}
                                  </DropdownMenuCheckboxItem>
                                ))}
                            </div>
                            {isFiltered && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive font-medium" onClick={() => clearFilter(col.key)}>
                                  Clear Filters
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Resize Handle dragging */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, col.key)}
                        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-20"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {processedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b last:border-0 hover:bg-muted/10 transition-colors"
                >
                  <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/15 select-none">
                    {rIdx + 1}
                  </td>
                  {activeColumns.map((col) => {
                    const isSelected = selectedCell?.rowIndex === rIdx && selectedCell?.colKey === col.key;
                    const cellVal = String(row[col.key] ?? "");

                    return (
                      <td
                        key={col.key}
                        onClick={() => setSelectedCell({ rowIndex: rIdx, colKey: col.key })}
                        style={{ width: colWidths[col.key] || 120 }}
                        className={cn(
                          "p-2 border-r border-border font-medium whitespace-nowrap truncate cursor-cell transition-all",
                          isSelected ? "bg-primary/5 ring-1 ring-primary z-10" : "bg-background/20"
                        )}
                      >
                        {cellVal === "Completed" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] px-1.5 py-0.2">Completed</Badge>
                        ) : cellVal === "Pending" ? (
                          <Badge className="bg-orange-500/10 text-orange-600 border-none text-[10px] px-1.5 py-0.2">Pending</Badge>
                        ) : (
                          cellVal
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Averages/Summary Row for Tariff sheet */}
            {(previewTab.sheetKey === "tarrif" || previewTab.sheetKey === "tariff") && processedRows.length > 0 && (() => {
              const kpi = calculateTariffKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Counts */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.key === "effective_from") {
                        val = `Total: ${kpi.total} | Cur: ${kpi.current} | Hist: ${kpi.historical}`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.key === "basic_energy_charges_rs_per_unit") {
                        val = `Avg Cur: ₹${kpi.avgEnergy}`;
                      } else if (col.key === "fixed_charges_rs_per_kW_or_per_kVA") {
                        val = `Avg Cur: ₹${kpi.avgFixed}`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "billing" && processedRows.length > 0 && (() => {
              const kpi = calculateBillingKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "hvac" && processedRows.length > 0 && (() => {
              const kpi = calculateHvacKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.key.includes("average_cooling_produced_TR")) {
                        val = `Records: ${kpi.totalRecords}`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "ac" && processedRows.length > 0 && (() => {
              const kpi = calculateAcKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("specific power")) {
                        val = `Avg: ${kpi.avgSpecificPower} kW/TR`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "fan" && processedRows.length > 0 && (() => {
              const kpi = calculateFanKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "lighting" && processedRows.length > 0 && (() => {
              const kpi = calculateLightingKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("wattage")) {
                        val = `Avg: ${kpi.avgWattage} W`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "lux" && processedRows.length > 0 && (() => {
              const kpi = calculateLuxKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.key === "area_location") {
                        val = `Records: ${kpi.totalRecords}`;
                      } else if (col.label.toLowerCase().includes("compliance")) {
                        val = `Comp: ${kpi.compliantCount} | Non-Comp: ${kpi.nonCompliantCount} (${kpi.compliancePercentage}%)`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "misc" && processedRows.length > 0 && (() => {
              const kpi = calculateMiscKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("rated power")) {
                        val = `Avg Rated: ${kpi.avgRatedPower} kW`;
                      } else if (col.label.toLowerCase().includes("load factor")) {
                        val = `Avg LF: ${kpi.avgLoadFactor}%`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "street-light" && processedRows.length > 0 && (() => {
              const kpi = calculateStreetLightKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("wattage")) {
                        val = `Avg: ${kpi.avgWattage} W`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "ups" && processedRows.length > 0 && (() => {
              const kpi = calculateUpsKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "solar" && activeSection.id === "solar-plants" && processedRows.length > 0 && (() => {
              const kpi = calculateSolarKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("panel rating") || col.key === "panel_rating_watt") {
                        val = `Avg Panel: ${kpi.avgPanelRating} W`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "solar" && activeSection.id === "solar-generation-records" && processedRows.length > 0 && (() => {
              const kpi = calculateSolarGenerationKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "dg" && activeSection.id === "dg-sets" && processedRows.length > 0 && (() => {
              const kpi = calculateDgSetKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("year")) {
                        val = `Avg Year: ${kpi.avgYear}`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "dg" && activeSection.id === "dg-audit-records" && processedRows.length > 0 && (() => {
              const kpi = calculateDgSetRecordKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.key === "dg_set_id" || col.key === "dg_set") {
                        val = `Records: ${kpi.totalRecords}`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "pump" && activeSection.id === "pumps" && processedRows.length > 0 && (() => {
              const kpi = calculatePumpKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.label.toLowerCase().includes("rated head")) {
                        val = `Avg Head: ${kpi.avgHead} m`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "pump" && activeSection.id === "pump-audit-records" && processedRows.length > 0 && (() => {
              const kpi = calculatePumpRecordKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "transformer" && activeSection.id === "transformers" && processedRows.length > 0 && (() => {
              const kpi = calculateTransformerKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
                      let val = "";
                      if (col.key === "transformer_tag") {
                        val = `Transformers: ${kpi.totalTransformers}`;
                      } else if (col.label.toLowerCase().includes("rated capacity")) {
                        val = `Total: ${kpi.totalCapacityKva} kVA`;
                      }
                      return (
                        <td
                          key={col.key}
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
            {previewTab.sheetKey === "transformer" && activeSection.id === "transformer-audit-records" && processedRows.length > 0 && (() => {
              const kpi = calculateTransformerRecordKpi(activeColumns, processedRows);

              return (
                <tfoot className="bg-muted/30 border-t-2 border-double border-border font-bold text-foreground">
                  {/* Row 1: Totals */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      Σ
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-muted-foreground"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Row 2: Averages */}
                  <tr>
                    <td className="w-12 text-center py-2 font-mono text-[10px] text-muted-foreground border-r border-border bg-muted/10">
                      x̄
                    </td>
                    {activeColumns.map((col) => {
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
                          style={{ width: colWidths[col.key] || 120 }}
                          className="p-2 border-r border-border whitespace-nowrap truncate text-[11px] text-primary"
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
      )}

      {/* ── Bottom Sheets Tabs bar (Google Sheet tab switcher styling) ── */}
      {connectedSections.length > 1 && (
        <div className="flex shrink-0 items-center gap-1 bg-muted/65 border border-border/80 p-1 rounded-md mt-2 max-w-full overflow-x-auto select-none">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 border-r border-border mr-1.5 shrink-0">
            Worksheets
          </div>
          {connectedSections.map((section) => {
            const realIdx = previewTab.sections.indexOf(section);
            const isActive = activeSectionIndex === realIdx;
            return (
              <button
                key={realIdx}
                type="button"
                onClick={() => setActiveSectionIndex(realIdx)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded font-medium transition-all duration-200 shrink-0",
                  isActive
                    ? "bg-background border shadow text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                )}
              >
                {section.title}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Export Preview Modal ── */}
      <ExportPreviewModal
        open={exportModal.open}
        onClose={() => setExportModal((prev) => ({ ...prev, open: false }))}
        type={exportModal.type}
        title={activeSection.title}
        columns={activeColumns}
        rows={processedRows}
      />
    </div>
  );
}
