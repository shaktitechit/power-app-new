"use client";

import { useMemo, useState } from "react";
import { cn } from "@/components/portal/lib/utils";

export type SheetColumn = {
  key: string;
  label: string;
  headerLetter?: string;
  type?: "text" | "number" | "currency";
  width?: number;
};

export type SheetRow = Record<string, string | number>;

function columnLetter(index: number): string {
  let n = index;
  let result = "";
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function formatCellValue(
  value: string | number | undefined,
  type: SheetColumn["type"],
): string {
  if (value === undefined || value === null || value === "") return "—";
  if (type === "currency" && typeof value === "number") {
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return String(value);
}

interface GoogleSheetGridProps {
  columns: SheetColumn[];
  rows: SheetRow[];
  emptyMessage?: string;
  className?: string;
  fillHeight?: boolean;
  selectedRowIndex?: number | null;
  selectedRowIndices?: number[];
  onRowSelect?: (rowIndex: number) => void;
  onSelectAll?: () => void;
  isMultiSelect?: boolean;
}

export function GoogleSheetGrid({
  columns,
  rows,
  emptyMessage = "No records for this section.",
  className,
  fillHeight = false,
  selectedRowIndex = null,
  selectedRowIndices = [],
  onRowSelect,
  onSelectAll,
  isMultiSelect = false,
}: GoogleSheetGridProps) {
  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number;
    colKey: string;
  } | null>(null);

  const resolvedColumns = useMemo(
    () =>
      columns.map((col, index) => ({
        ...col,
        headerLetter: col.headerLetter ?? columnLetter(index),
      })),
    [columns],
  );

  const fxLabel = useMemo(() => {
    if (isMultiSelect && selectedRowIndices.length > 0) {
      return `${selectedRowIndices.length} row(s) selected — use bulk completion controls.`;
    }

    if (onRowSelect && selectedRowIndex !== null && selectedRowIndex >= 0) {
      return `Row ${selectedRowIndex + 1} selected — use the completion controls above the grid.`;
    }

    if (!selectedCell) {
      return onRowSelect
        ? isMultiSelect
          ? "Click a row checkbox or index to select multiple records for bulk actions."
          : "Click a row number to select a record and mark it completed or pending."
        : "Read-only audit preview. Click a cell to inspect its value.";
    }

    const row = rows[selectedCell.rowIndex];
    const column = resolvedColumns.find((col) => col.key === selectedCell.colKey);
    if (!row || !column) return "";

    return `Row ${selectedCell.rowIndex + 1} · ${column.label}: ${formatCellValue(
      row[selectedCell.colKey],
      column.type,
    )}`;
  }, [selectedCell, rows, resolvedColumns, onRowSelect, selectedRowIndex, selectedRowIndices, isMultiSelect]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-background",
        fillHeight && "min-h-0 flex-1",
        className,
      )}
    >
      <div className="flex shrink-0 items-center border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-mono text-muted-foreground">
        <span className="pr-2 font-bold text-foreground/70">fx</span>
        <span className="truncate italic">{fxLabel}</span>
      </div>

      <div
        className={cn(
          "overflow-auto",
          fillHeight ? "min-h-0 flex-1" : "max-h-[min(52vh,480px)]",
        )}
      >
        <table className="w-full border-collapse text-xs select-none">
          <thead>
            <tr className="sticky top-0 z-20 bg-muted/80">
              <th className="w-10 border-r border-b border-border bg-muted/60 py-2 text-center text-[10px] font-medium text-muted-foreground">
                {isMultiSelect ? (
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-input bg-background accent-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                      checked={rows.length > 0 && selectedRowIndices.length === rows.length}
                      onChange={() => onSelectAll?.()}
                    />
                  </div>
                ) : (
                  <span>&nbsp;</span>
                )}
              </th>
              {resolvedColumns.map((col) => (
                <th
                  key={col.key}
                  style={{ minWidth: col.width ?? 120 }}
                  className="border-r border-b border-border px-2 py-1 text-center font-semibold text-foreground/80"
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[9px] text-muted-foreground">
                      {col.headerLetter}
                    </span>
                    <span className="text-[10px] leading-tight">{col.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={resolvedColumns.length + 1}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const isRowChecked = selectedRowIndices.includes(rowIndex);
                const isRowSelected = selectedRowIndex === rowIndex || isRowChecked;

                return (
                  <tr
                    key={rowIndex}
                    className={cn(
                      "bg-background hover:bg-muted/20",
                      isRowSelected && "bg-primary/5",
                    )}
                  >
                    <td
                      onClick={() => onRowSelect?.(rowIndex)}
                      className={cn(
                        "sticky left-0 border-r border-b border-border bg-muted/30 py-1.5 text-center text-[10px] font-mono text-muted-foreground",
                        onRowSelect && "cursor-pointer hover:bg-muted/50",
                        isRowSelected &&
                          "bg-primary/15 font-semibold text-primary",
                      )}
                    >
                      {isMultiSelect ? (
                        <div className="flex items-center justify-center gap-1.5 px-1">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-input bg-background accent-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                            checked={isRowChecked}
                            readOnly
                          />
                          <span className="text-[9px]">{rowIndex + 1}</span>
                        </div>
                      ) : (
                        rowIndex + 1
                      )}
                    </td>
                    {resolvedColumns.map((col) => {
                      const isSelected =
                        selectedCell?.rowIndex === rowIndex &&
                        selectedCell?.colKey === col.key;
                      const isNumeric =
                        col.type === "number" || col.type === "currency";

                      return (
                        <td
                          key={col.key}
                          onClick={() =>
                            setSelectedCell({ rowIndex, colKey: col.key })
                          }
                          className={cn(
                            "cursor-pointer border-r border-b border-border px-3 py-1.5 font-mono text-foreground whitespace-normal break-words align-top",
                            isNumeric ? "text-right" : "text-left",
                            isSelected &&
                              "bg-primary/10 font-semibold ring-2 ring-primary ring-inset",
                          )}
                        >
                          {col.type === "currency" ? (
                            <span>{formatCellValue(row[col.key], col.type)}</span>
                          ) : (
                            formatCellValue(row[col.key], col.type)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function exportSheetRowsToCsv(
  columns: SheetColumn[],
  rows: SheetRow[],
  filename: string,
) {
  const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(",");
  const body = rows.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        if (value === undefined || value === null) return '""';
        if (typeof value === "number") return String(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(","),
  );

  const csvContent = [headers, ...body].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
