"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Checkbox } from "@/components/portal/ui/checkbox";
import {
  GoogleSheetGrid,
  type SheetRow,
} from "@/components/portal/shared/components/google-sheet-grid";
import { FacilityListFilterPanel } from "@/components/portal/shared/components/facility/facility-list-filter-panel";
import { useCompanyBranding } from "@/components/portal/shared/components/company-branding-provider";
import {
  buildFacilityExcelSheetRows,
  buildFacilityExportRows,
  defaultFacilityExportColumnKeys,
  FACILITY_EXPORT_COLUMNS,
  facilityExportSheetColumns,
  resolveFacilityExportColumns,
  type FacilityExportColumnKey,
} from "@/components/portal/lib/facilityExport";
import {
  countActiveFacilityListFilters,
  DEFAULT_FACILITY_LIST_FILTERS,
  deriveUniqueFacilityAuditors,
  filterFacilitiesByAuditTab,
  filterFacilityList,
  type FacilityAuditTab,
  type FacilityListFilters,
} from "@/components/portal/lib/facilityListFilters";
import {
  buildFacilityListPdfBlob,
  facilityListPdfFilename,
  type FacilityListPdfOrientation,
} from "@/components/portal/lib/facilityListPdf";
import { type Facility } from "@/store/slices/facilityApiSlice";
import { useGetDefaultCompanyQuery } from "@/store/slices/companyApiSlice";
import {
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/components/portal/lib/utils";
import { toast } from "sonner";

interface FacilitiesSheetModalProps {
  facilities: Facility[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TAB_LABELS: Record<FacilityAuditTab, string> = {
  all: "All Facilities",
  open: "Open Audits",
  closed: "Closed Audits",
};

export function FacilitiesSheetModal({
  facilities,
  open,
  onOpenChange,
}: FacilitiesSheetModalProps) {
  const [selectedTab, setSelectedTab] = useState<FacilityAuditTab>("all");
  const [filters, setFilters] = useState<FacilityListFilters>(
    DEFAULT_FACILITY_LIST_FILTERS,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [exportColumnKeys, setExportColumnKeys] = useState<FacilityExportColumnKey[]>(
    defaultFacilityExportColumnKeys,
  );
  const [isExporting, setIsExporting] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState<FacilityListPdfOrientation | null>(
    null,
  );

  const { displayName, logoSrc, primaryColor } = useCompanyBranding();
  const { data: companyRes } = useGetDefaultCompanyQuery();

  const selectedExportColumns = useMemo(
    () => resolveFacilityExportColumns(exportColumnKeys),
    [exportColumnKeys],
  );

  const gridColumns = useMemo(
    () => facilityExportSheetColumns(selectedExportColumns),
    [selectedExportColumns],
  );

  const activeFiltersCount = useMemo(
    () => countActiveFacilityListFilters(filters),
    [filters],
  );

  const uniqueAuditors = useMemo(
    () => deriveUniqueFacilityAuditors(facilities),
    [facilities],
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const filteredFacilities = useMemo(
    () => filterFacilityList(facilities, filters),
    [facilities, filters],
  );

  const openFacilities = useMemo(
    () => filterFacilitiesByAuditTab(filteredFacilities, "open"),
    [filteredFacilities],
  );

  const closedFacilities = useMemo(
    () => filterFacilitiesByAuditTab(filteredFacilities, "closed"),
    [filteredFacilities],
  );

  const activeFacilities = useMemo(
    () => filterFacilitiesByAuditTab(filteredFacilities, selectedTab),
    [filteredFacilities, selectedTab],
  );

  const sheetRows = useMemo<SheetRow[]>(() => {
    const exportRows = buildFacilityExportRows(activeFacilities, selectedExportColumns);
    return exportRows.map((row) => {
      const sheetRow: SheetRow = {};
      for (const column of selectedExportColumns) {
        sheetRow[column.key] = row[column.key];
      }
      return sheetRow;
    });
  }, [activeFacilities, selectedExportColumns]);

  const toggleExportColumn = (key: FacilityExportColumnKey, checked: boolean) => {
    setExportColumnKeys((current) => {
      if (checked) {
        if (current.includes(key)) return current;
        const next = [...current, key];
        return FACILITY_EXPORT_COLUMNS.map((column) => column.key).filter((columnKey) =>
          next.includes(columnKey),
        );
      }
      if (current.length <= 1) return current;
      return current.filter((columnKey) => columnKey !== key);
    });
  };

  const selectAllExportColumns = () => {
    setExportColumnKeys(FACILITY_EXPORT_COLUMNS.map((column) => column.key));
  };

  const resetExportColumns = () => {
    setExportColumnKeys(defaultFacilityExportColumnKeys());
  };

  const handleExportXlsx = async () => {
    if (activeFacilities.length === 0 || selectedExportColumns.length === 0) return;
    try {
      setIsExporting(true);
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(TAB_LABELS[selectedTab]);

      worksheet.columns = selectedExportColumns.map((col) => ({
        header: col.label,
        key: col.key,
        width: col.width ? col.width / 8 : 15,
      }));

      const rows = buildFacilityExcelSheetRows(activeFacilities, selectedExportColumns);
      rows.forEach((row) => {
        const rowData: Record<string, string> = {};
        selectedExportColumns.forEach((col) => {
          rowData[col.key] = row[col.label] ?? "";
        });
        worksheet.addRow(rowData);
      });

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F46E5" },
      };
      headerRow.height = 24;

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
          if (rowNumber > 1) {
            cell.font = { size: 10, name: "Arial" };
          } else {
            cell.font = {
              size: 11,
              name: "Arial",
              bold: true,
              color: { argb: "FFFFFFFF" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `facilities-${selectedTab}-sheet.xlsx`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("XLSX export failed:", error);
      toast.error("Failed to export facilities spreadsheet.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async (orientation: FacilityListPdfOrientation) => {
    if (activeFacilities.length === 0 || selectedExportColumns.length === 0) return;
    setPdfGenerating(orientation);
    try {
      const blob = await buildFacilityListPdfBlob({
        rows: activeFacilities,
        columns: selectedExportColumns,
        company: companyRes?.data,
        logoSrc,
        brandName: displayName,
        primaryColor,
        orientation,
        tabLabel: TAB_LABELS[selectedTab],
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = facilityListPdfFilename(orientation, selectedTab);
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate facilities PDF.");
    } finally {
      setPdfGenerating(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground animate-in fade-in duration-200">
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">
                Facilities Spreadsheet View
              </h2>
              <p className="text-xs text-muted-foreground">
                Review facilities, filter by type and dates, choose columns, and export.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close sheet modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:px-6">
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {(["all", "open", "closed"] as const).map((tab) => {
              const count =
                tab === "all"
                  ? filteredFacilities.length
                  : tab === "open"
                    ? openFacilities.length
                    : closedFacilities.length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-xs font-semibold transition",
                    selectedTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TAB_LABELS[tab]}
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 ? (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {activeFiltersCount}
                </span>
              ) : null}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setColumnsOpen(true)}
            >
              <Columns3 className="h-4 w-4" />
              Columns
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {selectedExportColumns.length}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleExportXlsx()}
              disabled={
                isExporting ||
                activeFacilities.length === 0 ||
                selectedExportColumns.length === 0
              }
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Excel"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleExportPdf("portrait")}
              disabled={
                pdfGenerating != null ||
                activeFacilities.length === 0 ||
                selectedExportColumns.length === 0
              }
              className="gap-2"
            >
              {pdfGenerating === "portrait" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF portrait
            </Button>
            <Button
              size="sm"
              onClick={() => void handleExportPdf("landscape")}
              disabled={
                pdfGenerating != null ||
                activeFacilities.length === 0 ||
                selectedExportColumns.length === 0
              }
              className="gap-2"
            >
              {pdfGenerating === "landscape" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF landscape
            </Button>
          </div>
        </div>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/5 p-4 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {activeFacilities.length} row{activeFacilities.length === 1 ? "" : "s"}
            </span>
            <span>•</span>
            <span>
              {selectedExportColumns.length} column
              {selectedExportColumns.length === 1 ? "" : "s"}
            </span>
            {activeFiltersCount > 0 ? (
              <>
                <span>•</span>
                <span>{activeFiltersCount} active filter{activeFiltersCount === 1 ? "" : "s"}</span>
              </>
            ) : null}
          </div>
          <GoogleSheetGrid
            fillHeight
            columns={gridColumns}
            rows={sheetRows}
            emptyMessage={`No ${selectedTab} facilities match the selected filters.`}
          />
        </main>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filter facilities</DialogTitle>
          </DialogHeader>
          <FacilityListFilterPanel
            filters={filters}
            onChange={setFilters}
            uniqueAuditors={uniqueAuditors}
          />
          <DialogFooter>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={columnsOpen} onOpenChange={setColumnsOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select columns</DialogTitle>
          </DialogHeader>
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={selectAllExportColumns}>
              Select all
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetExportColumns}>
              Reset
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FACILITY_EXPORT_COLUMNS.map((column) => {
              const checked = exportColumnKeys.includes(column.key);
              return (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleExportColumn(column.key, value === true)
                    }
                  />
                  <span className="truncate">{column.label}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setColumnsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
