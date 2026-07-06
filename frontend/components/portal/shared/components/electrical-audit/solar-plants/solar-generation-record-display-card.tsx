"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type { SolarGenerationRecordDocument } from "@/store/slices/electrical-audit/solarGenerationRecordApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import {
  formatBillingPeriodLabel,
  formatDisplayValue,
  type SolarGenerationFormState,
} from "./solar-generation-record-utils";

function DisplayField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
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
  form: SolarGenerationFormState;
  recordId: string;
  auditStepLocked?: boolean;
  canDelete?: boolean;
  canViewDocuments?: boolean;
  saving?: boolean;
  isCompleted?: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  onToggleCompleteness?: () => void;
  togglingCompleteness?: boolean;
  onUploadDocuments: () => void;
  onPreviewDocument: (
    doc: SolarGenerationRecordDocument,
    recordId: string,
    index: number,
  ) => void;
};

export function SolarGenerationRecordDisplayCard({
  form,
  recordId,
  auditStepLocked = false,
  canDelete = false,
  canViewDocuments = true,
  saving = false,
  isCompleted = false,
  onEdit,
  onDelete,
  onToggleCompleteness,
  togglingCompleteness = false,
  onUploadDocuments,
  onPreviewDocument,
}: Props) {
  const recordEditsLocked = isUtilityAuditRecordEditsLocked(
    auditStepLocked,
    isCompleted,
  );

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-4">
      <Card className="min-w-0 overflow-hidden border-dashed bg-muted/10 lg:col-span-3">
        <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-semibold">
            {formatBillingPeriodLabel(
              form.billing_period_start,
              form.billing_period_end,
            )}
            {form.bill_no ? ` · Bill ${form.bill_no}` : ""}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <AuditRecordCompletenessToggle
              isCompleted={isCompleted}
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
        <CardContent className="grid grid-cols-3 gap-x-3 gap-y-3 pb-4 pt-0">
          <DisplayField label="Import kWh" value={form.import_kWh} />
          <DisplayField label="Export kWh" value={form.export_kWh} />
          <DisplayField label="Net kWh" value={form.net_kWh} />
          <DisplayField label="Import kVAh" value={form.import_kVAh} />
          <DisplayField label="Export kVAh" value={form.export_kVAh} />
          <DisplayField label="Net kVAh" value={form.net_kVAh} />
          <DisplayField
            label="Solar Gen. kWh"
            value={form.solar_generation_kWh}
          />
          <DisplayField
            label="Solar Gen. kVAh"
            value={form.solar_generation_kVAh}
          />
          <DisplayField
            label="Solar Gen. kVA"
            value={form.solar_generation_kVA}
          />
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
          ) : form.existingDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No documents yet.</p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-2">
              {form.existingDocuments.map((doc, docIdx) => (
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
                          onPreviewDocument(
                            doc as SolarGenerationRecordDocument,
                            recordId,
                            docIdx,
                          )
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
