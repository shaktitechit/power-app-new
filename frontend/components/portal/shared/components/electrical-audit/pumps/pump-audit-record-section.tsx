"use client";

import { canViewDocuments, type UserPermission,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/portal/ui/alert-dialog";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import {
  Pencil,
  Save,
  X,
  Upload,
  FileText,
  ImageIcon,
  Download,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import {
  useCreatePumpAuditRecordMutation,
  useDeletePumpAuditRecordMutation,
  useGetPumpAuditRecordsQuery,
  useUpdatePumpAuditRecordMutation,
} from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";
import { useGetPumpByIdQuery } from "@/store/slices/electrical-audit/pumpApiSlice";
import {
  downloadPumpAuditTemplate,
  parsePumpAuditExcel,
  type PumpAuditExcelFormState,
} from "@/components/portal/lib/electrical-audit/pump-audit-record-excel";
import { toastHandler } from "@/components/portal/lib/toast";
import { AuditSectionSkeleton } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-skeleton";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { cnHideUtilityAuditEdits } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import {
  AUDIT_DOCUMENTS_PANEL_CLASS,
  AUDIT_DOC_LINK_INLINE,
  AUDIT_DOC_NEW_FILENAME_SPAN,
  AUDIT_DOC_ROW_ACTION_BTN,
  AUDIT_DOC_ROW_DENSE,
  AUDIT_DOC_ROW_LEFT_CLUSTER,
} from "@/components/portal/shared/components/electrical-audit/audit-document-layout";

interface PumpAuditRecordSectionProps {
  facilityId: string;
  utilityAccountId: string;
  pumpId: string;
  auditStepLocked?: boolean;
  hideAuditSubmitChrome?: boolean;
  embedded?: boolean;
  hideDocuments?: boolean;
  initialEditing?: boolean;
  onSaved?: () => void;
}

type ExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  uploadedAt?: string;
};

type PumpAuditFormState = {
  id?: string;
  isNew: boolean;
  isEditing: boolean;

  suction_head_m: string;
  discharge_static_head_m: string;
  delivery_pipe_diameter_inches: string;
  pipe_friction_head_m: string;
  tank_or_sump_capacity: string;
  time_to_fill_tank_minutes: string;
  actual_flow_calculated_m3_per_hr: string;
  actual_flow_measured_m3_per_hr: string;
  actual_flow_m3_per_hr: string;

  number_of_phases: string;
  voltage_V: string;
  current_A: string;
  power_factor: string;
  input_power_kW: string;
  operating_hours_per_day: string;
  operating_days_per_year: string;
  daily_energy_consumption_kWh: string;

  total_dynamic_head_m: string;
  hydraulic_output_power_kW: string;
  input_power_to_pump_kW: string;
  pump_efficiency_percent: string;
  overall_pump_set_efficiency_percent: string;
  motor_loading_percent: string;
  specific_energy_consumption_kWh_per_m3: string;
  annual_energy_consumption_kWh: string;

  control_valve_throttling: boolean;
  vfd_installed: boolean;
  pump_condition: "" | "good" | "moderate" | "poor";
  leakages_observed: boolean;
  recommendations: string;

  audit_date: string;

  documents: File[];
  existingDocuments: ExistingDocument[];
};

const editableInputClass =
  "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary";

const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-90";

const textareaClass =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-90";

const getInputClass = (disabled: boolean) =>
  disabled ? autoInputClass : editableInputClass;

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

const toNumber = (value: string) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const formatAutoValue = (value: number) => {
  return Number.isFinite(value) && value !== 0 ? value.toFixed(3) : "";
};

