import { facilityExpectedValue } from "@/components/portal/lib/facilityConstants";
import { formatDisplayDate, formatInr } from "@/components/portal/lib/quotationConstants";
import type { Facility } from "@/store/slices/facilityApiSlice";

export type FacilityExportColumnKey =
  | "name"
  | "audit_number"
  | "enquiry_number"
  | "city"
  | "address"
  | "facility_type"
  | "audit_type"
  | "expected_value"
  | "status"
  | "start_date"
  | "closure_date"
  | "auditor_name"
  | "auditor_email"
  | "client_representative"
  | "client_contact_number"
  | "client_email";

export type FacilityExportColumnDef = {
  key: FacilityExportColumnKey;
  label: string;
  width?: number;
  defaultSelected: boolean;
};

export const FACILITY_EXPORT_COLUMNS: FacilityExportColumnDef[] = [
  { key: "name", label: "Facility Name", width: 220, defaultSelected: true },
  { key: "audit_number", label: "Audit Number", width: 150, defaultSelected: true },
  { key: "enquiry_number", label: "Enquiry Number", width: 150, defaultSelected: true },
  { key: "city", label: "City", width: 120, defaultSelected: true },
  { key: "address", label: "Address", width: 260, defaultSelected: true },
  { key: "facility_type", label: "Facility Type", width: 150, defaultSelected: true },
  { key: "audit_type", label: "Audit Type", width: 220, defaultSelected: true },
  { key: "expected_value", label: "Expected Value", width: 140, defaultSelected: true },
  { key: "status", label: "Status", width: 100, defaultSelected: true },
  { key: "start_date", label: "Start Date", width: 120, defaultSelected: true },
  { key: "closure_date", label: "Target Closure", width: 120, defaultSelected: true },
  { key: "auditor_name", label: "Auditor Name", width: 160, defaultSelected: true },
  { key: "auditor_email", label: "Auditor Email", width: 180, defaultSelected: true },
  {
    key: "client_representative",
    label: "Client Representative",
    width: 180,
    defaultSelected: true,
  },
  {
    key: "client_contact_number",
    label: "Client Contact",
    width: 130,
    defaultSelected: true,
  },
  { key: "client_email", label: "Client Email", width: 180, defaultSelected: true },
];

export type FacilityAuditorInfo = {
  name: string;
  email: string;
  key: string;
};

export function getFacilityAuditors(facility: Facility): FacilityAuditorInfo[] {
  const list: FacilityAuditorInfo[] = [];

  if (facility.assignedAuditors && Array.isArray(facility.assignedAuditors)) {
    facility.assignedAuditors.forEach((assign) => {
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

  if (facility.auditor_id) {
    const aud = facility.auditor_id;
    const key = aud.email || aud._id || "";
    if (key && !list.some((item) => item.key === key)) {
      list.push({
        name: aud.name || "",
        email: aud.email || "",
        key,
      });
    }
  }

  return list;
}

export function isFacilityAuditClosed(facility: Facility): boolean {
  return Boolean(facility.audit_closure?.closed_at);
}

export function defaultFacilityExportColumnKeys(): FacilityExportColumnKey[] {
  return FACILITY_EXPORT_COLUMNS.filter((column) => column.defaultSelected).map(
    (column) => column.key,
  );
}

export function resolveFacilityExportColumns(
  selectedKeys: FacilityExportColumnKey[],
): FacilityExportColumnDef[] {
  const selected = new Set(selectedKeys);
  return FACILITY_EXPORT_COLUMNS.filter((column) => selected.has(column.key));
}

export function facilityExportCellValue(
  row: Facility,
  key: FacilityExportColumnKey,
): string {
  const auditors = getFacilityAuditors(row);
  const auditorNames =
    auditors
      .map((a) => a.name)
      .filter(Boolean)
      .join(", ") || "—";
  const auditorEmails =
    auditors
      .map((a) => a.email)
      .filter(Boolean)
      .join(", ") || "—";
  const expectedValue = facilityExpectedValue(row);

  switch (key) {
    case "name":
      return row.name ?? "—";
    case "audit_number":
      return row.audit_number ?? "—";
    case "enquiry_number":
      return row.enquiry_number ?? "—";
    case "city":
      return row.city ?? "—";
    case "address":
      return row.address ?? "—";
    case "facility_type":
      return row.facility_type ?? "—";
    case "audit_type":
      return row.audit_type ?? "—";
    case "expected_value":
      return expectedValue != null ? formatInr(expectedValue) : "—";
    case "status":
      return isFacilityAuditClosed(row) ? "Closed" : "Open";
    case "start_date":
      return formatDisplayDate(row.start_date);
    case "closure_date":
      return formatDisplayDate(row.closure_date);
    case "auditor_name":
      return auditorNames;
    case "auditor_email":
      return auditorEmails;
    case "client_representative":
      return row.client_representative ?? "—";
    case "client_contact_number":
      return row.client_contact_number ?? "—";
    case "client_email":
      return row.client_email ?? "—";
    default:
      return "—";
  }
}

export function buildFacilityExportRows(
  rows: Facility[],
  columns: FacilityExportColumnDef[],
): Record<FacilityExportColumnKey, string>[] {
  return rows.map((row) => {
    const record = {} as Record<FacilityExportColumnKey, string>;
    for (const column of columns) {
      record[column.key] = facilityExportCellValue(row, column.key);
    }
    return record;
  });
}

export function buildFacilityExcelSheetRows(
  rows: Facility[],
  columns: FacilityExportColumnDef[],
) {
  return buildFacilityExportRows(rows, columns).map((row) => {
    const sheetRow: Record<string, string> = {};
    for (const column of columns) {
      sheetRow[column.label] = row[column.key];
    }
    return sheetRow;
  });
}

export function facilityExportSheetColumns(
  columns: FacilityExportColumnDef[],
): { key: string; label: string; width?: number }[] {
  return columns.map((column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
  }));
}
