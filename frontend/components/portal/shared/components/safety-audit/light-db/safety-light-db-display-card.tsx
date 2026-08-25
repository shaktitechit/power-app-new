"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { Pencil, Trash2, Upload } from "lucide-react";
import { AuditDocumentRows } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-document-row";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type { SafetyAuditAttachment, SafetyAuditRecord } from "@/store/slices/safety-audit/safetyAuditTypes";

interface SafetyLightDbDisplayCardProps {
  record: SafetyAuditRecord;
  auditStepLocked?: boolean;
  canDelete?: boolean;
  canMarkPending?: boolean;
  canViewDocuments?: boolean;
  saving?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCompleteness?: () => void;
  togglingCompleteness?: boolean;
  onUploadDocuments: () => void;
  onPreviewDocument: (doc: SafetyAuditAttachment, index: number) => void;
  onDeleteDocument?: (doc: SafetyAuditAttachment, index: number) => void;
}

export function SafetyLightDbDisplayCard({
  record,
  auditStepLocked = false,
  canDelete = false,
  canMarkPending = false,
  canViewDocuments = false,
  saving = false,
  onEdit,
  onDelete,
  onToggleCompleteness,
  togglingCompleteness = false,
  onUploadDocuments,
  onPreviewDocument,
  onDeleteDocument,
}: SafetyLightDbDisplayCardProps) {
  const ldbName =
    typeof record.ldb_name === "string" && record.ldb_name.trim()
      ? record.ldb_name.trim()
      : "Light DB Audit Record";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 pb-4">
        <CardTitle className="text-base font-semibold">{ldbName}</CardTitle>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {(!record.is_completed || canMarkPending) && (
            <AuditRecordCompletenessToggle
              isCompleted={Boolean(record.is_completed)}
              auditStepLocked={auditStepLocked}
              saving={togglingCompleteness || saving}
              onToggle={() => onToggleCompleteness?.()}
            />
          )}
          <div className="flex items-center gap-2">
            {!auditStepLocked && !record.is_completed && (
              <Button variant="outline" size="sm" onClick={onEdit} disabled={saving}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {canDelete && !record.is_completed && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={saving || auditStepLocked}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {typeof record.location === "string" && record.location
                ? record.location
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Audit Date</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {record.audit_date
                ? new Date(record.audit_date).toLocaleDateString()
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-sm font-medium capitalize text-foreground">
              {record.status || "draft"}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Checklist Results</p>
          <div className="relative max-h-[300px] overflow-auto rounded-md border text-sm">
            <table className="w-full min-w-[700px]">
              <thead className="bg-muted text-left text-xs font-semibold text-muted-foreground">
                <tr className="border-b">
                  <th className="p-2 w-10">#</th>
                  <th className="p-2">Activity / Observation</th>
                  <th className="p-2">Requirement</th>
                  <th className="p-2 w-28">Compliance</th>
                  <th className="p-2">Remarks</th>
                  <th className="p-2">Recommendations</th>
                  <th className="p-2 w-24">Severity</th>
                </tr>
              </thead>
              <tbody>
                {record.items?.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="p-2 text-muted-foreground">{item.sr_no || idx + 1}</td>
                    <td className="p-2 text-foreground font-medium">
                      {item.activity_description}
                    </td>
                    <td className="p-2 text-muted-foreground">{item.requirement || "-"}</td>
                    <td className="p-2 capitalize font-semibold">{item.compliance || "—"}</td>
                    <td className="p-2 text-muted-foreground">{item.remarks || "-"}</td>
                    <td className="p-2 text-muted-foreground">
                      {item.recommendations || "-"}
                    </td>
                    <td className="p-2 capitalize font-medium">{item.severity || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border p-4 bg-muted/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground">Attachments</h4>
            {!auditStepLocked && !record.is_completed && (
              <Button variant="outline" size="sm" onClick={onUploadDocuments} disabled={saving}>
                <Upload className="mr-2 h-3.5 w-3.5" />
                Upload File
              </Button>
            )}
          </div>

          {canViewDocuments ? (
            record.documents && record.documents.length > 0 ? (
              <AuditDocumentRows
                documents={record.documents ?? []}
                className="sm:grid-cols-2 lg:grid-cols-3"
                fallbackLabel="Attachment"
                onPreview={(doc, idx) => onPreviewDocument(doc, idx)}
                onDelete={
                  !auditStepLocked && !record.is_completed && onDeleteDocument
                    ? (doc, idx) => onDeleteDocument(doc, idx)
                    : undefined
                }
              />
            ) : (
              <p className="text-xs text-muted-foreground">No documents uploaded.</p>
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              Only super admin, admin, and manager can view uploaded documents.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
