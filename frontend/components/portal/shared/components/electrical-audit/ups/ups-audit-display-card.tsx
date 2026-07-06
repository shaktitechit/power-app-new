"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type { UPSAuditRecord, UPSAuditDocument } from "@/store/slices/electrical-audit/upsAuditApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import { auditToForm, formatDisplayValue, toDateInput } from "./ups-audit-utils";

function DisplayField({ label, value }: { label: string; value?: string | number | null | boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-[10px] leading-tight text-muted-foreground uppercase font-semibold">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{formatDisplayValue(value)}</p>
    </div>
  );
}

type Props = {
  record: UPSAuditRecord;
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
  onPreviewDocument: (doc: UPSAuditDocument, recordId: string, index: number) => void;
};

export function UPSAuditDisplayCard({ record, tabLabel, auditStepLocked = false, canDelete = false, canViewDocuments = true, saving = false, onEdit, onDelete, onToggleCompleteness, togglingCompleteness = false, onUploadDocuments, onPreviewDocument }: Props) {
  const form = auditToForm(record);
  const recordEditsLocked = isUtilityAuditRecordEditsLocked(auditStepLocked, record.is_completed);
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
      <Card className="min-w-0 overflow-hidden lg:col-span-3">
        <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 border-b">
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
        <CardContent className="space-y-6 p-6">
          {/* Section 1: Nameplate */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">1. Nameplate & Identification</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DisplayField label="UPS Tag ID" value={form.ups_tag_asset_id} />
              <DisplayField label="Make & Model" value={form.make_model} />
              <DisplayField label="Mfg / Install Year" value={form.year_of_manufacture_installation} />
              <DisplayField label="Tech Type" value={form.technology_type} />
              <DisplayField label="Input/Output Phases" value={form.input_phases && form.output_phases ? `${form.input_phases} / ${form.output_phases}` : ""} />
              <DisplayField label="Capacity" value={form.rated_capacity_kVA ? `${form.rated_capacity_kVA} kVA` : ""} />
              <DisplayField label="Rated Power" value={form.rated_output_power_kW ? `${form.rated_output_power_kW} kW` : ""} />
              <DisplayField label="Rated Voltage (I/O)" value={form.rated_input_voltage_LL && form.rated_output_voltage_LL ? `${form.rated_input_voltage_LL} V / ${form.rated_output_voltage_LL} V` : ""} />
              <DisplayField label="Rated Current" value={form.rated_input_current_A ? `${form.rated_input_current_A} A` : ""} />
              <DisplayField label="Compliance Standard" value={form.standard_compliance} />
              <DisplayField label="BEE Star Rating" value={form.bee_star_rating ? `${form.bee_star_rating} Stars` : ""} />
            </div>
          </div>

          {/* Section 2: Input side */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">2. Electrical Input Measurements</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DisplayField label="Voltage R-Y-B (V)" value={form.input_voltage_R && form.input_voltage_Y && form.input_voltage_B ? `${form.input_voltage_R} / ${form.input_voltage_Y} / ${form.input_voltage_B}` : ""} />
              <DisplayField label="Current R-Y-B (A)" value={form.input_current_R && form.input_current_Y && form.input_current_B ? `${form.input_current_R} / ${form.input_current_Y} / ${form.input_current_B}` : ""} />
              <DisplayField label="Active Power" value={form.input_active_power_kW ? `${form.input_active_power_kW} kW` : ""} />
              <DisplayField label="Apparent Power" value={form.input_apparent_power_kVA ? `${form.input_apparent_power_kVA} kVA` : ""} />
              <DisplayField label="Power Factor" value={form.input_power_factor} />
              <DisplayField label="THD V R-Y-B (%)" value={form.input_voltage_thd_R && form.input_voltage_thd_Y && form.input_voltage_thd_B ? `${form.input_voltage_thd_R}% / ${form.input_voltage_thd_Y}% / ${form.input_voltage_thd_B}%` : ""} />
              <DisplayField label="THD I R-Y-B (%)" value={form.input_current_thd_R && form.input_current_thd_Y && form.input_current_thd_B ? `${form.input_current_thd_R}% / ${form.input_current_thd_Y}% / ${form.input_current_thd_B}%` : ""} />
            </div>
          </div>

          {/* Section 3: Output side */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">3. Electrical Output Measurements</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DisplayField label="Voltage R-Y-B (V)" value={form.output_voltage_R && form.output_voltage_Y && form.output_voltage_B ? `${form.output_voltage_R} / ${form.output_voltage_Y} / ${form.output_voltage_B}` : ""} />
              <DisplayField label="Current R-Y-B (A)" value={form.output_current_R && form.output_current_Y && form.output_current_B ? `${form.output_current_R} / ${form.output_current_Y} / ${form.output_current_B}` : ""} />
              <DisplayField label="Active Power" value={form.output_active_power_kW ? `${form.output_active_power_kW} kW` : ""} />
              <DisplayField label="Apparent Power" value={form.output_apparent_power_kVA ? `${form.output_apparent_power_kVA} kVA` : ""} />
              <DisplayField label="Power Factor" value={form.output_power_factor} />
              <DisplayField label="THD V R-Y-B (%)" value={form.output_voltage_thd_R && form.output_voltage_thd_Y && form.output_voltage_thd_B ? `${form.output_voltage_thd_R}% / ${form.output_voltage_thd_Y}% / ${form.output_voltage_thd_B}%` : ""} />
            </div>
          </div>

          {/* Section 4: Loading & Energy */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">4. Loading & Energy Performance</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DisplayField label="Loading (kVA / kW Basis)" value={`${form.loading_kVA_percent}% / ${form.loading_kW_percent}%`} />
              <DisplayField label="Operating Hours" value={form.working_hours_per_day ? `${form.working_hours_per_day} hr/day` : ""} />
              <DisplayField label="Operating Days" value={form.working_days_per_year ? `${form.working_days_per_year} days/yr` : ""} />
              <DisplayField label="Load Factor" value={form.load_factor} />
              <DisplayField label="Annual Input Energy" value={form.annual_input_energy_kWh ? `${form.annual_input_energy_kWh} kWh` : ""} />
              <DisplayField label="Annual Output Energy" value={form.annual_output_energy_kWh ? `${form.annual_output_energy_kWh} kWh` : ""} />
              <DisplayField label="Annual Losses" value={form.annual_energy_loss_kWh ? `${form.annual_energy_loss_kWh} kWh` : ""} />
              <DisplayField label="Annual CO₂ Emissions" value={form.annual_co2_emission_t ? `${form.annual_co2_emission_t} tCO₂` : ""} />
            </div>
          </div>

          {/* Section 5: Efficiency Benchmarks */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">5. Efficiency Benchmarks & Losses</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DisplayField label="Measured Efficiency" value={form.measured_efficiency_percent ? `${form.measured_efficiency_percent}%` : ""} />
              <DisplayField label="Nameplate Eff @ 100% Load" value={form.nameplate_efficiency_100_percent ? `${form.nameplate_efficiency_100_percent}%` : ""} />
              <DisplayField label="Deviation from Nameplate" value={form.efficiency_deviation_percentage_points ? `${form.efficiency_deviation_percentage_points} pp` : ""} />
              <DisplayField label="Measured Losses" value={form.measured_losses_kW ? `${form.measured_losses_kW} kW` : ""} />
            </div>
          </div>

          {/* Section 6: Battery System */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">6. Battery Bank Status</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DisplayField label="Battery Type" value={form.battery_type} />
              <DisplayField label="Strings x Cells" value={form.battery_strings_count && form.battery_cells_per_string ? `${form.battery_strings_count} x ${form.battery_cells_per_string}` : ""} />
              <DisplayField label="Rated Bank Voltage" value={form.rated_battery_bank_voltage_V ? `${form.rated_battery_bank_voltage_V} V` : ""} />
              <DisplayField label="Rated Capacity" value={form.rated_ah_capacity ? `${form.rated_ah_capacity} Ah` : ""} />
              <DisplayField label="Float Charge V / I" value={form.float_charge_voltage_V && form.float_charge_current_A ? `${form.float_charge_voltage_V} V / ${form.float_charge_current_A} A` : ""} />
              <DisplayField label="Float Charge Power" value={form.float_charge_power_W ? `${form.float_charge_power_W} W` : ""} />
              <DisplayField label="Cell Volt Min / Max" value={form.cell_voltage_min && form.cell_voltage_max ? `${form.cell_voltage_min} V / ${form.cell_voltage_max} V` : ""} />
              <DisplayField label="Cell Voltage Imbalance" value={form.cell_voltage_imbalance_V ? `${form.cell_voltage_imbalance_V} V` : ""} />
              <DisplayField label="Battery Age" value={form.battery_age_years ? `${form.battery_age_years} yrs` : ""} />
              <DisplayField label="Backup Time (Actual/Rated)" value={form.actual_backup_time_min && form.rated_backup_time_full_load_min ? `${form.actual_backup_time_min} min / ${form.rated_backup_time_full_load_min} min` : ""} />
              <DisplayField label="Health Assessment" value={form.battery_health_assessment} />
            </div>
          </div>

          {/* Section 7: Thermal & Operational */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">7. Thermal & Operational Parameters</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <DisplayField label="Room Temp / Humidity" value={form.ups_room_temp_C && form.ups_room_humidity_percent ? `${form.ups_room_temp_C} °C / ${form.ups_room_humidity_percent}%` : ""} />
              <DisplayField label="Enclosure surface Temp (F/R)" value={form.ups_surface_temp_front_C && form.ups_surface_temp_rear_C ? `${form.ups_surface_temp_front_C} °C / ${form.ups_surface_temp_rear_C} °C` : ""} />
              <DisplayField label="Hotspot Temperature" value={form.hotspot_temperature_C ? `${form.hotspot_temperature_C} °C` : ""} />
              <DisplayField label="Hotspot Location" value={form.hotspot_location} />
              <DisplayField label="Cooling Fan Status" value={form.cooling_fan_status} />
              <DisplayField label="Operational Mode" value={form.operational_mode} />
              <DisplayField label="Transfer Time" value={form.transfer_time_ms ? `${form.transfer_time_ms} ms` : ""} />
              <DisplayField label="Operating Hours (total)" value={form.operating_hours_total ? `${form.operating_hours_total} hrs` : ""} />
              <DisplayField label="Last PM Date" value={form.last_preventive_maintenance_date} />
              <DisplayField label="SNMP Card Installed" value={form.snmp_card_installed ? "Yes" : "No"} />
              <DisplayField label="Bypass Trips (12M)" value={form.bypass_trips_12m} />
              <DisplayField label="Input Sub-meter" value={form.input_submeter_installed ? "Yes" : "No"} />
            </div>
          </div>

          {form.remarks && (
            <div className="border-t pt-4">
              <DisplayField label="General Remarks" value={form.remarks} />
            </div>
          )}
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
