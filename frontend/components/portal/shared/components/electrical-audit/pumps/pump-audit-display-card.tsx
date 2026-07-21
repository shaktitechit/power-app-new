"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type {
  PumpAuditRecord,
  PumpAuditRecordDocument,
} from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import {
  formatDisplayValue,
  formatPumpCondition,
} from "./pump-audit-utils";

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
  record: PumpAuditRecord;
  pumpTag?: string;
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
    doc: PumpAuditRecordDocument,
    recordId: string,
    index: number,
  ) => void;
};

export function PumpAuditDisplayCard({
  record,
  pumpTag,
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
            {pumpTag ? `Pump ${pumpTag} audit` : "Pump audit record"}
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
        <CardContent className="space-y-4 pb-4 pt-0">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:grid-cols-3">
            <DisplayField label="Actual Flow (measured) (m³/hr)" value={record.actual_flow_measured_m3_per_hr || record.actual_flow_m3_per_hr} />
            <DisplayField label="Actual Flow (calculated) (m³/hr)" value={record.actual_flow_calculated_m3_per_hr} />
            <DisplayField label="Total Dynamic Head (m)" value={record.total_dynamic_head_m} />
            <DisplayField label="No. of Phases" value={record.number_of_phases} />
            <DisplayField label="Input Power (measured) (kW)" value={record.input_power_kW} />
            <DisplayField label="Input Power to Pump (kW)" value={record.input_power_to_pump_kW} />
            <DisplayField label="Pump Efficiency (%)" value={record.pump_efficiency_percent} />
            <DisplayField label="Overall Pump Set Efficiency (%)" value={record.overall_pump_set_efficiency_percent} />
            <DisplayField label="Motor Loading (%)" value={record.motor_loading_percent} />
            <DisplayField label="Specific Energy (kWh/m³)" value={record.specific_energy_consumption_kWh_per_m3} />
            <DisplayField label="Annual Energy (kWh)" value={record.annual_energy_consumption_kWh} />
            <DisplayField label="Suction Head (m)" value={record.suction_head_m} />
            <DisplayField label="Discharge Static Head (m)" value={record.discharge_static_head_m} />
            <DisplayField label="Pipe Friction Head (m)" value={record.pipe_friction_head_m} />
            <DisplayField label="Delivery Pipe Dia (in)" value={record.delivery_pipe_diameter_inches} />
            <DisplayField label="Tank Capacity (L)" value={record.tank_or_sump_capacity} />
            <DisplayField label="Time to Fill Tank (min)" value={record.time_to_fill_tank_minutes} />
            <DisplayField label="Voltage (V)" value={record.voltage_V} />
            <DisplayField label="Current (A)" value={record.current_A} />
            <DisplayField label="Power Factor" value={record.power_factor} />
            <DisplayField label="Operating Hours/Day" value={record.operating_hours_per_day} />
            <DisplayField label="Operating Days/Year" value={record.operating_days_per_year} />
            <DisplayField label="Daily Energy (kWh)" value={record.daily_energy_consumption_kWh} />
            <DisplayField label="Hydraulic Output (kW)" value={record.hydraulic_output_power_kW} />
            <DisplayField label="Valve Throttling?" value={record.control_valve_throttling} />
            <DisplayField label="VFD Installed?" value={record.vfd_installed} />
            <DisplayField label="Leakages Observed?" value={record.leakages_observed} />
            <DisplayField label="Pump Condition" value={formatPumpCondition(record.pump_condition)} />
          </div>

          {record.recommendations ? (
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recommendations
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {record.recommendations}
              </p>
            </div>
          ) : null}
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