function calculatePumpAutoFields(
  form: PumpAuditFormState,
  ratedPowerkWOrHP: number,
  ratedEfficiencyMotorPercent: number,
) {
  const suctionHead = toNumber(form.suction_head_m);
  const dischargeStaticHead = toNumber(form.discharge_static_head_m);
  const pipeFrictionHead = toNumber(form.pipe_friction_head_m);
  const tankCapacity = toNumber(form.tank_or_sump_capacity);
  const timeToFill = toNumber(form.time_to_fill_tank_minutes);
  const actualFlowMeasured = toNumber(form.actual_flow_measured_m3_per_hr);

  const voltage = toNumber(form.voltage_V);
  const current = toNumber(form.current_A);
  const powerFactor = toNumber(form.power_factor);
  const operatingHours = toNumber(form.operating_hours_per_day);
  const operatingDays = toNumber(form.operating_days_per_year || "365");

  // 1. TDH
  const totalDynamicHead = suctionHead + dischargeStaticHead + pipeFrictionHead;

  // 2. Actual Flow Calculated
  const actualFlowCalculated = timeToFill > 0 ? (tankCapacity * 0.06) / timeToFill : 0;

  // 3. Input Power Measured (kW)
  let inputPower = 0;
  if (form.number_of_phases === "1-Phase") {
    inputPower = (voltage * current * powerFactor) / 1000;
  } else {
    // 3-Phase
    inputPower = (1.73205 * voltage * current * powerFactor) / 1000;
  }

  // 4. Daily Energy Consumption
  const dailyEnergy = inputPower * operatingHours;

  // 5. Hydraulic Output Power
  const hydraulicOutputPower = (actualFlowMeasured * totalDynamicHead * 9.81) / 3600;

  // 6. Input Power to Pump
  const motorEfficiencyFraction = (ratedEfficiencyMotorPercent > 0 ? ratedEfficiencyMotorPercent : 100) / 100;
  const inputPowerToPump = inputPower * motorEfficiencyFraction;

  // 7. Pump Efficiency (%)
  const pumpEfficiency = inputPowerToPump > 0 ? (hydraulicOutputPower / inputPowerToPump) * 100 : 0;

  // 8. Overall Pump Set Efficiency
  const overallPumpSetEfficiency = inputPower > 0 ? (hydraulicOutputPower / inputPower) * 100 : 0;

  // 9. Motor Loading (%)
  const motorLoading = ratedPowerkWOrHP > 0 ? (inputPowerToPump / ratedPowerkWOrHP) * 100 : 0;

  // 10. Specific Energy Consumption (kWh/m³)
  const specificEnergyConsumption = actualFlowMeasured > 0 ? inputPower / actualFlowMeasured : 0;

  // 11. Annual Energy Consumption
  const annualEnergyConsumption = dailyEnergy * operatingDays;

  return {
    total_dynamic_head_m: formatAutoValue(totalDynamicHead),
    actual_flow_calculated_m3_per_hr: formatAutoValue(actualFlowCalculated),
    input_power_kW: formatAutoValue(inputPower),
    daily_energy_consumption_kWh: formatAutoValue(dailyEnergy),
    hydraulic_output_power_kW: formatAutoValue(hydraulicOutputPower),
    input_power_to_pump_kW: formatAutoValue(inputPowerToPump),
    pump_efficiency_percent: formatAutoValue(pumpEfficiency),
    overall_pump_set_efficiency_percent: formatAutoValue(overallPumpSetEfficiency),
    motor_loading_percent: formatAutoValue(motorLoading),
    specific_energy_consumption_kWh_per_m3: formatAutoValue(specificEnergyConsumption),
    annual_energy_consumption_kWh: formatAutoValue(annualEnergyConsumption),
  };
}

const createEmptyForm = (): PumpAuditFormState => ({
  isNew: true,
  isEditing: true,

  suction_head_m: "",
  discharge_static_head_m: "",
  delivery_pipe_diameter_inches: "",
  pipe_friction_head_m: "",
  tank_or_sump_capacity: "",
  time_to_fill_tank_minutes: "",
  actual_flow_calculated_m3_per_hr: "",
  actual_flow_measured_m3_per_hr: "",
  actual_flow_m3_per_hr: "",

  number_of_phases: "3-Phase",
  voltage_V: "",
  current_A: "",
  power_factor: "",
  input_power_kW: "",
  operating_hours_per_day: "",
  operating_days_per_year: "365",
  daily_energy_consumption_kWh: "",

  total_dynamic_head_m: "",
  hydraulic_output_power_kW: "",
  input_power_to_pump_kW: "",
  pump_efficiency_percent: "",
  overall_pump_set_efficiency_percent: "",
  motor_loading_percent: "",
  specific_energy_consumption_kWh_per_m3: "",
  annual_energy_consumption_kWh: "",

  control_valve_throttling: false,
  vfd_installed: false,
  pump_condition: "",
  leakages_observed: false,
  recommendations: "",

  audit_date: "",

  documents: [],
  existingDocuments: [],
});

