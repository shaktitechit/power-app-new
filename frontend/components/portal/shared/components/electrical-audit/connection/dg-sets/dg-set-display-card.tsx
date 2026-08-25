"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import type {
  DGSet,
  DGSetDocument,
} from "@/store/slices/electrical-audit/dgSetApiSlice";
import { FileText, Pencil, Trash2, Upload, Zap } from "lucide-react";
import { AuditDocumentRows } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-document-row";
import {
  dgSetToForm,
  formatDisplayValue,
  formatFuelType,
} from "./dg-set-utils";
import { DGSetAuditPanel } from "./dg-set-audit-panel";

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
  dgSet: DGSet;
  hasAudit: boolean;
  facilityId: string;
  utilityAccountId: string;
  auditStepLocked?: boolean;
  canDelete?: boolean;
  canViewDocuments?: boolean;
  saving?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUploadDocuments: () => void;
  onPreviewDocument: (
    doc: DGSetDocument,
    dgSetId: string,
    index: number,
  ) => void;
  onDeleteDocument?: (
    doc: DGSetDocument,
    recordId: string,
    index: number,
  ) => void;
};

export function DGSetDisplayCard({
  dgSet,
  hasAudit,
  facilityId,
  utilityAccountId,
  auditStepLocked = false,
  canDelete = false,
  canViewDocuments = true,
  saving = false,
  onEdit,
  onDelete,
  onUploadDocuments,
  onPreviewDocument,
  onDeleteDocument,
}: Props) {
  const form = dgSetToForm(dgSet);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
        <Card
          className={`min-w-0 overflow-hidden border-l-4 lg:col-span-3 ${
            hasAudit ? "border-l-emerald-500" : "border-l-amber-500"
          }`}
        >
          <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="min-w-0 text-base text-balance">
                  {form.dg_number?.trim()
                    ? `DG Set ${form.dg_number.trim()}`
                    : "DG Set"}
                </CardTitle>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    hasAudit
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}
                >
                  {hasAudit ? "Audit completed" : "Audit pending"}
                </span>
              </div>
            </div>
            <div
              className={cnHideUtilityAuditEdits(
                auditStepLocked,
                "flex min-w-0 flex-wrap items-center justify-end gap-2",
              )}
            >
              <Button onClick={onEdit} size="sm" disabled={saving}>
                <Pencil className="mr-2 h-4 w-4" /> Edit DG set
              </Button>
              {canDelete ? (
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  size="sm"
                  disabled={saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-3 gap-y-3 pb-4 pt-0 md:grid-cols-3">
            <DisplayField label="Make / Model" value={form.make_model} />
            <DisplayField
              label="Year of Installation"
              value={form.year_of_installation}
            />
            <DisplayField
              label="Rated Capacity (kVA)"
              value={form.rated_capacity_kVA}
            />
            <DisplayField
              label="Rated Active Power (kW)"
              value={form.rated_active_power_kW}
            />
            <DisplayField
              label="Rated Voltage (V)"
              value={form.rated_voltage_V}
            />
            <DisplayField
              label="Rated Speed (RPM)"
              value={form.rated_speed_RPM}
            />
            <DisplayField label="Fuel Type" value={formatFuelType(form.fuel_type)} />
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden lg:col-span-1">
          <CardHeader className="flex flex-col gap-2 space-y-0 pb-2">
            <CardTitle className="truncate text-base font-semibold">
              Documents
            </CardTitle>
            {!auditStepLocked ? (
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
            ) : (dgSet.documents ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No documents yet.</p>
              </div>
            ) : (
              <AuditDocumentRows
                documents={dgSet.documents ?? []}
                onPreview={(doc, docIdx) => onPreviewDocument(doc, dgSet._id, docIdx)}
                onDelete={
                  !auditStepLocked && onDeleteDocument
                    ? (doc, docIdx) => onDeleteDocument(doc, dgSet._id, docIdx)
                    : undefined
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      <DGSetAuditPanel
        facilityId={facilityId}
        utilityAccountId={utilityAccountId}
        dgSetId={dgSet._id}
        dgNumber={form.dg_number}
        auditStepLocked={auditStepLocked}
      />
    </div>
  );
}
