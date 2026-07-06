"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type { LuxMeasurementRecord, LuxMeasurementDocument } from "@/store/slices/electrical-audit/luxMeasurementApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import { auditToForm, formatDisplayValue, toDateInput } from "./lux-measurement-utils";

function DisplayField({ label, value }: { label: string; value?: string | number | null | boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{formatDisplayValue(value)}</p>
    </div>
  );
}

type Props = {
  record: LuxMeasurementRecord;
  tabLabel: string;
  auditStepLocked?: boolean;
  canDelete?: boolean;
  canViewDocuments?: boolean;
  saving?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCompleteness?: () => void;
  togglingCompleteness?: boolean;
  onUploadDocuments: () => void;
  onPreviewDocument: (doc: LuxMeasurementDocument, recordId: string, index: number) => void;
};

export function LuxMeasurementDisplayCard({ record, tabLabel, auditStepLocked = false, canDelete = false, canViewDocuments = true, saving = false, onEdit, onDelete, onToggleCompleteness, togglingCompleteness = false, onUploadDocuments, onPreviewDocument }: Props) {
  const form = auditToForm(record);
  const recordEditsLocked = isUtilityAuditRecordEditsLocked(auditStepLocked, record.is_completed);
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
      <Card className="min-w-0 overflow-hidden lg:col-span-3">
        <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <CardTitle className="min-w-0 shrink-0 text-base text-balance">
            {tabLabel}{form.audit_date ? <span className="font-normal text-muted-foreground"> · {toDateInput(form.audit_date)}</span> : null}
          </CardTitle>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <AuditRecordCompletenessToggle
              isCompleted={Boolean(record.is_completed)}
              auditStepLocked={auditStepLocked}
              saving={togglingCompleteness || saving}
              onToggle={() => onToggleCompleteness?.()}
            />
            <div className={cnHideUtilityAuditEdits(recordEditsLocked, "flex flex-wrap items-center gap-2")}>
            <Button onClick={onEdit} size="sm" disabled={saving}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
            {canDelete ? <Button variant="destructive" onClick={onDelete} size="sm" disabled={saving}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-x-3 gap-y-3 pb-4 pt-0">
          <DisplayField label="Area / Location" value={form.area_location} />
          <DisplayField label="Room Type" value={form.room_type} />
          <DisplayField label="Required Lux" value={form.required_lux} />
          <DisplayField label="Measured Lux Point 1" value={form.measured_lux_point_1} />
          <DisplayField label="Measured Lux Point 2" value={form.measured_lux_point_2} />
          <DisplayField label="Measured Lux Point 3" value={form.measured_lux_point_3} />
          <DisplayField label="Average Lux" value={form.average_lux} />
          <DisplayField label="Compliance" value={form.compliance === undefined ? undefined : form.compliance ? "Yes" : "No"} />
          <DisplayField label="Remarks" value={form.remarks} />
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden lg:col-span-1">
        <CardHeader className="flex flex-col gap-2 space-y-0 pb-2">
          <CardTitle className="truncate text-base font-semibold">Documents</CardTitle>
          {!recordEditsLocked ? <Button type="button" variant="outline" size="sm" className="w-full shrink-0 gap-2" onClick={onUploadDocuments}><Upload className="h-4 w-4 shrink-0" /> Upload</Button> : null}
        </CardHeader>
        <CardContent className="min-w-0 space-y-3 pt-2">
          {!canViewDocuments ? <p className="py-4 text-center text-xs text-muted-foreground">Only super admin, admin, and manager can view uploaded documents.</p> :
            (record.documents ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No documents yet.</p>
              </div>
            ) : (
              <div className="grid min-w-0 gap-2">
                {(record.documents ?? []).map((doc, docIdx) => (
                  <div key={docIdx} className="flex min-w-0 items-start gap-2 rounded-lg border p-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {doc.fileType === "image" ? <ImageIcon className="h-4 w-4 shrink-0 text-primary" /> : <FileText className="h-4 w-4 shrink-0 text-destructive" />}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <button type="button" onClick={() => onPreviewDocument(doc, record._id, docIdx)} className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline">
                          {doc.fileName || `Document ${docIdx + 1}`}
                        </button>
                        {doc.caption ? <p className="truncate text-xs text-muted-foreground" title={doc.caption}>{doc.caption}</p> : null}
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