function recordToForm(record: any): PumpAuditFormState {
  return {
    id: record._id,
    isNew: false,
    isEditing: false,

    suction_head_m: record.suction_head_m?.toString() || "",
    discharge_static_head_m: record.discharge_static_head_m?.toString() || "",
    delivery_pipe_diameter_inches:
      record.delivery_pipe_diameter_inches?.toString() || "",
    pipe_friction_head_m: record.pipe_friction_head_m?.toString() || "",
    tank_or_sump_capacity: record.tank_or_sump_capacity?.toString() || "",
    time_to_fill_tank_minutes:
      record.time_to_fill_tank_minutes?.toString() || "",
    actual_flow_calculated_m3_per_hr: record.actual_flow_calculated_m3_per_hr?.toString() || "",
    actual_flow_measured_m3_per_hr: record.actual_flow_measured_m3_per_hr?.toString() || "",
    actual_flow_m3_per_hr: record.actual_flow_m3_per_hr?.toString() || "",

    number_of_phases: record.number_of_phases || "3-Phase",
    voltage_V: record.voltage_V?.toString() || "",
    current_A: record.current_A?.toString() || "",
    power_factor: record.power_factor?.toString() || "",
    input_power_kW: record.input_power_kW?.toString() || "",
    operating_hours_per_day: record.operating_hours_per_day?.toString() || "",
    operating_days_per_year: record.operating_days_per_year?.toString() || "365",
    daily_energy_consumption_kWh:
      record.daily_energy_consumption_kWh?.toString() || "",

    total_dynamic_head_m: record.total_dynamic_head_m?.toString() || "",
    hydraulic_output_power_kW:
      record.hydraulic_output_power_kW?.toString() || "",
    input_power_to_pump_kW: record.input_power_to_pump_kW?.toString() || "",
    pump_efficiency_percent: record.pump_efficiency_percent?.toString() || "",
    overall_pump_set_efficiency_percent:
      record.overall_pump_set_efficiency_percent?.toString() || "",
    motor_loading_percent: record.motor_loading_percent?.toString() || "",
    specific_energy_consumption_kWh_per_m3:
      record.specific_energy_consumption_kWh_per_m3?.toString() || "",
    annual_energy_consumption_kWh:
      record.annual_energy_consumption_kWh?.toString() || "",

    control_valve_throttling: Boolean(record.control_valve_throttling),
    vfd_installed: Boolean(record.vfd_installed),
    pump_condition: record.pump_condition || "",
    leakages_observed: Boolean(record.leakages_observed),
    recommendations: record.recommendations || "",

    audit_date: toDateInput(record.audit_date),

    documents: [],
    existingDocuments: record.documents || [],
  };
}

