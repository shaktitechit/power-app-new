"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { Input } from "@/components/portal/ui/input";
import {
  GoogleSheetGrid,
  exportSheetRowsToCsv,
  type SheetColumn,
  type SheetRow,
} from "@/components/portal/shared/components/google-sheet-grid";
import { AUDIT_TYPE_OPTIONS } from "@/components/portal/lib/facilityConstants";
import { type Facility } from "@/store/slices/facilityApiSlice";
import { Download, FileSpreadsheet, X, FilterX } from "lucide-react";
import { cn } from "@/components/portal/lib/utils";

interface FacilitiesSheetModalProps {
  facilities: Facility[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLUMNS: SheetColumn[] = [
  { key: "name", label: "Facility Name", width: 220 },
  { key: "audit_number", label: "Audit Number", width: 150 },
  { key: "enquiry_number", label: "Enquiry Number", width: 150 },
  { key: "city", label: "City", width: 120 },
  { key: "address", label: "Address", width: 260 },
  { key: "facility_type", label: "Facility Type", width: 150 },
  { key: "audit_type", label: "Audit Type", width: 220 },
  { key: "status", label: "Status", width: 100 },
  { key: "start_date", label: "Start Date", width: 120 },
  { key: "closure_date", label: "Target Closure", width: 120 },
  { key: "auditor_name", label: "Auditor Name", width: 160 },
  { key: "auditor_email", label: "Auditor Email", width: 180 },
  { key: "client_representative", label: "Client Representative", width: 180 },
  { key: "client_contact_number", label: "Client Contact", width: 130 },
  { key: "client_email", label: "Client Email", width: 180 },
];

function isFacilityAuditClosed(facility: Facility): boolean {
  return Boolean(facility.audit_closure?.closed_at);
}

export function FacilitiesSheetModal({
  facilities,
  open,
  onOpenChange,
}: FacilitiesSheetModalProps) {
  const [selectedTab, setSelectedTab] = useState<"all" | "open" | "closed">("all");

  // Filters State
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>("all");
  const [auditorFilter, setAuditorFilter] = useState<string>("all");
  const [startDateFrom, setStartDateFrom] = useState<string>("");
  const [startDateTo, setStartDateTo] = useState<string>("");
  const [closureDateFrom, setClosureDateFrom] = useState<string>("");
  const [closureDateTo, setClosureDateTo] = useState<string>("");

  // Lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Helper to extract and resolve all auditors (populated junction + legacy fallback)
  const getFacilityAuditors = useMemo(() => {
    return (f: Facility) => {
      const list: { name: string; email: string; key: string }[] = [];

      // 1. Resolve from populated junction table (assignedAuditors)
      if (f.assignedAuditors && Array.isArray(f.assignedAuditors)) {
        f.assignedAuditors.forEach((assign) => {
          const user = assign.user_id;
          if (user && typeof user === "object") {
            list.push({
              name: user.name || "",
              email: user.email || "",
              key: user.email || user._id || "",
            });
          }
        });
      }

      // 2. Legacy fallback to auditor_id
      if (f.auditor_id) {
        const aud = f.auditor_id;
        const key = aud.email || aud._id || "";
        if (key && !list.some((item) => item.key === key)) {
          list.push({
            name: aud.name || "",
            email: aud.email || "",
            key: key,
          });
        }
      }

      return list;
    };
  }, []);

  // Derive unique list of auditors from active data for the dropdown filter
  const uniqueAuditors = useMemo(() => {
    const list = new Set<string>();
    const mapping: Record<string, string> = {};

    facilities.forEach((f) => {
      const auditors = getFacilityAuditors(f);
      auditors.forEach((info) => {
        if (info.key) {
          list.add(info.key);
          mapping[info.key] = info.name || info.email || "Auditor";
        }
      });
    });

    return Array.from(list).map((key) => ({
      key,
      name: mapping[key],
    }));
  }, [facilities, getFacilityAuditors]);

  const clearFilters = () => {
    setAuditTypeFilter("all");
    setAuditorFilter("all");
    setStartDateFrom("");
    setStartDateTo("");
    setClosureDateFrom("");
    setClosureDateTo("");
  };

  // Filter facilities based on active selectors
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      // Audit Type
      if (auditTypeFilter !== "all" && f.audit_type !== auditTypeFilter) {
        return false;
      }

      // Auditor / Team
      if (auditorFilter !== "all") {
        const auditors = getFacilityAuditors(f);
        const hasMatch = auditors.some((info) => info.key === auditorFilter);
        if (!hasMatch) return false;
      }

      // Start Date Range
      if (f.start_date) {
        const startMs = new Date(f.start_date).getTime();
        if (startDateFrom && startMs < new Date(startDateFrom).getTime()) {
          return false;
        }
        if (startDateTo && startMs > new Date(startDateTo).getTime()) {
          return false;
        }
      } else if (startDateFrom || startDateTo) {
        return false;
      }

      // Target Closure Date Range
      if (f.closure_date) {
        const closureMs = new Date(f.closure_date).getTime();
        if (closureDateFrom && closureMs < new Date(closureDateFrom).getTime()) {
          return false;
        }
        if (closureDateTo && closureMs > new Date(closureDateTo).getTime()) {
          return false;
        }
      } else if (closureDateFrom || closureDateTo) {
        return false;
      }

      return true;
    });
  }, [
    facilities,
    auditTypeFilter,
    auditorFilter,
    startDateFrom,
    startDateTo,
    closureDateFrom,
    closureDateTo,
    getFacilityAuditors,
  ]);

  // Distribute into Open vs. Closed categories
  const openFacilities = useMemo(() => {
    return filteredFacilities.filter((f) => !isFacilityAuditClosed(f));
  }, [filteredFacilities]);

  const closedFacilities = useMemo(() => {
    return filteredFacilities.filter((f) => isFacilityAuditClosed(f));
  }, [filteredFacilities]);

  const activeFacilities = useMemo(() => {
    if (selectedTab === "open") return openFacilities;
    if (selectedTab === "closed") return closedFacilities;
    return filteredFacilities;
  }, [selectedTab, openFacilities, closedFacilities, filteredFacilities]);

  // Transform active facilities into SheetRow formats
  const sheetRows = useMemo<SheetRow[]>(() => {
    return activeFacilities.map((f) => {
      const auditors = getFacilityAuditors(f);
      const auditorNames = auditors.map((a) => a.name).filter(Boolean).join(", ") || "—";
      const auditorEmails = auditors.map((a) => a.email).filter(Boolean).join(", ") || "—";
      const isClosed = isFacilityAuditClosed(f);

      return {
        name: f.name || "—",
        audit_number: f.audit_number || "—",
        enquiry_number: f.enquiry_number || "—",
        city: f.city || "—",
        address: f.address || "—",
        facility_type: f.facility_type || "—",
        audit_type: f.audit_type || "—",
        status: isClosed ? "Closed" : "Open",
        start_date: f.start_date ? new Date(f.start_date).toLocaleDateString() : "—",
        closure_date: f.closure_date ? new Date(f.closure_date).toLocaleDateString() : "—",
        auditor_name: auditorNames,
        auditor_email: auditorEmails,
        client_representative: f.client_representative || "—",
        client_contact_number: f.client_contact_number || "—",
        client_email: f.client_email || "—",
      };
    });
  }, [activeFacilities, getFacilityAuditors]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportXlsx = async () => {
    try {
      setIsExporting(true);
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        selectedTab === "open" ? "Open Audits" : selectedTab === "closed" ? "Closed Audits" : "All Audits"
      );

      // Define columns layout
      worksheet.columns = COLUMNS.map((col) => ({
        header: col.label,
        key: col.key,
        width: col.width ? col.width / 8 : 15,
      }));

      // Add sheet rows
      sheetRows.forEach((row) => {
        const rowData: Record<string, any> = {};
        COLUMNS.forEach((col) => {
          rowData[col.key] = row[col.key] ?? "";
        });
        worksheet.addRow(rowData);
      });

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F46E5" }, // premium indigo primary color
      };
      headerRow.height = 24;

      // Add borders and align cells
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
            cell.font = { size: 11, name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
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
    } finally {
      setIsExporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground animate-in fade-in duration-200">
      {/* Header */}
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
              Review and audit all facilities, filter by type, auditor, and date schedules in real-time.
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

      {/* Filter Toolbar */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-muted/10 p-4 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {/* Audit Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Audit Type
            </label>
            <Select value={auditTypeFilter} onValueChange={setAuditTypeFilter}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="All Audits" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audits</SelectItem>
                {AUDIT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team / Auditor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Auditor / Team
            </label>
            <Select value={auditorFilter} onValueChange={setAuditorFilter}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="All Auditors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Auditors</SelectItem>
                {uniqueAuditors.map((auditor) => (
                  <SelectItem key={auditor.key} value={auditor.key}>
                    {auditor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date From */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Start Date (From)
            </label>
            <Input
              type="date"
              className="h-9 bg-background"
              value={startDateFrom}
              onChange={(e) => setStartDateFrom(e.target.value)}
            />
          </div>

          {/* Start Date To */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Start Date (To)
            </label>
            <Input
              type="date"
              className="h-9 bg-background"
              value={startDateTo}
              onChange={(e) => setStartDateTo(e.target.value)}
            />
          </div>

          {/* Closure Date From */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Closure (From)
            </label>
            <Input
              type="date"
              className="h-9 bg-background"
              value={closureDateFrom}
              onChange={(e) => setClosureDateFrom(e.target.value)}
            />
          </div>

          {/* Closure Date To */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Closure (To)
            </label>
            <Input
              type="date"
              className="h-9 bg-background"
              value={closureDateTo}
              onChange={(e) => setClosureDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <FilterX className="mr-1.5 h-3.5 w-3.5" />
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Sheet Tabs + Actions bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-4 py-3 sm:px-6">
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setSelectedTab("all")}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-semibold transition",
              selectedTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All Facilities
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
              ({filteredFacilities.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("open")}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-semibold transition",
              selectedTab === "open"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Open Audits
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
              ({openFacilities.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab("closed")}
            className={cn(
              "rounded-md px-4 py-1.5 text-xs font-semibold transition",
              selectedTab === "closed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Closed Audits
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
              ({closedFacilities.length})
            </span>
          </button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExportXlsx}
          disabled={isExporting}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export XLSX"}
        </Button>
      </div>

      {/* Main Grid View */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6 bg-muted/5">
        <GoogleSheetGrid
          fillHeight
          columns={COLUMNS}
          rows={sheetRows}
          emptyMessage={`No ${selectedTab} facilities match the selected filters.`}
        />
      </main>
    </div>
  );
}
