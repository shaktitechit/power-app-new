"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type {
  HVACAudit,
  HVACAuditDocument,
} from "@/store/slices/electrical-audit/hvacAuditApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import {
  auditToForm,
  formatDisplayValue,
  toDateInput,
} from "./hvac-audit-utils";

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
  record: HVACAudit;
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
  onPreviewDocument: (
    doc: HVACAuditDocument,
    recordId: string,
    index: number,
  ) => void;
};

export function HVACAuditDisplayCard({
  record,
  tabLabel,
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
  const form = auditToForm(record);
  const docs: HVACAuditDocument[] = record.documents ?? [];
  const recordEditsLocked = isUtilityAuditRecordEditsLocked(
    auditStepLocked,
    record.is_completed,
  );
  const auditDates = form.pre_audit_information.audit_dates.filter(Boolean);
  const teamMembers =
    form.pre_audit_information.auditor_team_members_names.filter(Boolean);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
      <Card className="min-w-0 overflow-hidden lg:col-span-3">
        <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <CardTitle className="min-w-0 shrink-0 text-base text-balance">
            {tabLabel}
            {form.audit_date ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {toDateInput(form.audit_date)}
              </span>
            ) : null}
          </CardTitle>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
            <Button onClick={onEdit} size="sm" disabled={saving}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {canDelete ? (
              <Button
                variant="destructive"
                onClick={onDelete}
                size="sm"
                disabled={saving}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-3 gap-x-3 gap-y-3 pb-4 pt-0">
          <DisplayField
            label="Facility Name"
            value={form.pre_audit_information.facility_name}
          />
          <DisplayField
            label="Location Address"
            value={form.pre_audit_information.location_address}
          />
          <DisplayField
            label="Type of Facility"
            value={form.pre_audit_information.type_of_facility}
          />
          <DisplayField label="Audit Date" value={toDateInput(form.audit_date)} />
          <DisplayField
            label="Total Operating Hours / Day"
            value={form.pre_audit_information.total_operating_hours_per_day}
          />
          <DisplayField
            label="HVAC Operating Hours / Day"
            value={form.pre_audit_information.hvac_operating_hours_per_day}
          />
          <DisplayField
            label="Audit Dates"
            value={auditDates.length ? auditDates.join(", ") : undefined}
          />
          <DisplayField
            label="Auditor Team"
            value={teamMembers.length ? teamMembers.join(", ") : undefined}
          />
          <DisplayField
            label="Season / Ambient Conditions"
            value={form.pre_audit_information.season_ambient_conditions}
          />
          <DisplayField
            label="Average Cooling Produced (TR)"
            value={form.summary.average_cooling_produced_TR}
          />
          <DisplayField
            label="Average Chiller Power (kW)"
            value={form.summary.average_chiller_power_used_kW}
          />
          <DisplayField
            label="Total Auxiliary Power (kW)"
            value={form.summary.total_auxiliary_power_used_kW}
          />
          <DisplayField
            label="Total Plant Power (kW)"
            value={form.summary.total_plant_power_kW}
          />
          <DisplayField
            label="Plant Efficiency (kW/TR)"
            value={form.summary.plant_efficiency_kW_per_TR}
          />
          <DisplayField
            label="Coefficient of Performance"
            value={form.summary.coefficient_of_performance}
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
              <Upload className="h-4 w-4 shrink-0" />
              Upload
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="min-w-0 space-y-3 pt-2">
          {!canViewDocuments ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Only super admin, admin, and manager can view uploaded documents.
            </p>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No documents yet.</p>
              {!recordEditsLocked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={onUploadDocuments}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid min-w-0 gap-2">
              {docs.map((doc, docIdx) => {
                const isImage = doc.fileType === "image";
                return (
                  <div
                    key={docIdx}
                    className="flex min-w-0 items-start gap-2 rounded-lg border p-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {isImage ? (
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
                          title={doc.fileName || `Document ${docIdx + 1}`}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
