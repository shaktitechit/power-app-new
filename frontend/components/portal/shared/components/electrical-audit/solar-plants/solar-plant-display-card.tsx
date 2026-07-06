"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import type {
  SolarPlant,
  SolarPlantDocument,
} from "@/store/slices/electrical-audit/solarPlantApiSlice";
import type { SolarGenerationRecord } from "@/store/slices/electrical-audit/solarGenerationRecordApiSlice";
import type { UtilityBillingRecord } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import { FileText, ImageIcon, Pencil, Sun, Trash2, Upload } from "lucide-react";
import { formatDisplayValue, plantToForm } from "./solar-plant-utils";
import { SolarPlantBillingAuditsPanel } from "./solar-plant-billing-audits-panel";

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
  plant: SolarPlant;
  auditedPeriods: number;
  totalPeriods: number;
  facilityId: string;
  utilityAccountId: string;
  utilityBillingRecords: UtilityBillingRecord[];
  solarGenerationRecords: SolarGenerationRecord[];
  auditStepLocked?: boolean;
  canDelete?: boolean;
  canViewDocuments?: boolean;
  saving?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUploadDocuments: () => void;
  onPreviewDocument: (
    doc: SolarPlantDocument,
    plantId: string,
    index: number,
  ) => void;
};

export function SolarPlantDisplayCard({
  plant,
  auditedPeriods,
  totalPeriods,
  facilityId,
  utilityAccountId,
  utilityBillingRecords,
  solarGenerationRecords,
  auditStepLocked = false,
  canDelete = false,
  canViewDocuments = true,
  saving = false,
  onEdit,
  onDelete,
  onUploadDocuments,
  onPreviewDocument,
}: Props) {
  const form = plantToForm(plant);
  const allPeriodsAudited =
    totalPeriods > 0 && auditedPeriods >= totalPeriods;
  const hasPartialAudit = auditedPeriods > 0 && !allPeriodsAudited;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
        <Card
          className={`min-w-0 overflow-hidden border-l-4 lg:col-span-3 ${
            allPeriodsAudited
              ? "border-l-emerald-500"
              : hasPartialAudit
                ? "border-l-sky-500"
                : "border-l-amber-500"
          }`}
        >
          <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sun className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="min-w-0 text-base text-balance">
                  {form.plant_name?.trim() || "Solar Plant"}
                </CardTitle>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    allPeriodsAudited
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : hasPartialAudit
                        ? "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}
                >
                  {totalPeriods > 0
                    ? `${auditedPeriods} of ${totalPeriods} periods audited`
                    : "Awaiting billing records"}
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
                <Pencil className="mr-2 h-4 w-4" /> Edit plant
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
          <CardContent className="grid grid-cols-3 gap-x-3 gap-y-3 pb-4 pt-0">
            <DisplayField label="Plant Name" value={form.plant_name} />
            <DisplayField label="Rating (kWp)" value={form.rating_kWp} />
            <DisplayField
              label="Panel Rating (W)"
              value={form.panel_rating_watt}
            />
            <DisplayField label="No. of Panels" value={form.no_of_panels} />
            <DisplayField label="Inverter Make" value={form.inverter_make} />
            <DisplayField
              label="Inverter Rating (kW)"
              value={form.inverter_rating_kW}
            />
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
            ) : (plant.documents ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No documents yet.</p>
              </div>
            ) : (
              <div className="grid min-w-0 gap-2">
                {(plant.documents ?? []).map((doc, docIdx) => (
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
                            onPreviewDocument(doc, plant._id, docIdx)
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

      <SolarPlantBillingAuditsPanel
        facilityId={facilityId}
        utilityAccountId={utilityAccountId}
        solarPlantId={plant._id}
        auditStepLocked={auditStepLocked}
        utilityBillingRecords={utilityBillingRecords}
        solarGenerationRecords={solarGenerationRecords}
      />
    </div>
  );
}
