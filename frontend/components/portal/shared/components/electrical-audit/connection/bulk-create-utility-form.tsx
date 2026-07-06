"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Button } from "@/components/portal/ui/button";
import { Checkbox } from "@/components/portal/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { toastHandler } from "@/components/portal/lib/toast";
import {
  ALL_DATASHEET_SECTIONS,
  ENERGY_SECTIONS,
  SAFETY_SECTIONS,
  type DataSheetInclusions,
  type DataSheetKey,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import {
  downloadUtilityAccountBulkTemplate,
  parseUtilityAccountBulkExcel,
  type UtilityAccountBulkParsedRow,
} from "@/components/portal/lib/electrical-audit/utility-account-bulk-excel";
import {
  useBulkCreateUtilityAccountsMutation,
  type BulkCreateUtilityAccountItem,
  type BulkCreateUtilityFailedItem,
} from "@/store/slices/electrical-audit/utilityApiSlice";
import { toast } from "sonner";

const BULK_MAX_ROWS = 100;
const EMPTY_ROW_COUNT = 5;

type BulkRow = {
  localId: string;
  account_number: string;
  connection_type: "" | "LT" | "HT";
  category: string;
  location: string;
  sanctioned_demand_value: string;
  sanctioned_demand_unit: "kVA" | "kW" | "BHP";
  provider: string;
  billing_cycle: string;
  data_sheet_inclusions: DataSheetInclusions;
  is_transformer_maintained_by_facility: boolean;
};

interface BulkCreateUtilityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  facilityId: string;
  variant: "energy" | "safety";
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

function createEmptyRow(): BulkRow {
  return {
    localId: crypto.randomUUID(),
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
}

function createInitialRows(count = EMPTY_ROW_COUNT): BulkRow[] {
  return Array.from({ length: count }, () => createEmptyRow());
}

function excelRowToBulkRow(row: UtilityAccountBulkParsedRow): BulkRow {
  const connection = row.connection_type.trim().toUpperCase();
  const unit = row.sanctioned_demand_unit.trim();
  return {
    localId: crypto.randomUUID(),
    account_number: row.account_number.trim(),
    connection_type: connection === "LT" || connection === "HT" ? connection : "",
    category: row.category.trim(),
    location: row.location.trim(),
    sanctioned_demand_value: row.sanctioned_demand_value.trim(),
    sanctioned_demand_unit:
      unit === "kW" || unit === "BHP" || unit === "kVA" ? unit : "kVA",
    provider: row.provider.trim(),
    billing_cycle: row.billing_cycle.trim(),
    data_sheet_inclusions: { ...row.data_sheet_inclusions },
    is_transformer_maintained_by_facility: row.is_transformer_maintained_by_facility,
  };
}

function rowToPayload(row: BulkRow, variant: "energy" | "safety"): BulkCreateUtilityAccountItem {
  const payload: BulkCreateUtilityAccountItem = {
    account_number: row.account_number.trim(),
    connection_type: row.connection_type as "LT" | "HT",
  };

  const category = row.category.trim() || undefined;
  const location = row.location.trim() || undefined;
  const provider = row.provider.trim() || undefined;

  if (category) payload.category = category;
  if (location) payload.location = location;
  if (provider) payload.provider = provider;

  if (row.sanctioned_demand_value) {
    payload.sanctioned_demand_value = Number(row.sanctioned_demand_value);
    if (variant === "energy") {
      payload.sanctioned_demand_unit = row.sanctioned_demand_unit;
    }
  }

  if (variant === "energy" && row.billing_cycle.trim()) {
    payload.billing_cycle = row.billing_cycle.trim();
  }

  payload.data_sheet_inclusions = row.data_sheet_inclusions;

  if (variant === "energy") {
    payload.is_transformer_maintained_by_facility =
      row.is_transformer_maintained_by_facility;
  }

  return payload;
}

function countSelectedSheets(inclusions: DataSheetInclusions): number {
  return ALL_DATASHEET_SECTIONS.filter((section) => inclusions[section.key]).length;
}

function RowDataSheetCheckboxes({
  row,
  variant,
  onInclusionChange,
  onTransformerMaintainedChange,
}: {
  row: BulkRow;
  variant: "energy" | "safety";
  onInclusionChange: (key: DataSheetKey, checked: boolean) => void;
  onTransformerMaintainedChange: (checked: boolean) => void;
}) {
  const sections = variant === "energy" ? ENERGY_SECTIONS : SAFETY_SECTIONS;
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">
          {variant === "energy" ? "Audit data sheets" : "Audit safety checklists"}
        </p>
        <p className="text-xs text-muted-foreground">
          Select which sheets apply to this account.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <label
            key={section.key}
            htmlFor={`${row.localId}-${section.key}`}
            className="flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5"
          >
            <Checkbox
              id={`${row.localId}-${section.key}`}
              checked={row.data_sheet_inclusions[section.key]}
              onCheckedChange={(value) =>
                onInclusionChange(section.key, value === true)
              }
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block text-xs font-medium">{section.label}</span>
              {section.description ? (
                <span className="block text-[10px] leading-snug text-muted-foreground">
                  {section.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {variant === "energy" && (
        <label
          htmlFor={`${row.localId}-transformer-maintained`}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <Checkbox
            id={`${row.localId}-transformer-maintained`}
            checked={row.is_transformer_maintained_by_facility}
            onCheckedChange={(value) => onTransformerMaintainedChange(value === true)}
          />
          Transformer maintained by facility
        </label>
      )}
    </div>
  );
}

export function BulkCreateUtilityForm({
  open,
  onOpenChange,
  onComplete,
  facilityId,
  variant,
}: BulkCreateUtilityFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkCreate, { isLoading }] = useBulkCreateUtilityAccountsMutation();

  const [rows, setRows] = useState<BulkRow[]>(() => createInitialRows());
  const [submitError, setSubmitError] = useState("");
  const [importFailures, setImportFailures] = useState<BulkCreateUtilityFailedItem[]>([]);

  const resetForm = () => {
    setRows(createInitialRows());
    setSubmitError("");
    setImportFailures([]);
  };

  const filledRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.account_number.trim().length > 0 ||
          row.connection_type.trim().length > 0,
      ),
    [rows],
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (filledRows.length === 0) {
      errors.push("Add at least one utility account row.");
    }
    if (filledRows.length > BULK_MAX_ROWS) {
      errors.push(`Maximum ${BULK_MAX_ROWS} accounts per bulk import.`);
    }
    filledRows.forEach((row, index) => {
      if (!row.account_number.trim()) {
        errors.push(`Row ${index + 1}: account number is required.`);
      }
      if (!row.connection_type) {
        errors.push(`Row ${index + 1}: connection type must be LT or HT.`);
      }
    });
    return errors;
  }, [filledRows]);

  const updateRow = (localId: string, patch: Partial<BulkRow>) => {
    setRows((prev) =>
      prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    );
  };

  const updateRowInclusion = (localId: string, key: DataSheetKey, checked: boolean) => {
    setRows((prev) =>
      prev.map((row) =>
        row.localId === localId
          ? {
              ...row,
              data_sheet_inclusions: {
                ...row.data_sheet_inclusions,
                [key]: checked,
              },
            }
          : row,
      ),
    );
  };

  const addRow = () => {
    if (rows.length >= BULK_MAX_ROWS) {
      toast.error(`Maximum ${BULK_MAX_ROWS} rows allowed.`);
      return;
    }
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (localId: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.localId !== localId);
      return next.length ? next : [createEmptyRow()];
    });
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadUtilityAccountBulkTemplate({ variant });
      toast.success("Template downloaded.");
    } catch (err) {
      console.error(err);
      toast.error("Could not download template.");
    }
  };

  const handleExcelFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast.error("Please choose an Excel file (.xlsx or .xls).");
      return;
    }

    try {
      const parsed = await parseUtilityAccountBulkExcel(file, variant);
      if (!parsed.length) {
        toast.error("No data rows found. Fill the template and try again.");
        return;
      }
      if (parsed.length > BULK_MAX_ROWS) {
        toast.error(`Import limited to ${BULK_MAX_ROWS} rows.`);
        return;
      }
      setRows(parsed.map(excelRowToBulkRow));
      setImportFailures([]);
      toast.success(`Loaded ${parsed.length} row(s) from Excel.`);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not read that Excel file.",
      );
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    setImportFailures([]);

    if (validationErrors.length) {
      setSubmitError(validationErrors[0]);
      return;
    }

    const accounts = filledRows.map((row) => rowToPayload(row, variant));

    try {
      const response = await toastHandler({
        action: () =>
          bulkCreate({
            facility_id: facilityId,
            accounts,
          }).unwrap(),
        loading: "Creating utility accounts...",
        success: "Utility accounts created",
      });

      if (response.data.failed.length > 0) {
        const failedIndices = new Set(response.data.failed.map((item) => item.index));
        const remaining = filledRows
          .filter((_, index) => failedIndices.has(index))
          .map((row) => ({ ...row, localId: crypto.randomUUID() }));

        setRows(remaining.length ? remaining : createInitialRows(1));
        setImportFailures(response.data.failed);
        setSubmitError(
          `${response.data.summary.created} created, ${response.data.summary.failed} failed. Fix failed rows and submit again.`,
        );
        onComplete();
        return;
      }

      onComplete();
      resetForm();
      onOpenChange(false);
    } catch {
      /* toastHandler surfaces API errors */
    }
  };

  const title =
    variant === "safety"
      ? "Bulk Add Utility Accounts (Safety Audit)"
      : "Bulk Add Utility Accounts";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadTemplate()}>
              <Download className="mr-2 h-4 w-4" />
              Download template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => void handleExcelFileChange(e)}
            />
            <span className="text-xs text-muted-foreground">
              Up to {BULK_MAX_ROWS} accounts per request
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Accounts</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-1 h-4 w-4" />
                Add row
              </Button>
            </div>

            <div className="space-y-4">
              {rows.map((row, index) => {
                const selectedSheets = countSelectedSheets(row.data_sheet_inclusions);
                const hasContent =
                  row.account_number.trim().length > 0 ||
                  row.connection_type.trim().length > 0;

                return (
                  <div
                    key={row.localId}
                    className="rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Account {index + 1}
                        {hasContent && row.account_number.trim()
                          ? ` — ${row.account_number.trim()}`
                          : ""}
                        {variant === "energy" && selectedSheets > 0 ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({selectedSheets} sheet{selectedSheets === 1 ? "" : "s"} selected)
                          </span>
                        ) : null}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => removeRow(row.localId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Account number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          value={row.account_number}
                          onChange={(e) =>
                            updateRow(row.localId, { account_number: e.target.value })
                          }
                          placeholder="UA-001"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Connection type <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={row.connection_type}
                          onValueChange={(value) =>
                            updateRow(row.localId, {
                              connection_type: value as BulkRow["connection_type"],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="LT / HT" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LT">LT</SelectItem>
                            <SelectItem value="HT">HT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Category</Label>
                        <Select
                          value={row.category}
                          onValueChange={(value) =>
                            updateRow(row.localId, { category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Industrial">Industrial</SelectItem>
                            <SelectItem value="Commercial">Commercial</SelectItem>
                            <SelectItem value="Residential">Residential</SelectItem>
                            <SelectItem value="Institutional">Institutional</SelectItem>
                            <SelectItem value="Hospital">Hospital</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Location</Label>
                        <Input
                          value={row.location}
                          onChange={(e) =>
                            updateRow(row.localId, { location: e.target.value })
                          }
                          placeholder="Enter location"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Sanctioned demand</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={row.sanctioned_demand_value}
                            onChange={(e) =>
                              updateRow(row.localId, {
                                sanctioned_demand_value: e.target.value,
                              })
                            }
                            placeholder="Value"
                            className="flex-1"
                          />
                          {variant === "energy" ? (
                            <Select
                              value={row.sanctioned_demand_unit}
                              onValueChange={(value) =>
                                updateRow(row.localId, {
                                  sanctioned_demand_unit: value as BulkRow["sanctioned_demand_unit"],
                                })
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kVA">kVA</SelectItem>
                                <SelectItem value="kW">kW</SelectItem>
                                <SelectItem value="BHP">BHP</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="flex w-14 items-center text-xs text-muted-foreground">
                              kVA
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Provider</Label>
                        <Input
                          value={row.provider}
                          onChange={(e) =>
                            updateRow(row.localId, { provider: e.target.value })
                          }
                          placeholder="e.g. PSPCL, DHBVN"
                        />
                      </div>

                      {variant === "energy" ? (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Billing cycle</Label>
                          <Select
                            value={row.billing_cycle}
                            onValueChange={(value) =>
                              updateRow(row.localId, { billing_cycle: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select billing cycle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>

                    <RowDataSheetCheckboxes
                      row={row}
                      variant={variant}
                      onInclusionChange={(key, checked) =>
                        updateRowInclusion(row.localId, key, checked)
                      }
                      onTransformerMaintainedChange={(checked) =>
                        updateRow(row.localId, {
                          is_transformer_maintained_by_facility: checked,
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {importFailures.length > 0 ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">Failed rows</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                {importFailures.map((item) => (
                  <li key={`${item.index}-${item.account_number ?? "row"}`}>
                    Row {(item.index ?? 0) + 1}
                    {item.account_number ? ` (${item.account_number})` : ""}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {submitError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading || validationErrors.length > 0}
          >
            {isLoading ? "Creating..." : `Create ${filledRows.length || ""} account${filledRows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
