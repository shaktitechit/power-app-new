"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import type {
  Pump,
  PumpDocument,
} from "@/store/slices/electrical-audit/pumpApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import { formatDisplayValue } from "./pump-audit-utils";
import { PumpAuditPanel } from "./pump-audit-panel";

function DisplayField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

type Props = {
  pump: Pump;
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
    doc: PumpDocument,
    pumpId: string,
    index: number,
  ) => void;
};

export function PumpDisplayCard({
  pump,
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
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-4">
        <Card className="min-w-0 overflow-hidden lg:col-span-3">
          <CardHeader className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg font-bold">
                {pump.pump_tag_number ? `Pump ${pump.pump_tag_number}` : "Pump details"}
              </CardTitle>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  hasAudit
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                }`}
              >
                {hasAudit ? "Audit completed" : "Audit pending"}
              </span>
            </div>
            <div
              className={cnHideUtilityAuditEdits(
                auditStepLocked,
                "flex flex-wrap items-center gap-2",
              )}
            >
              <Button
                onClick={onEdit}
                size="sm"
                variant="outline"
                disabled={saving}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              {canDelete && (
                <Button
                  onClick={onDelete}
                  size="sm"
                  variant="destructive"
                  disabled={saving}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 pb-6 pt-0 md:grid-cols-3">
            <DisplayField label="Make / Model" value={pump.make_model} />
            <DisplayField label="Rated Power (kW/HP)" value={pump.rated_power_kW_or_HP} />
            <DisplayField label="Rated Efficiency (Motor) (%)" value={pump.rated_efficiency_motor_percent} />
            <DisplayField label="Rated Flow (Liters/Hour)" value={pump.rated_flow_liters_per_hour} />
            <DisplayField label="Rated Flow (m³/hr)" value={pump.rated_flow_m3_per_hr} />
            <DisplayField label="Rated Head (m)" value={pump.rated_head_m} />
            <DisplayField label="Rated Speed (RPM)" value={pump.rated_speed_RPM} />
            <DisplayField label="Number of Stages" value={pump.number_of_stages} />
            <DisplayField label="Year of Installation" value={pump.year_of_installation} />
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
            ) : (pump.documents ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No documents yet.</p>
              </div>
            ) : (
              <div className="grid min-w-0 gap-2">
                {(pump.documents ?? []).map((doc, docIdx) => (
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
                          onClick={() => onPreviewDocument(doc, pump._id, docIdx)}
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

      <PumpAuditPanel
        pump={pump}
        facilityId={facilityId}
        utilityAccountId={utilityAccountId}
        auditStepLocked={auditStepLocked}
      />
    </div>
  );
}
