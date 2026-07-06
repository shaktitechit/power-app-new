"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type {
  TransformerAuditRecord,
  TransformerAuditDocument,
} from "@/store/slices/electrical-audit/transformerAuditRecordApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import {
  formatDisplayValue,
  formatQualityValue,
  formatOilLevel,
} from "./transformer-audit-utils";

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
  record: TransformerAuditRecord;
  transformerTag?: string;
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
    doc: TransformerAuditDocument,
    recordId: string,
    index: number,
  ) => void;
};

export function TransformerAuditDisplayCard({
  record,
  transformerTag,
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
            {transformerTag ? `Transformer ${transformerTag} audit` : "Transformer audit record"}
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
          <DisplayField label="Total Losses (kW)" value={record.total_losses_kW} />
          <DisplayField label="Average Load (kVA)" value={record.average_load_kVA} />
          <DisplayField label="Percent Loading (%)" value={record.percent_loading} />
          <DisplayField label="Max Load (kVA)" value={record.max_load_kVA} />
          <DisplayField label="Load Factor (%)" value={record.load_factor_percent} />
          <DisplayField label="Operating Hours / Year" value={record.operating_hours_per_year} />
          <DisplayField label="Annual Supplied Energy (kWh)" value={record.annual_energy_supplied_kWh} />
          <DisplayField label="Annual Energy Losses (kWh)" value={record.annual_energy_losses_kWh} />
          <DisplayField label="Per Unit Cost (Rs)" value={record.per_unit_cost_rs} />
          <DisplayField label="Cost of Losses (Rs)" value={record.cost_of_losses_rs} />
          <DisplayField label="Power Factor (LT)" value={record.power_factor_LT} />
          <DisplayField label="Harmonics THD (%)" value={record.harmonics_THD_percent} />
          <DisplayField label="Neutral Earth Res (ohms)" value={record.neutral_earth_resistance_ohms} />
          <DisplayField label="Body Earth Res (ohms)" value={record.body_to_earth_resistance_ohms} />
          <DisplayField label="Silica Gel (Cobalt)" value={formatQualityValue(record.silica_gel_cobalt_type)} />
          <DisplayField label="Silica Gel (Non-Cobalt)" value={formatQualityValue(record.silica_gel_non_cobalt_type)} />
          <DisplayField label="Oil Level" value={formatOilLevel(record.oil_level)} />
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
