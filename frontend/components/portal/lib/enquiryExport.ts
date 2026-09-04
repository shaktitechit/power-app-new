import { assigneeLabel } from "@/components/portal/lib/enquiryAccess";
import { enquiryStatusLabel } from "@/components/portal/lib/enquiryConstants";
import { formatDisplayDate, formatInr } from "@/components/portal/lib/quotationConstants";
import type { Enquiry } from "@/store/slices/enquiryApiSlice";

export type EnquiryExportColumnKey =
  | "enquiry_number"
  | "name"
  | "city"
  | "address"
  | "status"
  | "assigned_auditor"
  | "assigned_manager"
  | "assigned_admin"
  | "expected_value"
  | "audit_types"
  | "next_followup"
  | "created_at"
  | "notes";

export type EnquiryExportColumnDef = {
  key: EnquiryExportColumnKey;
  label: string;
  defaultSelected: boolean;
};

export const ENQUIRY_EXPORT_COLUMNS: EnquiryExportColumnDef[] = [
  { key: "enquiry_number", label: "Enquiry Number", defaultSelected: true },
  { key: "name", label: "Name/Organisation", defaultSelected: true },
  { key: "city", label: "City", defaultSelected: true },
  { key: "address", label: "Address", defaultSelected: true },
  { key: "status", label: "Status", defaultSelected: true },
  { key: "assigned_auditor", label: "Assigned Auditor", defaultSelected: true },
  { key: "assigned_manager", label: "Assigned Manager", defaultSelected: true },
  { key: "assigned_admin", label: "Assigned Admin", defaultSelected: true },
  { key: "expected_value", label: "Expected Value", defaultSelected: true },
  { key: "audit_types", label: "Audit Types", defaultSelected: true },
  { key: "next_followup", label: "Next Follow Up", defaultSelected: true },
  { key: "created_at", label: "Created At", defaultSelected: true },
  { key: "notes", label: "Notes", defaultSelected: false },
];

export function defaultEnquiryExportColumnKeys(): EnquiryExportColumnKey[] {
  return ENQUIRY_EXPORT_COLUMNS.filter((column) => column.defaultSelected).map(
    (column) => column.key,
  );
}

export function resolveEnquiryExportColumns(
  selectedKeys: EnquiryExportColumnKey[],
): EnquiryExportColumnDef[] {
  const selected = new Set(selectedKeys);
  return ENQUIRY_EXPORT_COLUMNS.filter((column) => selected.has(column.key));
}

export function enquiryExportCellValue(
  row: Enquiry,
  key: EnquiryExportColumnKey,
): string {
  switch (key) {
    case "enquiry_number":
      return row.enquiry_number ?? "—";
    case "name":
      return row.name ?? "—";
    case "city":
      return row.city ?? "—";
    case "address":
      return row.address ?? "—";
    case "status":
      return enquiryStatusLabel(row.enquiry_status ?? "");
    case "assigned_auditor":
      return assigneeLabel(row.assigned_to) ?? "—";
    case "assigned_manager":
      return assigneeLabel(row.assigned_manager_to) ?? "—";
    case "assigned_admin":
      return assigneeLabel(row.assigned_admin_to) ?? "—";
    case "expected_value":
      return row.expected_value != null ? formatInr(row.expected_value) : "—";
    case "audit_types":
      return row.requested_audit_types?.join(", ") || "—";
    case "next_followup":
      return formatDisplayDate(row.next_followup_date);
    case "created_at":
      return formatDisplayDate(row.created_at);
    case "notes":
      return row.notes?.trim() || "—";
    default:
      return "—";
  }
}

export function buildEnquiryExportRows(
  rows: Enquiry[],
  columns: EnquiryExportColumnDef[],
): Record<EnquiryExportColumnKey, string>[] {
  return rows.map((row) => {
    const record = {} as Record<EnquiryExportColumnKey, string>;
    for (const column of columns) {
      record[column.key] = enquiryExportCellValue(row, column.key);
    }
    return record;
  });
}

export function buildEnquiryExcelSheetRows(
  rows: Enquiry[],
  columns: EnquiryExportColumnDef[],
) {
  return buildEnquiryExportRows(rows, columns).map((row) => {
    const sheetRow: Record<string, string> = {};
    for (const column of columns) {
      sheetRow[column.label] = row[column.key];
    }
    return sheetRow;
  });
}
