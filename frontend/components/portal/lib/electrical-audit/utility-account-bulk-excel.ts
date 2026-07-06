import {
  ALL_DATASHEET_SECTIONS,
  ENERGY_SECTIONS,
  SAFETY_SECTIONS,
  DEFAULT_DATASHEET_INCLUSIONS,
  DEFAULT_SAFETY_DATASHEET_INCLUSIONS,
  type DataSheetInclusions,
  type DataSheetKey,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";

export type UtilityAccountBulkExcelRow = {
  account_number: string;
  connection_type: string;
  category: string;
  location: string;
  sanctioned_demand_value: string;
  sanctioned_demand_unit: string;
  provider: string;
  billing_cycle: string;
};

export type UtilityAccountBulkParsedRow = UtilityAccountBulkExcelRow & {
  data_sheet_inclusions: DataSheetInclusions;
  is_transformer_maintained_by_facility: boolean;
};

export const CONNECTION_TYPE_OPTIONS = ["LT", "HT"] as const;
export const CATEGORY_OPTIONS = [
  "Industrial",
  "Commercial",
  "Residential",
  "Institutional",
  "Hospital",
  "Other",
] as const;
export const SANCTIONED_DEMAND_UNIT_OPTIONS = ["kVA", "kW", "BHP"] as const;
export const BILLING_CYCLE_OPTIONS = ["monthly", "bi-monthly", "quarterly"] as const;
export const YES_NO_OPTIONS = ["Yes", "No"] as const;

export const UTILITY_ACCOUNT_BULK_EXCEL_FIELDS: {
  key: keyof UtilityAccountBulkExcelRow;
  label: string;
}[] = [
  { key: "account_number", label: "Account Number" },
  { key: "connection_type", label: "Connection Type" },
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
  { key: "sanctioned_demand_value", label: "Sanctioned Demand Value" },
  { key: "sanctioned_demand_unit", label: "Sanctioned Demand Unit" },
  { key: "provider", label: "Provider" },
  { key: "billing_cycle", label: "Billing Cycle" },
];

export const UTILITY_ACCOUNT_BULK_SAFETY_EXCEL_FIELDS: {
  key: keyof UtilityAccountBulkExcelRow;
  label: string;
}[] = [
  { key: "account_number", label: "Account Number" },
  { key: "connection_type", label: "Connection Type" },
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
  { key: "sanctioned_demand_value", label: "Sanctioned Demand (kVA)" },
  { key: "provider", label: "Provider" },
];

type BulkExcelColumn =
  | { kind: "field"; key: keyof UtilityAccountBulkExcelRow; label: string }
  | { kind: "inclusion"; sheetKey: DataSheetKey; label: string }
  | { kind: "transformer_maintained"; label: string };

function getBulkExcelColumns(variant: "energy" | "safety"): BulkExcelColumn[] {
  const baseFields =
    variant === "safety"
      ? UTILITY_ACCOUNT_BULK_SAFETY_EXCEL_FIELDS
      : UTILITY_ACCOUNT_BULK_EXCEL_FIELDS;

  const columns: BulkExcelColumn[] = baseFields.map((field) => ({
    kind: "field",
    key: field.key,
    label: field.label,
  }));

  const sections = variant === "energy" ? ENERGY_SECTIONS : SAFETY_SECTIONS;
  for (const section of sections) {
    columns.push({
      kind: "inclusion",
      sheetKey: section.key,
      label: section.label,
    });
  }

  if (variant === "energy") {
    columns.push({
      kind: "transformer_maintained",
      label: "Transformer Maintained by Facility",
    });
  }

  return columns;
}

function createEmptyDataSheetInclusions(): DataSheetInclusions {
  return ALL_DATASHEET_SECTIONS.reduce(
    (acc, section) => {
      acc[section.key] = false;
      return acc;
    },
    {} as DataSheetInclusions,
  );
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  return String(value).trim();
}

export function parseYesNoCell(value: unknown): boolean {
  const normalized = cellToString(value).toLowerCase();
  if (!normalized) return false;
  return ["yes", "y", "true", "1", "x", "✓", "checked"].includes(normalized);
}

function buildFieldLookupMaps(fields: typeof UTILITY_ACCOUNT_BULK_EXCEL_FIELDS) {
  const labelToKey = new Map<string, keyof UtilityAccountBulkExcelRow>();
  const keySet = new Set<string>();
  for (const { key, label } of fields) {
    keySet.add(key);
    labelToKey.set(normalizeKey(label), key);
    labelToKey.set(normalizeKey(key.replace(/_/g, " ")), key);
  }
  return { labelToKey, keySet };
}

type ParsedColumn =
  | { kind: "field"; key: keyof UtilityAccountBulkExcelRow }
  | { kind: "inclusion"; sheetKey: DataSheetKey }
  | { kind: "transformer_maintained" }
  | null;

function parseHeaderToColumns(
  headerRow: unknown[],
  variant: "energy" | "safety",
): ParsedColumn[] {
  const columns = getBulkExcelColumns(variant);
  const { labelToKey, keySet } = buildFieldLookupMaps(
    variant === "safety"
      ? UTILITY_ACCOUNT_BULK_SAFETY_EXCEL_FIELDS
      : UTILITY_ACCOUNT_BULK_EXCEL_FIELDS,
  );

  const inclusionLabelToKey = new Map<string, DataSheetKey>();
  for (const section of ALL_DATASHEET_SECTIONS) {
    inclusionLabelToKey.set(normalizeKey(section.label), section.key);
    inclusionLabelToKey.set(normalizeKey(section.key), section.key);
  }

  return headerRow.map((cell) => {
    const s = cellToString(cell);
    if (!s) return null;

    const normalized = normalizeKey(s);
    if (keySet.has(s)) {
      return { kind: "field", key: s as keyof UtilityAccountBulkExcelRow };
    }

    const fieldKey = labelToKey.get(normalized);
    if (fieldKey) {
      return { kind: "field", key: fieldKey };
    }

    if (variant === "energy") {
      const sheetKey = inclusionLabelToKey.get(normalized);
      if (sheetKey) {
        return { kind: "inclusion", sheetKey };
      }

      if (
        normalized === "transformer maintained by facility" ||
        normalized === "transformer maintained" ||
        normalized.includes("transformer maintained")
      ) {
        return { kind: "transformer_maintained" };
      }
    }

    return null;
  });
}

function rowHasData(row: unknown[], colKeys: ParsedColumn[]): boolean {
  for (let c = 0; c < colKeys.length; c += 1) {
    const col = colKeys[c];
    if (!col) continue;
    if (cellToString(row[c])) return true;
  }
  return false;
}

function parseDataRow(
  row: unknown[],
  colKeys: ParsedColumn[],
): UtilityAccountBulkParsedRow {
  const out: UtilityAccountBulkParsedRow = {
    account_number: "",
    connection_type: "",
    category: "",
    location: "",
    sanctioned_demand_value: "",
    sanctioned_demand_unit: "kVA",
    provider: "",
    billing_cycle: "",
    data_sheet_inclusions: createEmptyDataSheetInclusions(),
    is_transformer_maintained_by_facility: false,
  };

  for (let c = 0; c < colKeys.length; c += 1) {
    const col = colKeys[c];
    if (!col) continue;
    const value = row[c];

    if (col.kind === "field") {
      out[col.key] = cellToString(value);
      continue;
    }

    if (col.kind === "inclusion") {
      out.data_sheet_inclusions[col.sheetKey] = parseYesNoCell(value);
      continue;
    }

    if (col.kind === "transformer_maintained") {
      out.is_transformer_maintained_by_facility = parseYesNoCell(value);
    }
  }

  if (!out.sanctioned_demand_unit) {
    out.sanctioned_demand_unit = "kVA";
  }

  return out;
}

function listValidationFormula(options: readonly string[]): string {
  return `"${options.join(",")}"`;
}

function applyListValidation(
  sheet: import("exceljs").Worksheet,
  col: number,
  startRow: number,
  endRow: number,
  options: readonly string[],
) {
  const formula = listValidationFormula(options);
  for (let row = startRow; row <= endRow; row += 1) {
    sheet.getCell(row, col).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorTitle: "Invalid value",
      error: `Choose one of: ${options.join(", ")}`,
    };
  }
}

function triggerBrowserDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadUtilityAccountBulkTemplate(options: {
  variant: "energy" | "safety";
  rowCount?: number;
  filename?: string;
}) {
  const ExcelJS = await import("exceljs");
  const columns = getBulkExcelColumns(options.variant);
  const count = options.rowCount ?? 10;
  const filename =
    options.filename ??
    `utility-accounts-bulk-template${options.variant === "safety" ? "-safety" : ""}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Power App";
  const sheet = workbook.addWorksheet("Utility accounts", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  const instruction =
    options.variant === "energy"
      ? "Required: Account Number and Connection Type. Use dropdowns for fixed fields; choose Yes/No for audit sheets (Yes = include)."
      : "Required: Account Number and Connection Type. Use dropdowns where provided.";

  sheet.addRow([instruction, ...Array(columns.length - 1).fill("")]);
  sheet.addRow(columns.map((column) => column.label));

  const headerRow = sheet.getRow(2);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };

  const firstDataRow = 3;
  const lastDataRow = firstDataRow + count - 1;

  for (let rowIndex = firstDataRow; rowIndex <= lastDataRow; rowIndex += 1) {
    const values = columns.map((column) => {
      if (column.kind === "inclusion") {
        const defaultVal = options.variant === "safety"
          ? DEFAULT_SAFETY_DATASHEET_INCLUSIONS[column.sheetKey]
          : DEFAULT_DATASHEET_INCLUSIONS[column.sheetKey];
        return defaultVal ? "Yes" : "No";
      }
      if (column.kind === "transformer_maintained") {
        return "No";
      }
      return "";
    });
    sheet.addRow(values);
  }

  columns.forEach((column, index) => {
    const colNumber = index + 1;
    const excelCol = sheet.getColumn(colNumber);
    excelCol.width = Math.min(
      36,
      Math.max(14, column.label.length + 2),
    );

    if (column.kind === "field") {
      switch (column.key) {
        case "connection_type":
          applyListValidation(
            sheet,
            colNumber,
            firstDataRow,
            lastDataRow,
            CONNECTION_TYPE_OPTIONS,
          );
          break;
        case "category":
          applyListValidation(
            sheet,
            colNumber,
            firstDataRow,
            lastDataRow,
            CATEGORY_OPTIONS,
          );
          break;
        case "sanctioned_demand_unit":
          applyListValidation(
            sheet,
            colNumber,
            firstDataRow,
            lastDataRow,
            SANCTIONED_DEMAND_UNIT_OPTIONS,
          );
          break;
        case "billing_cycle":
          applyListValidation(
            sheet,
            colNumber,
            firstDataRow,
            lastDataRow,
            BILLING_CYCLE_OPTIONS,
          );
          break;
        default:
          break;
      }
      return;
    }

    if (column.kind === "inclusion" || column.kind === "transformer_maintained") {
      applyListValidation(
        sheet,
        colNumber,
        firstDataRow,
        lastDataRow,
        YES_NO_OPTIONS,
      );
      excelCol.alignment = { horizontal: "center" };
    }
  });

  sheet.getRow(1).font = { italic: true, color: { argb: "FF666666" } };

  const buffer = await workbook.xlsx.writeBuffer();
  triggerBrowserDownload(buffer as ArrayBuffer, filename);
}

export function parseUtilityAccountBulkExcel(
  file: File,
  variant: "energy" | "safety",
): Promise<UtilityAccountBulkParsedRow[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const XLSX = await import("xlsx");
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data || !(data instanceof ArrayBuffer)) {
            reject(new Error("Could not read file."));
            return;
          }

          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const firstName = workbook.SheetNames[0];
          if (!firstName) {
            reject(new Error("Workbook has no sheets."));
            return;
          }

          const sheet = workbook.Sheets[firstName];
          const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: "",
            raw: false,
          }) as unknown[][];

          let headerIndex = -1;
          let colKeys: ParsedColumn[] = [];

          for (let r = 0; r < aoa.length; r += 1) {
            const row = aoa[r];
            if (!Array.isArray(row)) continue;
            const keys = parseHeaderToColumns(row, variant);
            if (keys.some((k) => k?.kind === "field" && k.key === "account_number")) {
              headerIndex = r;
              colKeys = keys;
              break;
            }
          }

          if (headerIndex < 0) {
            reject(
              new Error(
                "Header row not found. Use the downloaded template (Account Number column required).",
              ),
            );
            return;
          }

          const parsed: UtilityAccountBulkParsedRow[] = [];
          for (let r = headerIndex + 1; r < aoa.length; r += 1) {
            const row = aoa[r];
            if (!Array.isArray(row) || !rowHasData(row, colKeys)) continue;
            parsed.push(parseDataRow(row, colKeys));
          }

          resolve(parsed);
        } catch (err) {
          reject(
            err instanceof Error ? err : new Error("Failed to parse Excel file."),
          );
        }
      };

      reader.onerror = () => reject(new Error("Could not read file."));
      reader.readAsArrayBuffer(file);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Failed to load Excel parser."));
    }
  });
}