export function PumpAuditRecordSection({
  facilityId,
  utilityAccountId,
  pumpId,
  auditStepLocked = false,
  hideAuditSubmitChrome = false,
  embedded = false,
  hideDocuments = false,
  initialEditing = false,
  onSaved,
}: PumpAuditRecordSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const { data: pumpData } = useGetPumpByIdQuery(pumpId, {
    skip: !pumpId,
  });
  const ratedPowerkWOrHP = Number(pumpData?.data?.rated_power_kW_or_HP) || 0;
  const ratedEfficiencyMotorPercent = Number(pumpData?.data?.rated_efficiency_motor_percent) || 100;
  const ratedFlowM3PerHour = Number(pumpData?.data?.rated_flow_m3_per_hr) || 0;

  const { data, isLoading } = useGetPumpAuditRecordsQuery({
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    pump_id: pumpId,
  });

  const [createPumpAuditRecord, { isLoading: isCreating }] =
    useCreatePumpAuditRecordMutation();

  const [updatePumpAuditRecord, { isLoading: isUpdating }] =
    useUpdatePumpAuditRecordMutation();
  const [deletePumpAuditRecord, { isLoading: isDeleting }] =
    useDeletePumpAuditRecordMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const records = useMemo(() => data?.data || [], [data]);

  const latestRecord = useMemo(() => {
    if (!records.length) return null;

    return [...records].sort((a: any, b: any) => {
      const aTime = new Date(
        a.audit_date || a.created_at || a.createdAt || 0,
      ).getTime();
      const bTime = new Date(
        b.audit_date || b.created_at || b.createdAt || 0,
      ).getTime();
      return bTime - aTime;
    })[0];
  }, [records]);

  const [form, setForm] = useState<PumpAuditFormState>(() => {
    const emptyForm = createEmptyForm();
    return {
      ...emptyForm,
      ...calculatePumpAutoFields(emptyForm, ratedPowerkWOrHP, ratedEfficiencyMotorPercent),
    };
  });
  const [excelImporting, setExcelImporting] = useState(false);

  useEffect(() => {
    if (!auditStepLocked) return;
    setForm((prev) => ({ ...prev, isEditing: false }));
  }, [auditStepLocked]);

  useEffect(() => {
    if (latestRecord) {
      const mappedForm = recordToForm(latestRecord);
      if (initialEditing && !auditStepLocked) {
        mappedForm.isEditing = true;
      }
      setForm({
        ...mappedForm,
        ...calculatePumpAutoFields(mappedForm, ratedPowerkWOrHP, ratedEfficiencyMotorPercent),
      });
    } else {
      const emptyForm = createEmptyForm();
      setForm({
        ...emptyForm,
        ...calculatePumpAutoFields(emptyForm, ratedPowerkWOrHP, ratedEfficiencyMotorPercent),
      });
    }
  }, [latestRecord, ratedPowerkWOrHP, ratedEfficiencyMotorPercent, initialEditing, auditStepLocked]);

  const updateForm = (
    key: keyof PumpAuditFormState,
    value: string | boolean | File[] | ExistingDocument[],
  ) => {
    setForm((prev) => {
      const updatedForm = {
        ...prev,
        [key]: value,
      } as PumpAuditFormState;

      const calculatedFields = calculatePumpAutoFields(
        updatedForm,
        ratedPowerkWOrHP,
        ratedEfficiencyMotorPercent,
      );

      return {
        ...updatedForm,
        ...calculatedFields,
      };
    });
  };

  const handleDownloadPumpAuditExcelTemplate = () => {
    const rowPrefill: Partial<
      Record<keyof PumpAuditExcelFormState, string | boolean>
    > = {
      suction_head_m: form.suction_head_m,
      discharge_static_head_m: form.discharge_static_head_m,
      delivery_pipe_diameter_inches: form.delivery_pipe_diameter_inches,
      pipe_friction_head_m: form.pipe_friction_head_m,
      tank_or_sump_capacity: form.tank_or_sump_capacity,
      time_to_fill_tank_minutes: form.time_to_fill_tank_minutes,
      actual_flow_calculated_m3_per_hr: form.actual_flow_calculated_m3_per_hr,
      actual_flow_measured_m3_per_hr: form.actual_flow_measured_m3_per_hr,
      actual_flow_m3_per_hr: form.actual_flow_measured_m3_per_hr,
      number_of_phases: form.number_of_phases,
      voltage_V: form.voltage_V,
      current_A: form.current_A,
      power_factor: form.power_factor,
      input_power_kW: form.input_power_kW,
      operating_hours_per_day: form.operating_hours_per_day,
      operating_days_per_year: form.operating_days_per_year,
      daily_energy_consumption_kWh: form.daily_energy_consumption_kWh,
      control_valve_throttling: form.control_valve_throttling,
      vfd_installed: form.vfd_installed,
      pump_condition: form.pump_condition,
      leakages_observed: form.leakages_observed,
      recommendations: form.recommendations,
      audit_date: form.audit_date,
    };
    downloadPumpAuditTemplate({ rowPrefill });
  };

  const handlePumpAuditExcelFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast.error("Please choose an Excel file (.xlsx or .xls).");
      return;
    }

    setExcelImporting(true);
    try {
      const parsed = await parsePumpAuditExcel(file);
      if (!Object.keys(parsed).length) {
        toast.error("No recognized fields found. Use the downloaded template.");
        return;
      }

      setForm((prev) => {
        const next: PumpAuditFormState = { ...prev, isEditing: true };
        const mutable = next as unknown as Record<string, unknown>;
        for (const [k, v] of Object.entries(parsed)) {
          if (v === undefined) continue;
          mutable[k] = v;
        }
        return {
          ...next,
          ...calculatePumpAutoFields(next, ratedPowerkWOrHP, ratedEfficiencyMotorPercent),
        };
      });
      toast.success("Form filled from Excel.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not read that Excel file.",
      );
    } finally {
      setExcelImporting(false);
    }
  };

  const handleCancel = () => {
    if (latestRecord) {
      const mappedForm = recordToForm(latestRecord);
      setForm({
        ...mappedForm,
        ...calculatePumpAutoFields(mappedForm, ratedPowerkWOrHP, ratedEfficiencyMotorPercent),
      });
    } else {
      const emptyForm = createEmptyForm();
      setForm({
        ...emptyForm,
        ...calculatePumpAutoFields(emptyForm, ratedPowerkWOrHP, ratedEfficiencyMotorPercent),
      });
    }
  };

  const handleDocumentsChange = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);

    setForm((prev) => ({
      ...prev,
      documents: [...prev.documents, ...newFiles],
    }));
  };

  const removeNewDocument = (index: number) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    const payload = {
      pump_id: pumpId,
      utility_account_id: utilityAccountId,
      facility_id: facilityId,

      suction_head_m: form.suction_head_m || undefined,
      discharge_static_head_m: form.discharge_static_head_m || undefined,
      delivery_pipe_diameter_inches:
        form.delivery_pipe_diameter_inches || undefined,
      pipe_friction_head_m: form.pipe_friction_head_m || undefined,
      tank_or_sump_capacity: form.tank_or_sump_capacity || undefined,
      time_to_fill_tank_minutes: form.time_to_fill_tank_minutes || undefined,
      actual_flow_calculated_m3_per_hr: form.actual_flow_calculated_m3_per_hr || undefined,
      actual_flow_measured_m3_per_hr: form.actual_flow_measured_m3_per_hr || undefined,
      actual_flow_m3_per_hr: form.actual_flow_measured_m3_per_hr || undefined,

      number_of_phases: form.number_of_phases || undefined,
      voltage_V: form.voltage_V || undefined,
      current_A: form.current_A || undefined,
      power_factor: form.power_factor || undefined,
      input_power_kW: form.input_power_kW || undefined,
      operating_hours_per_day: form.operating_hours_per_day || undefined,
      operating_days_per_year: form.operating_days_per_year || undefined,
      daily_energy_consumption_kWh:
        form.daily_energy_consumption_kWh || undefined,

      total_dynamic_head_m: form.total_dynamic_head_m || undefined,
      hydraulic_output_power_kW: form.hydraulic_output_power_kW || undefined,
      input_power_to_pump_kW: form.input_power_to_pump_kW || undefined,
      pump_efficiency_percent: form.pump_efficiency_percent || undefined,
      overall_pump_set_efficiency_percent:
        form.overall_pump_set_efficiency_percent || undefined,
      motor_loading_percent: form.motor_loading_percent || undefined,
      specific_energy_consumption_kWh_per_m3:
        form.specific_energy_consumption_kWh_per_m3 || undefined,
      annual_energy_consumption_kWh:
        form.annual_energy_consumption_kWh || undefined,

      control_valve_throttling: form.control_valve_throttling,
      vfd_installed: form.vfd_installed,
      pump_condition: form.pump_condition || undefined,
      leakages_observed: form.leakages_observed,
      recommendations: form.recommendations ? form.recommendations.trim() : "",

      audit_date: form.audit_date || undefined,

      documents: form.documents.length ? form.documents : undefined,
    };

    try {
      await toastHandler({
        action: () => {
          if (form.isNew) {
            return createPumpAuditRecord(payload).unwrap();
          }

          if (form.id) {
            return updatePumpAuditRecord({
              id: form.id,
              ...payload,
            }).unwrap();
          }

          return Promise.reject(new Error("Pump audit record ID is missing."));
        },
        loading: form.isNew
          ? "Creating pump audit record..."
          : "Updating pump audit record...",
        success: form.isNew
          ? "Pump audit record created successfully"
          : "Pump audit record updated successfully",
      });
      onSaved?.();
    } catch (error: any) {
      console.error("Failed to save pump audit record:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!form.id || !canDeleteRecords) return;
    try {
      await deletePumpAuditRecord(form.id).unwrap();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete pump audit record:", error);
    }
  };

  const saving = isCreating || isUpdating || isDeleting;

  if (isLoading) {
    return <AuditSectionSkeleton />;
  }

  return (
    <div className={embedded ? "space-y-4" : "relative space-y-4"}>
      <div className={embedded ? "" : "relative"}>
        <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">
          Pump Audit Record
        </h3>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {form.isNew ? "Create Pump Audit Record" : "Pump Audit Record"}
          </CardTitle>

          <div
            className={cnHideUtilityAuditEdits(
              auditStepLocked,
              "flex flex-wrap items-center gap-2",
            )}
          >
            <input
              id="pump-audit-excel-import"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={handlePumpAuditExcelFileChange}
              disabled={excelImporting}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPumpAuditExcelTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Excel template
            </Button>

            <Label
              htmlFor="pump-audit-excel-import"
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground ${
                excelImporting ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {excelImporting ? "Reading…" : "Import Excel"}
            </Label>

            {canDeleteRecords && form.id && !hideDocuments ? (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                size="sm"
                disabled={saving}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
            {!form.isEditing ? (
              <Button
                onClick={() =>
                  setForm((prev) => ({ ...prev, isEditing: true }))
                }
                size="sm"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  size="sm"
                  disabled={saving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Hydraulic Parameters */}
          <div className="rounded-xl border p-4">
            <h4 className="mb-4 text-base font-semibold text-foreground">
              Hydraulic Parameters
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Suction Head (below ground) * (m)</Label>
                <Input
                  type="number"
                  value={form.suction_head_m}
                  onChange={(e) => updateForm("suction_head_m", e.target.value)}
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Discharge / Static Head * (m)</Label>
                <Input
                  type="number"
                  value={form.discharge_static_head_m}
                  onChange={(e) =>
                    updateForm("discharge_static_head_m", e.target.value)
                  }
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 48.76"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Pipe Diameter (inches)</Label>
                <Input
                  type="number"
                  value={form.delivery_pipe_diameter_inches}
                  onChange={(e) =>
                    updateForm("delivery_pipe_diameter_inches", e.target.value)
                  }
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 2.5"
                />
              </div>

              <div className="space-y-2">
                <Label>Pipe friction Head (m)</Label>
                <Input
                  type="number"
                  value={form.pipe_friction_head_m}
                  onChange={(e) =>
                    updateForm("pipe_friction_head_m", e.target.value)
                  }
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 1.2"
                />
              </div>

              <div className="space-y-2">
                <Label>Water Tank / Sump Capacity (Liters)</Label>
                <Input
                  type="number"
                  value={form.tank_or_sump_capacity}
                  onChange={(e) =>
                    updateForm("tank_or_sump_capacity", e.target.value)
                  }
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 50000"
                />
              </div>

              <div className="space-y-2">
                <Label>Time to Fill Tank (field measurement) (min)</Label>
                <Input
                  type="number"
                  value={form.time_to_fill_tank_minutes}
                  onChange={(e) =>
                    updateForm("time_to_fill_tank_minutes", e.target.value)
                  }
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 120"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Actual Flow (calculated) (m³/hr)</Label>
                  {ratedFlowM3PerHour > 0 && toNumber(form.actual_flow_calculated_m3_per_hr) > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      toNumber(form.actual_flow_calculated_m3_per_hr) >= ratedFlowM3PerHour * 0.8 &&
                      toNumber(form.actual_flow_calculated_m3_per_hr) <= ratedFlowM3PerHour * 1.2
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    }`}>
                      {toNumber(form.actual_flow_calculated_m3_per_hr) >= ratedFlowM3PerHour * 0.8 &&
                      toNumber(form.actual_flow_calculated_m3_per_hr) <= ratedFlowM3PerHour * 1.2
                        ? "Within ±20%"
                        : "Outside ±20%"}
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  value={form.actual_flow_calculated_m3_per_hr}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Actual Flow (measured) * (m³/hr)</Label>
                  {ratedFlowM3PerHour > 0 && toNumber(form.actual_flow_measured_m3_per_hr) > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      toNumber(form.actual_flow_measured_m3_per_hr) >= ratedFlowM3PerHour * 0.8 &&
                      toNumber(form.actual_flow_measured_m3_per_hr) <= ratedFlowM3PerHour * 1.2
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    }`}>
                      {toNumber(form.actual_flow_measured_m3_per_hr) >= ratedFlowM3PerHour * 0.8 &&
                      toNumber(form.actual_flow_measured_m3_per_hr) <= ratedFlowM3PerHour * 1.2
                        ? "Within ±20%"
                        : "Outside ±20%"}
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  value={form.actual_flow_measured_m3_per_hr}
                  onChange={(e) =>
                    updateForm("actual_flow_measured_m3_per_hr", e.target.value)
                  }
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 260"
                  required
                />
              </div>
            </div>
          </div>

          {/* Electrical Parameters */}
          <div className="rounded-xl border p-4">
            <h4 className="mb-4 text-base font-semibold text-foreground">
              Electrical Measurements (Field)
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>No of Phases *</Label>
                <select
                  value={form.number_of_phases}
                  onChange={(e) => updateForm("number_of_phases", e.target.value)}
                  disabled={!form.isEditing}
                  className={selectClass}
                >
                  <option value="3-Phase">3-Phase</option>
                  <option value="1-Phase">1-Phase</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Voltage (V) *</Label>
                <Input
                  type="number"
                  value={form.voltage_V}
                  onChange={(e) => updateForm("voltage_V", e.target.value)}
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 415"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Current (A) *</Label>
                <Input
                  type="number"
                  value={form.current_A}
                  onChange={(e) => updateForm("current_A", e.target.value)}
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 89"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Power Factor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.power_factor}
                  onChange={(e) => updateForm("power_factor", e.target.value)}
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  placeholder="e.g. 0.8"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Input Power (measured) (kW)</Label>
                <Input
                  type="number"
                  value={form.input_power_kW}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Operating Hours / Day *</Label>
                  {toNumber(form.operating_hours_per_day) > 24 && (
                    <span className="text-[10px] text-destructive font-medium bg-destructive/10 px-1 py-0.5 rounded">
                      Max 24 hrs
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  value={form.operating_hours_per_day}
                  onChange={(e) =>
                    updateForm("operating_hours_per_day", e.target.value)
                  }
                  disabled={!form.isEditing}
                  className={`${getInputClass(!form.isEditing)} ${
                    toNumber(form.operating_hours_per_day) > 24 ? "border-destructive text-destructive focus:ring-destructive focus:border-destructive" : ""
                  }`}
                  placeholder="e.g. 6"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Operating days per year *</Label>
                  {toNumber(form.operating_days_per_year) > 365 && (
                    <span className="text-[10px] text-destructive font-medium bg-destructive/10 px-1 py-0.5 rounded">
                      Max 365 days
                    </span>
                  )}
                </div>
                <Input
                  type="number"
                  value={form.operating_days_per_year}
                  onChange={(e) =>
                    updateForm("operating_days_per_year", e.target.value)
                  }
                  disabled={!form.isEditing}
                  className={`${getInputClass(!form.isEditing)} ${
                    toNumber(form.operating_days_per_year) > 365 ? "border-destructive text-destructive focus:ring-destructive focus:border-destructive" : ""
                  }`}
                  placeholder="e.g. 365"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Daily Energy Consumption (kWh/day)</Label>
                <Input
                  type="number"
                  value={form.daily_energy_consumption_kWh}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>
            </div>
          </div>

          {/* Performance Parameters */}
          <div className="rounded-xl border p-4">
            <h4 className="mb-4 text-base font-semibold text-foreground">
              Key Performance Indicators (Calculated)
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Total Dynamic Head (TDH) (m)</Label>
                <Input
                  type="number"
                  value={form.total_dynamic_head_m}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <Label>Hydraulic Output Power (kW)</Label>
                <Input
                  type="number"
                  value={form.hydraulic_output_power_kW}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <Label>Input Power to Pump (kW)</Label>
                <Input
                  type="number"
                  value={form.input_power_to_pump_kW}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <Label>Pump Efficiency (%)</Label>
                <Input
                  type="number"
                  value={form.pump_efficiency_percent}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <Label>Overall Pump Set Efficiency (%)</Label>
                <Input
                  type="number"
                  value={form.overall_pump_set_efficiency_percent}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <Label>Motor Loading (%)</Label>
                <Input
                  type="number"
                  value={form.motor_loading_percent}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <Label>Specific Energy Consumption (kWh/m³)</Label>
                <Input
                  type="number"
                  value={form.specific_energy_consumption_kWh_per_m3}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <Label>Annual Energy Consumption (kWh/yr)</Label>
                <Input
                  type="number"
                  value={form.annual_energy_consumption_kWh}
                  disabled
                  className={autoInputClass}
                  placeholder="Auto"
                />
              </div>

              <div className="space-y-2">
                <Label>Audit Date *</Label>
                <Input
                  type="date"
                  value={form.audit_date}
                  onChange={(e) => updateForm("audit_date", e.target.value)}
                  disabled={!form.isEditing}
                  className={getInputClass(!form.isEditing)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <h4 className="mb-4 text-base font-semibold text-foreground">
              Operational Observations
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Control Valve Throttling</Label>
                <select
                  value={String(form.control_valve_throttling)}
                  onChange={(e) =>
                    updateForm(
                      "control_valve_throttling",
                      e.target.value === "true",
                    )
                  }
                  disabled={!form.isEditing}
                  className={selectClass}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>VFD Installed</Label>
                <select
                  value={String(form.vfd_installed)}
                  onChange={(e) =>
                    updateForm("vfd_installed", e.target.value === "true")
                  }
                  disabled={!form.isEditing}
                  className={selectClass}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Pump Condition</Label>
                <select
                  value={form.pump_condition}
                  onChange={(e) => updateForm("pump_condition", e.target.value)}
                  disabled={!form.isEditing}
                  className={selectClass}
                >
                  <option value="">Select condition</option>
                  <option value="good">Good</option>
                  <option value="moderate">Moderate</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Leakages Observed</Label>
                <select
                  value={String(form.leakages_observed)}
                  onChange={(e) =>
                    updateForm("leakages_observed", e.target.value === "true")
                  }
                  disabled={!form.isEditing}
                  className={selectClass}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label>Recommendations</Label>
                <textarea
                  value={form.recommendations}
                  onChange={(e) =>
                    updateForm("recommendations", e.target.value)
                  }
                  disabled={!form.isEditing}
                  rows={4}
                  className={textareaClass}
                  placeholder="Enter recommendations"
                />
              </div>
            </div>
          </div>

          {!hideDocuments ? (
          <div className={AUDIT_DOCUMENTS_PANEL_CLASS}>
            <h4 className="mb-4 text-base font-semibold text-foreground">
              Images & Documents
            </h4>

            <div className="space-y-2">
              <Label>Upload Documents</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={(e) => handleDocumentsChange(e.target.files)}
                  disabled={!form.isEditing}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {canViewDocumentsFlag && form.existingDocuments.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Existing Documents</Label>
                <div className="space-y-2">
                  {form.existingDocuments.map((doc, docIndex) => (
                    <div
                      key={`${doc.fileUrl}-${docIndex}`}
                      className={AUDIT_DOC_ROW_DENSE}
                    >
                      <div className={AUDIT_DOC_ROW_LEFT_CLUSTER}>
                        {doc.fileType === "pdf" ? (
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <a
                          href={toSameOriginFileManagementUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          title={
                            doc.fileName || `Document ${docIndex + 1}`
                          }
                          className={AUDIT_DOC_LINK_INLINE}
                        >
                          {doc.fileName || `Document ${docIndex + 1}`}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!canViewDocumentsFlag && (
              <p className="mt-2 text-sm text-muted-foreground">
                Only super admin, admin, and manager can view uploaded documents.
              </p>
            )}

            {form.documents.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>New Selected Documents</Label>
                <div className="space-y-2">
                  {form.documents.map((file, fileIndex) => (
                    <div
                      key={`${file.name}-${fileIndex}`}
                      className={AUDIT_DOC_ROW_DENSE}
                    >
                      <div className={AUDIT_DOC_ROW_LEFT_CLUSTER}>
                        {file.type === "application/pdf" ? (
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          title={file.name}
                          className={AUDIT_DOC_NEW_FILENAME_SPAN}
                        >
                          {file.name}
                        </span>
                      </div>

                      {form.isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={AUDIT_DOC_ROW_ACTION_BTN}
                          onClick={() => removeNewDocument(fileIndex)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          ) : null}
        </CardContent>
      </Card>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pump audit record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the current pump audit record. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </div>
    </div>
  );
}
