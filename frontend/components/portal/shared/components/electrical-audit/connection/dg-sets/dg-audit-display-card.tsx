"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type {
  DGAuditRecord,
  DGAuditRecordDocument,
} from "@/store/slices/electrical-audit/dgAuditRecordApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import {
  formatDisplayValue,
  formatFilterCondition,
} from "./dg-audit-utils";

function DisplayField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null | boolean;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-[11px] leading-tight text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-medium text-foreground">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

type Props = {
  record: DGAuditRecord;
  dgNumber?: string;
  auditStepLocked?: boolean;
  canDelete?: boolean;
  canViewDocuments?: boolean;
  saving?: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  onToggleCompleteness?: () => void;
  togglingCompleteness?: boolean;
  onUploadDocuments: () => void;
  onPreviewDocument: (
    doc: DGAuditRecordDocument,
    recordId: string,
    index: number,
  ) => void;
};

export function DGAuditDisplayCard({
  record,
  dgNumber,
  auditStepLocked = false,
  canDelete = false,
  canViewDocuments = true,
  saving = false,
  onEdit,
  onDelete,
  onToggleCompleteness,
  togglingCompleteness = false,
  onUploadDocuments,
  onPreviewDocument,
}: Props) {
  const recordEditsLocked = isUtilityAuditRecordEditsLocked(
    auditStepLocked,
    record.is_completed,
  );

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-4">
      <Card className="min-w-0 overflow-hidden border-dashed bg-muted/10 lg:col-span-3">
        <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-semibold">
            {dgNumber ? `DG Set ${dgNumber} audit` : "DG audit record"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <AuditRecordCompletenessToggle
              isCompleted={Boolean(record.is_completed)}
              auditStepLocked={auditStepLocked}
              saving={togglingCompleteness || saving}
              onToggle={() => onToggleCompleteness?.()}
            />
            <div
              className={cnHideUtilityAuditEdits(
                recordEditsLocked,
                "flex flex-wrap items-center gap-2",
              )}
            >
            <Button onClick={onEdit} size="sm" variant="outline" disabled={saving}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            {canDelete && onDelete ? (
              <Button
                onClick={onDelete}
                size="sm"
                variant="destructive"
                disabled={saving}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-3 gap-y-3 pb-4 pt-0 md:grid-cols-3">
          <DisplayField
            label="Measured kW Output"
            value={record.measured_kW_output}
          />
          <DisplayField
            label="Measured kVA Output"
            value={record.measured_kVA_output}
          />
          <DisplayField label="Power Factor" value={record.power_factor} />
          <DisplayField label="Frequency (Hz)" value={record.frequency_Hz} />
          <DisplayField
            label="Avg Loading (%)"
            value={record.average_loading_percent}
          />
          <DisplayField
            label="Load Factor (%)"
            value={record.load_factor_percent}
          />
          <DisplayField
            label="Units Generated / Year (kWh)"
            value={record.units_generated_per_year_kWh}
          />
          <DisplayField
            label="Specific Fuel Cons. (L/kWh)"
            value={record.specific_fuel_consumption_l_per_kWh}
          />
          <DisplayField
            label="DG Cost / kWh (Rs)"
            value={record.dg_cost_per_kWh_rs}
          />
          <DisplayField
            label="Grid Cost / kWh (Rs)"
            value={record.grid_cost_per_kWh_rs}
          />
          <DisplayField
            label="Calculated Efficiency (%)"
            value={record.calculated_efficiency_percent}
          />
          <DisplayField
            label="Efficiency Deviation (%)"
            value={record.efficiency_deviation_percent}
          />
          <DisplayField
            label="Air/Fuel Filter"
            value={formatFilterCondition(record.air_fuel_filter_condition)}
          />
          <DisplayField
            label="Smoke / Vibration"
            value={record.visible_smoke_or_abnormal_vibration}
          />
          <div className="min-w-0 space-y-0.5 md:col-span-3">
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              Remarks
            </p>
            <p className="whitespace-pre-wrap text-sm font-medium text-foreground">
              {formatDisplayValue(record.remarks)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden lg:col-span-1">
        <CardHeader className="flex flex-col gap-2 space-y-0 pb-2">
          <CardTitle className="truncate text-base font-semibold">
            Documents
          </CardTitle>
          {!recordEditsLocked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0 gap-2"
              onClick={onUploadDocuments}
            >
              <Upload className="h-4 w-4 shrink-0" /> Upload
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="min-w-0 space-y-3 pt-2">
          {!canViewDocuments ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Only super admin, admin, and manager can view uploaded documents.
            </p>
          ) : (record.documents ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No documents yet.</p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-2">
              {(record.documents ?? []).map((doc, docIdx) => (
                <div
                  key={docIdx}
                  className="flex min-w-0 items-start gap-2 rounded-lg border p-2"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {doc.fileType === "image" ? (
                      <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <button
                        type="button"
                        onClick={() =>
                          onPreviewDocument(doc, record._id, docIdx)
                        }
                        className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                      >
                        {doc.fileName || `Document ${docIdx + 1}`}
                      </button>
                      {doc.caption ? (
                        <p
                          className="truncate text-xs text-muted-foreground"
                          title={doc.caption}
                        >
                          {doc.caption}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
