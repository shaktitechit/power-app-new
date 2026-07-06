"use client";

import {
  canViewDocuments, type UserPermission,
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
import { Textarea } from "@/components/portal/ui/textarea";
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
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/portal/ui/dialog";
import {
  useCreateDGAuditRecordMutation,
  useDeleteDGAuditRecordMutation,
  useGetDGAuditRecordsQuery,
  useUpdateDGAuditRecordMutation,
} from "@/store/slices/electrical-audit/dgAuditRecordApiSlice";
import { useGetUtilityBillingRecordsQuery } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import { calculateGridCostPerKVAHForOneYear } from "@/components/portal/lib/electrical-audit/calculateGridCostPerKVAHForOneYear";
import {
  downloadDGAuditTemplate,
  parseDGAuditExcel,
  type DGAuditExcelFormState,
} from "@/components/portal/lib/electrical-audit/dg-audit-record-excel";
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

/** Reusable info icon + modal for field-level instructions. */
function FieldInfo({ title, message }: { title: string; message: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-1 inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
        title={`Info: ${title}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed whitespace-pre-line">
              {message}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DGAuditRecordSectionProps {
  facilityId: string;
  utilityAccountId: string;
  dgSetId: string;
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

type DGAuditFormState = {
  id?: string;
  isNew: boolean;
  isEditing: boolean;

  measured_voltage_LL: string;
  measured_current_avg: string;
  measured_kW_output: string;
  measured_kVA_output: string;
  power_factor: string;
  frequency_Hz: string;
  number_of_phase: "" | "single_phase" | "three_phase";

  max_load_observed_kW: string;
  min_load_observed_kW: string;
  average_loading_percent: string;
  load_factor_percent: string;
  idle_running_observed: boolean;
  parallel_operation: boolean;

  annual_fuel_consumption_liters: string;
  units_generated_per_year_kWh: string;
  total_working_hours_per_year: string;
  units_generated_per_hour_kWh: string;
  fuel_consumption_per_hour_liters: string;

  fuel_consumption_during_test_lph: string;
  units_generated_during_test_kWh: string;
  time_duration_of_the_test_hours: string;
  units_generated_per_hour_kWh_during_test: string;
  fuel_consumption_per_hour_liters_during_test: string;
  specific_fuel_consumption_l_per_kWh_during_test: string;

  specific_fuel_consumption_l_per_kWh: string;
  manufacturer_sfc_l_per_kWh: string;
  sfc_deviation_percent: string;
  sfc_deviation_percent_during_test: string;

  fuel_cost_rs_per_liter: string;
  annual_fuel_cost_rs: string;
  dg_cost_per_kWh_rs: string;
  grid_cost_per_kWh_rs: string;

  calculated_efficiency_percent: string;
  manufacturer_efficiency_percent: string;
  efficiency_deviation_percent: string;

  exhaust_temperature_C: string;
  cooling_water_temperature_C: string;
  lube_oil_pressure_bar: string;
  lube_oil_consumption_liters_per_year: string;

  total_operating_hours: string;
  hours_since_last_overhaul: string;

  air_fuel_filter_condition: "" | "good" | "moderate" | "poor";
  visible_smoke_or_abnormal_vibration: boolean;

  remarks: string;

  documents: File[];
  existingDocuments: ExistingDocument[];
};

type GridCostSummary = {
  totalBillAmount: number;
  totalKVAH: number;
  gridCostPerKVAH: number;
  recordCount: number;
  fromDate: string | null;
  toDate: string | null;
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

const editableInputClass =
  "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary";

const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

const getInputClass = (disabled: boolean) =>
  disabled ? autoInputClass : editableInputClass;

const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const calculatePowerFactor = (
  measuredKVA: string,
  measuredKW: string,
): string => {
  const kvaNum = toNumber(measuredKVA);
  const kwNum = toNumber(measuredKW);

  if (kvaNum === undefined || kwNum === undefined || kvaNum === 0) {
    return "";
  }

  return String(Number((kwNum / kvaNum).toFixed(4)));
};

const calculateLoadFactor = (
  averageLoading: string,
  maxLoadObserved: string,
): string => {
  const avgNum = toNumber(averageLoading);
  const maxNum = toNumber(maxLoadObserved);

  if (avgNum === undefined || maxNum === undefined || maxNum === 0) {
    return "";
  }

  return String(Number(((avgNum / maxNum) * 100).toFixed(2)));
};

const calculateAverageLoading = (
  maxLoadObserved: string,
  minLoadObserved: string,
): string => {
  const maxNum = toNumber(maxLoadObserved);
  const minNum = toNumber(minLoadObserved);

  if (maxNum === undefined || minNum === undefined) {
    return "";
  }

  return String(Number(((maxNum + minNum) / 2).toFixed(2)));
};

const calculateUnitsGeneratedPerHour = (
  unitsGeneratedPerYear: string,
  totalWorkingHoursPerYear: string,
): string => {
  const unitsNum = toNumber(unitsGeneratedPerYear);
  const hoursNum = toNumber(totalWorkingHoursPerYear);

  if (unitsNum === undefined || hoursNum === undefined || hoursNum === 0) {
    return "";
  }

  return String(Number((unitsNum / hoursNum).toFixed(2)));
};

const calculateFuelConsumptionPerHour = (
  annualFuelConsumption: string,
  totalWorkingHoursPerYear: string,
): string => {
  const fuelNum = toNumber(annualFuelConsumption);
  const hoursNum = toNumber(totalWorkingHoursPerYear);

  if (fuelNum === undefined || hoursNum === undefined || hoursNum === 0) {
    return "";
  }

  return String(Number((fuelNum / hoursNum).toFixed(2)));
};

const calculateSpecificFuelConsumption = (
  annualFuelConsumption: string,
  unitsGeneratedPerYear: string,
): string => {
  const fuelNum = toNumber(annualFuelConsumption);
  const unitsNum = toNumber(unitsGeneratedPerYear);

  if (fuelNum === undefined || unitsNum === undefined || unitsNum === 0) {
    return "";
  }

  return String(Number((fuelNum / unitsNum).toFixed(4)));
};

const calculateTestUnitsPerHour = (
  unitsDuringTest: string,
  timeDuration: string,
): string => {
  const unitsNum = toNumber(unitsDuringTest);
  const timeNum = toNumber(timeDuration);

  if (unitsNum === undefined || timeNum === undefined || timeNum === 0) {
    return "";
  }

  return String(Number((unitsNum / timeNum).toFixed(2)));
};

const calculateTestFuelPerHour = (
  fuelDuringTest: string,
  timeDuration: string,
): string => {
  const fuelNum = toNumber(fuelDuringTest);
  const timeNum = toNumber(timeDuration);

  if (fuelNum === undefined || timeNum === undefined || timeNum === 0) {
    return "";
  }

  return String(Number((fuelNum / timeNum).toFixed(2)));
};

const calculateTestSpecificFuelConsumption = (
  fuelDuringTest: string,
  unitsDuringTest: string,
): string => {
  const fuelNum = toNumber(fuelDuringTest);
  const unitsNum = toNumber(unitsDuringTest);

  if (fuelNum === undefined || unitsNum === undefined || unitsNum === 0) {
    return "";
  }

  return String(Number((fuelNum / unitsNum).toFixed(4)));
};

const calculateSfcDeviationPercent = (
  specificFuelConsumption: string,
  manufacturerSfc: string,
): string => {
  const sfcNum = toNumber(specificFuelConsumption);
  const manufacturerNum = toNumber(manufacturerSfc);

  if (
    sfcNum === undefined ||
    manufacturerNum === undefined ||
    manufacturerNum === 0
  ) {
    return "";
  }

  return String(
    Number((((sfcNum - manufacturerNum) / manufacturerNum) * 100).toFixed(2)),
  );
};

const calculateAnnualFuelCost = (
  annualFuelConsumption: string,
  fuelCostPerLiter: string,
): string => {
  const fuelNum = toNumber(annualFuelConsumption);
  const costNum = toNumber(fuelCostPerLiter);

  if (fuelNum === undefined || costNum === undefined) {
    return "";
  }

  return String(Number((fuelNum * costNum).toFixed(2)));
};

const calculateDgCostPerKwh = (
  annualFuelCost: string,
  unitsGeneratedPerYear: string,
): string => {
  const annualCostNum = toNumber(annualFuelCost);
  const unitsNum = toNumber(unitsGeneratedPerYear);

  if (annualCostNum === undefined || unitsNum === undefined || unitsNum === 0) {
    return "";
  }

  return String(Number((annualCostNum / unitsNum).toFixed(2)));
};

const calculateCalculatedDgEfficiency = (
  unitsGeneratedPerHour: string,
  fuelConsumptionPerHour: string,
): string => {
  const unitsNum = toNumber(unitsGeneratedPerHour);
  const fuelNum = toNumber(fuelConsumptionPerHour);

  if (unitsNum === undefined || fuelNum === undefined || fuelNum === 0) {
    return "";
  }

  return String(Number(((unitsNum / (fuelNum * 10)) * 100).toFixed(4)));
};

const calculateEfficiencyDeviation = (
  manufacturerEfficiency: string,
  calculatedEfficiency: string,
): string => {
  const manufacturerNum = toNumber(manufacturerEfficiency);
  const calculatedNum = toNumber(calculatedEfficiency);

  if (
    manufacturerNum === undefined ||
    calculatedNum === undefined ||
    manufacturerNum === 0
  ) {
    return "";
  }

  return String(
    Number(
      (((manufacturerNum - calculatedNum) / manufacturerNum) * 100).toFixed(2),
    ),
  );
};

function applyDGAuditDerivedCalculations(
  form: DGAuditFormState,
): DGAuditFormState {
  const updated = { ...form };

  updated.power_factor = calculatePowerFactor(
    updated.measured_kVA_output,
    updated.measured_kW_output,
  );

  updated.average_loading_percent = calculateAverageLoading(
    updated.max_load_observed_kW,
    updated.min_load_observed_kW,
  );

  updated.load_factor_percent = calculateLoadFactor(
    updated.average_loading_percent,
    updated.max_load_observed_kW,
  );

  updated.units_generated_per_hour_kWh = calculateUnitsGeneratedPerHour(
    updated.units_generated_per_year_kWh,
    updated.total_working_hours_per_year,
  );

  updated.fuel_consumption_per_hour_liters = calculateFuelConsumptionPerHour(
    updated.annual_fuel_consumption_liters,
    updated.total_working_hours_per_year,
  );

  updated.specific_fuel_consumption_l_per_kWh =
    calculateSpecificFuelConsumption(
      updated.annual_fuel_consumption_liters,
      updated.units_generated_per_year_kWh,
    );

  updated.sfc_deviation_percent = calculateSfcDeviationPercent(
    updated.specific_fuel_consumption_l_per_kWh,
    updated.manufacturer_sfc_l_per_kWh,
  );

  updated.units_generated_per_hour_kWh_during_test = calculateTestUnitsPerHour(
    updated.units_generated_during_test_kWh,
    updated.time_duration_of_the_test_hours,
  );

  updated.fuel_consumption_per_hour_liters_during_test = calculateTestFuelPerHour(
    updated.fuel_consumption_during_test_lph,
    updated.time_duration_of_the_test_hours,
  );

  updated.specific_fuel_consumption_l_per_kWh_during_test = calculateTestSpecificFuelConsumption(
    updated.fuel_consumption_during_test_lph,
    updated.units_generated_during_test_kWh,
  );

  updated.sfc_deviation_percent_during_test = calculateSfcDeviationPercent(
    updated.specific_fuel_consumption_l_per_kWh_during_test,
    updated.manufacturer_sfc_l_per_kWh,
  );

  updated.annual_fuel_cost_rs = calculateAnnualFuelCost(
    updated.annual_fuel_consumption_liters,
    updated.fuel_cost_rs_per_liter,
  );

  updated.dg_cost_per_kWh_rs = calculateDgCostPerKwh(
    updated.annual_fuel_cost_rs,
    updated.units_generated_per_year_kWh,
  );

  updated.calculated_efficiency_percent = calculateCalculatedDgEfficiency(
    updated.units_generated_per_hour_kWh,
    updated.fuel_consumption_per_hour_liters,
  );

  updated.efficiency_deviation_percent = calculateEfficiencyDeviation(
    updated.manufacturer_efficiency_percent,
    updated.calculated_efficiency_percent,
  );

  return updated;
}

const createEmptyForm = (): DGAuditFormState => ({
  isNew: true,
  isEditing: true,

  measured_voltage_LL: "",
  measured_current_avg: "",
  measured_kW_output: "",
  measured_kVA_output: "",
  power_factor: "",
  frequency_Hz: "",
  number_of_phase: "",

  max_load_observed_kW: "",
  min_load_observed_kW: "",
  average_loading_percent: "",
  load_factor_percent: "",
  idle_running_observed: false,
  parallel_operation: false,

  annual_fuel_consumption_liters: "",
  units_generated_per_year_kWh: "",
  total_working_hours_per_year: "",
  units_generated_per_hour_kWh: "",
  fuel_consumption_per_hour_liters: "",

  fuel_consumption_during_test_lph: "",
  units_generated_during_test_kWh: "",
  time_duration_of_the_test_hours: "",
  units_generated_per_hour_kWh_during_test: "",
  fuel_consumption_per_hour_liters_during_test: "",
  specific_fuel_consumption_l_per_kWh_during_test: "",

  specific_fuel_consumption_l_per_kWh: "",
  manufacturer_sfc_l_per_kWh: "",
  sfc_deviation_percent: "",
  sfc_deviation_percent_during_test: "",

  fuel_cost_rs_per_liter: "",
  annual_fuel_cost_rs: "",
  dg_cost_per_kWh_rs: "",
  grid_cost_per_kWh_rs: "",

  calculated_efficiency_percent: "",
  manufacturer_efficiency_percent: "",
  efficiency_deviation_percent: "",

  exhaust_temperature_C: "",
  cooling_water_temperature_C: "",
  lube_oil_pressure_bar: "",
  lube_oil_consumption_liters_per_year: "",

  total_operating_hours: "",
  hours_since_last_overhaul: "",

  air_fuel_filter_condition: "",
  visible_smoke_or_abnormal_vibration: false,

  remarks: "",

  documents: [],
  existingDocuments: [],
});

function recordToForm(record: any): DGAuditFormState {
  return {
    id: record._id,
    isNew: false,
    isEditing: false,

    measured_voltage_LL: record.measured_voltage_LL?.toString() || "",
    measured_current_avg: record.measured_current_avg?.toString() || "",
    measured_kW_output: record.measured_kW_output?.toString() || "",
    measured_kVA_output: record.measured_kVA_output?.toString() || "",
    power_factor: record.power_factor?.toString() || "",
    frequency_Hz: record.frequency_Hz?.toString() || "",
    number_of_phase: record.number_of_phase || "",

    max_load_observed_kW: record.max_load_observed_kW?.toString() || "",
    min_load_observed_kW: record.min_load_observed_kW?.toString() || "",
    average_loading_percent: record.average_loading_percent?.toString() || "",
    load_factor_percent: record.load_factor_percent?.toString() || "",
    idle_running_observed: !!record.idle_running_observed,
    parallel_operation: !!record.parallel_operation,

    annual_fuel_consumption_liters:
      record.annual_fuel_consumption_liters?.toString() || "",
    units_generated_per_year_kWh:
      record.units_generated_per_year_kWh?.toString() || "",
    total_working_hours_per_year:
      record.total_working_hours_per_year?.toString() || "",
    units_generated_per_hour_kWh:
      record.units_generated_per_hour_kWh?.toString() || "",
    fuel_consumption_per_hour_liters:
      record.fuel_consumption_per_hour_liters?.toString() || "",

    fuel_consumption_during_test_lph:
      record.fuel_consumption_during_test_lph?.toString() || "",
    units_generated_during_test_kWh:
      record.units_generated_during_test_kWh?.toString() || "",
    time_duration_of_the_test_hours:
      record.time_duration_of_the_test_hours?.toString() || "",
    units_generated_per_hour_kWh_during_test:
      record.units_generated_per_hour_kWh_during_test?.toString() || "",
    fuel_consumption_per_hour_liters_during_test:
      record.fuel_consumption_per_hour_liters_during_test?.toString() || "",
    specific_fuel_consumption_l_per_kWh_during_test:
      record.specific_fuel_consumption_l_per_kWh_during_test?.toString() || "",

    specific_fuel_consumption_l_per_kWh:
      record.specific_fuel_consumption_l_per_kWh?.toString() || "",
    manufacturer_sfc_l_per_kWh:
      record.manufacturer_sfc_l_per_kWh?.toString() || "",
    sfc_deviation_percent: record.sfc_deviation_percent?.toString() || "",
    sfc_deviation_percent_during_test:
      record.sfc_deviation_percent_during_test?.toString() || "",

    fuel_cost_rs_per_liter: record.fuel_cost_rs_per_liter?.toString() || "",
    annual_fuel_cost_rs: record.annual_fuel_cost_rs?.toString() || "",
    dg_cost_per_kWh_rs: record.dg_cost_per_kWh_rs?.toString() || "",
    grid_cost_per_kWh_rs: record.grid_cost_per_kWh_rs?.toString() || "",

    calculated_efficiency_percent:
      record.calculated_efficiency_percent?.toString() || "",
    manufacturer_efficiency_percent:
      record.manufacturer_efficiency_percent?.toString() || "",
    efficiency_deviation_percent:
      record.efficiency_deviation_percent?.toString() || "",

    exhaust_temperature_C: record.exhaust_temperature_C?.toString() || "",
    cooling_water_temperature_C:
      record.cooling_water_temperature_C?.toString() || "",
    lube_oil_pressure_bar: record.lube_oil_pressure_bar?.toString() || "",
    lube_oil_consumption_liters_per_year:
      record.lube_oil_consumption_liters_per_year?.toString() || "",

    total_operating_hours: record.total_operating_hours?.toString() || "",
    hours_since_last_overhaul:
      record.hours_since_last_overhaul?.toString() || "",

    air_fuel_filter_condition: record.air_fuel_filter_condition || "",
    visible_smoke_or_abnormal_vibration:
      !!record.visible_smoke_or_abnormal_vibration,

    remarks: record.remarks || "",

    documents: [],
    existingDocuments: record.documents || [],
  };
}

export function DGAuditRecordSection({
  facilityId,
  utilityAccountId,
  dgSetId,
  auditStepLocked = false,
  hideAuditSubmitChrome = false,
  embedded = false,
  hideDocuments = false,
  initialEditing = false,
  onSaved,
}: DGAuditRecordSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const { data, isLoading } = useGetDGAuditRecordsQuery({
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    dg_set_id: dgSetId,
  });
  const { data: billingResponse } = useGetUtilityBillingRecordsQuery({
    utility_account_id: utilityAccountId,
  });

  const gridCostSummary = useMemo(() => {
    return calculateGridCostPerKVAHForOneYear(billingResponse?.data || []);
  }, [billingResponse]);

  const [createDGAuditRecord, { isLoading: isCreating }] =
    useCreateDGAuditRecordMutation();

  const [updateDGAuditRecord, { isLoading: isUpdating }] =
    useUpdateDGAuditRecordMutation();
  const [deleteDGAuditRecord, { isLoading: isDeleting }] =
    useDeleteDGAuditRecordMutation();
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

  const [form, setForm] = useState<DGAuditFormState>(createEmptyForm());

  useEffect(() => {
    if (!auditStepLocked) return;
    setForm((prev) => ({ ...prev, isEditing: false }));
  }, [auditStepLocked]);
  const [excelImporting, setExcelImporting] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  useEffect(() => {
    if (latestRecord) {
      const next = recordToForm(latestRecord);
      if (initialEditing && !auditStepLocked) {
        next.isEditing = true;
      }
      setForm(next);
    } else {
      setForm(createEmptyForm());
    }
  }, [latestRecord, initialEditing, auditStepLocked]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      grid_cost_per_kWh_rs:
        gridCostSummary?.gridCostPerKVAH !== undefined &&
          gridCostSummary?.gridCostPerKVAH !== null
          ? String(gridCostSummary.gridCostPerKVAH)
          : "",
    }));

    setFromDate(toDateInput(gridCostSummary?.fromDate));
    setToDate(toDateInput(gridCostSummary?.toDate));
  }, [gridCostSummary]);

  const updateForm = (key: keyof DGAuditFormState, value: string | boolean) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value } as DGAuditFormState;
      return applyDGAuditDerivedCalculations(updated);
    });
  };

  const handleDownloadDGAuditExcelTemplate = () => {
    const rowPrefill: Partial<
      Record<keyof DGAuditExcelFormState, string | boolean>
    > = {
      measured_voltage_LL: form.measured_voltage_LL,
      measured_current_avg: form.measured_current_avg,
      measured_kW_output: form.measured_kW_output,
      measured_kVA_output: form.measured_kVA_output,
      frequency_Hz: form.frequency_Hz,
      max_load_observed_kW: form.max_load_observed_kW,
      min_load_observed_kW: form.min_load_observed_kW,
      average_loading_percent: form.average_loading_percent,
      idle_running_observed: form.idle_running_observed,
      parallel_operation: form.parallel_operation,
      annual_fuel_consumption_liters: form.annual_fuel_consumption_liters,
      units_generated_per_year_kWh: form.units_generated_per_year_kWh,
      total_working_hours_per_year: form.total_working_hours_per_year,
      fuel_consumption_during_test_lph: form.fuel_consumption_during_test_lph,
      units_generated_during_test_kWh: form.units_generated_during_test_kWh,
      time_duration_of_the_test_hours: form.time_duration_of_the_test_hours,
      manufacturer_sfc_l_per_kWh: form.manufacturer_sfc_l_per_kWh,
      fuel_cost_rs_per_liter: form.fuel_cost_rs_per_liter,
      grid_cost_per_kWh_rs: form.grid_cost_per_kWh_rs,
      manufacturer_efficiency_percent: form.manufacturer_efficiency_percent,
      exhaust_temperature_C: form.exhaust_temperature_C,
      cooling_water_temperature_C: form.cooling_water_temperature_C,
      lube_oil_pressure_bar: form.lube_oil_pressure_bar,
      lube_oil_consumption_liters_per_year:
        form.lube_oil_consumption_liters_per_year,
      hours_since_last_overhaul: form.hours_since_last_overhaul,
      air_fuel_filter_condition: form.air_fuel_filter_condition,
      visible_smoke_or_abnormal_vibration:
        form.visible_smoke_or_abnormal_vibration,
      remarks: form.remarks,
    };
    downloadDGAuditTemplate({ rowPrefill });
  };

  const handleDGAuditExcelFileChange = async (
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
      const parsed = await parseDGAuditExcel(file);
      if (!Object.keys(parsed).length) {
        toast.error("No recognized fields found. Use the downloaded template.");
        return;
      }

      setForm((prev) => {
        const next: DGAuditFormState = { ...prev, isEditing: true };
        const mutable = next as unknown as Record<string, unknown>;
        for (const [k, v] of Object.entries(parsed)) {
          if (v === undefined) continue;
          mutable[k] = v;
        }
        return applyDGAuditDerivedCalculations(next);
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
      setForm(recordToForm(latestRecord));
    } else {
      setForm(createEmptyForm());
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
      dg_set_id: dgSetId,
      utility_account_id: utilityAccountId,
      facility_id: facilityId,

      measured_voltage_LL: form.measured_voltage_LL || undefined,
      measured_current_avg: form.measured_current_avg || undefined,
      measured_kW_output: form.measured_kW_output || undefined,
      measured_kVA_output: form.measured_kVA_output || undefined,
      power_factor: form.power_factor || undefined,
      frequency_Hz: form.frequency_Hz || undefined,
      number_of_phase: (form.number_of_phase as "single_phase" | "three_phase") || undefined,

      max_load_observed_kW: form.max_load_observed_kW || undefined,
      min_load_observed_kW: form.min_load_observed_kW || undefined,
      average_loading_percent: form.average_loading_percent || undefined,
      load_factor_percent: form.load_factor_percent || undefined,
      idle_running_observed: form.idle_running_observed,
      parallel_operation: form.parallel_operation,

      annual_fuel_consumption_liters:
        form.annual_fuel_consumption_liters || undefined,
      units_generated_per_year_kWh:
        form.units_generated_per_year_kWh || undefined,
      total_working_hours_per_year:
        form.total_working_hours_per_year || undefined,
      units_generated_per_hour_kWh:
        form.units_generated_per_hour_kWh || undefined,
      fuel_consumption_per_hour_liters:
        form.fuel_consumption_per_hour_liters || undefined,

      fuel_consumption_during_test_lph:
        form.fuel_consumption_during_test_lph || undefined,
      units_generated_during_test_kWh:
        form.units_generated_during_test_kWh || undefined,
      time_duration_of_the_test_hours:
        form.time_duration_of_the_test_hours || undefined,
      units_generated_per_hour_kWh_during_test:
        form.units_generated_per_hour_kWh_during_test || undefined,
      fuel_consumption_per_hour_liters_during_test:
        form.fuel_consumption_per_hour_liters_during_test || undefined,
      specific_fuel_consumption_l_per_kWh_during_test:
        form.specific_fuel_consumption_l_per_kWh_during_test || undefined,

      specific_fuel_consumption_l_per_kWh:
        form.specific_fuel_consumption_l_per_kWh || undefined,
      manufacturer_sfc_l_per_kWh: form.manufacturer_sfc_l_per_kWh || undefined,
      sfc_deviation_percent: form.sfc_deviation_percent || undefined,
      sfc_deviation_percent_during_test:
        form.sfc_deviation_percent_during_test || undefined,

      fuel_cost_rs_per_liter: form.fuel_cost_rs_per_liter || undefined,
      annual_fuel_cost_rs: form.annual_fuel_cost_rs || undefined,
      dg_cost_per_kWh_rs: form.dg_cost_per_kWh_rs || undefined,
      grid_cost_per_kWh_rs: form.grid_cost_per_kWh_rs || undefined,

      calculated_efficiency_percent:
        form.calculated_efficiency_percent || undefined,
      manufacturer_efficiency_percent:
        form.manufacturer_efficiency_percent || undefined,
      efficiency_deviation_percent:
        form.efficiency_deviation_percent || undefined,

      exhaust_temperature_C: form.exhaust_temperature_C || undefined,
      cooling_water_temperature_C:
        form.cooling_water_temperature_C || undefined,
      lube_oil_pressure_bar: form.lube_oil_pressure_bar || undefined,
      lube_oil_consumption_liters_per_year:
        form.lube_oil_consumption_liters_per_year || undefined,

      total_operating_hours: form.total_operating_hours || undefined,
      hours_since_last_overhaul: form.hours_since_last_overhaul || undefined,

      air_fuel_filter_condition: form.air_fuel_filter_condition || undefined,
      visible_smoke_or_abnormal_vibration:
        form.visible_smoke_or_abnormal_vibration,

      remarks: form.remarks.trim(),

      documents: form.documents.length ? form.documents : undefined,
    };

    try {
      await toastHandler({
        action: () => {
          if (form.isNew) {
            return createDGAuditRecord(payload).unwrap();
          }

          if (form.id) {
            return updateDGAuditRecord({
              id: form.id,
              ...payload,
            }).unwrap();
          }

          return Promise.reject(new Error("DG audit record ID is missing."));
        },
        loading: form.isNew
          ? "Creating DG audit record..."
          : "Updating DG audit record...",
        success: form.isNew
          ? "DG audit record created successfully"
          : "DG audit record updated successfully",
      });
      if (initialEditing || hideDocuments) {
        setForm((prev) => ({ ...prev, isEditing: false, isNew: false }));
      }
      onSaved?.();
    } catch (error: any) {
      console.error("Failed to save DG audit record:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!form.id || !canDeleteRecords) return;
    try {
      await deleteDGAuditRecord(form.id).unwrap();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete DG audit record:", error);
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
          {!embedded ? (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-foreground">DG Audit Record</h3>
            </div>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {form.isNew ? "Create DG Audit Record" : "DG Audit Record"}
              </CardTitle>

              <div
                className={cnHideUtilityAuditEdits(
                  auditStepLocked,
                  "flex flex-wrap items-center gap-2",
                )}
              >
                <input
                  id="dg-audit-excel-import"
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleDGAuditExcelFileChange}
                  disabled={excelImporting}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadDGAuditExcelTemplate}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Excel template
                </Button>

                <Label
                  htmlFor="dg-audit-excel-import"
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground ${excelImporting ? "pointer-events-none opacity-50" : ""
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
              {/* Electrical Measurements */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Electrical Measurements
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                  {/* Number of Phase — first */}
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Number of Phase
                      <FieldInfo
                        title="Number of Phase"
                        message="Select from two options: Single Phase or Three Phase."
                      />
                    </Label>
                    <select
                      value={form.number_of_phase}
                      onChange={(e) =>
                        updateForm(
                          "number_of_phase",
                          e.target.value as "" | "single_phase" | "three_phase",
                        )
                      }
                      disabled={!form.isEditing}
                      className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${!form.isEditing
                          ? "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100"
                          : "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                        }`}
                    >
                      <option value="">— Select —</option>
                      <option value="single_phase">Single Phase</option>
                      <option value="three_phase">Three Phase</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Measured Voltage L-L
                      <FieldInfo
                        title="Measured Voltage in Volts"
                        message="For Three Phase: Enter Line-Line (L-L) voltage — should be ±6% of 415 V. For Single Phase: Enter Line-Neutral (L-N) voltage — should be ±6% of 240 V."
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.measured_voltage_LL}
                      onChange={(e) =>
                        updateForm("measured_voltage_LL", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Measured Current Avg (A)
                      <FieldInfo
                        title="Measured Current in Amps"
                        message="Fill average value of Line currents RYB in Amps for Three Phase DG, or Phase current in Amps for Single Phase DG."
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.measured_current_avg}
                      onChange={(e) =>
                        updateForm("measured_current_avg", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Measured kW Output
                      <FieldInfo
                        title="Measured kW Output"
                        message={`Fill measured value of kW output.\n\nThree Phase formula: (1.732 × V × I × PF) ÷ 1000 — should be within ±5% of measured value.\n\nSingle Phase formula: (V × I × PF) ÷ 1000 — should be within ±5% of measured value.`}
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.measured_kW_output}
                      onChange={(e) =>
                        updateForm("measured_kW_output", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Measured kVA Output
                      <FieldInfo
                        title="Measured kVA Output"
                        message={`Fill measured value of kVA output.\n\nThree Phase: should be within ±5% of measured kVA value.\n\nSingle Phase: should be within ±5% of measured kVA value.`}
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.measured_kVA_output}
                      onChange={(e) =>
                        updateForm("measured_kVA_output", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Power Factor
                      <FieldInfo
                        title="Power Factor"
                        message="Fill measured value of Power Factor (average value). Range should be within 0.2 to 1.0."
                      />
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.power_factor}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Frequency (Hz)
                      <FieldInfo
                        title="Frequency (Hz)"
                        message="Fill measured value of frequency in Hz. Acceptable range: 48 to 52 Hz."
                      />
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.frequency_Hz}
                      onChange={(e) => updateForm("frequency_Hz", e.target.value)}
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                </div>
              </div>

              {/* Load Analysis */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Load Analysis
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Max Load Observed (kW)
                      <FieldInfo
                        title="Maximum Load in kW"
                        message="Fill Max kW observed during normal operation of DG as reported by the operator."
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.max_load_observed_kW}
                      onChange={(e) =>
                        updateForm("max_load_observed_kW", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Min Load Observed (kW)
                      <FieldInfo
                        title="Minimum Load in kW"
                        message="Fill Minimum kW observed during normal operation of DG as reported by the operator."
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.min_load_observed_kW}
                      onChange={(e) =>
                        updateForm("min_load_observed_kW", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Average Loading (kW)
                      <FieldInfo
                        title="Average Loading in kW"
                        message="Average of Maximum and Minimum Load."
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.average_loading_percent}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Load Factor (%)
                      <FieldInfo
                        title="Load Factor"
                        message="Ideally should be between 60% to 85%."
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.load_factor_percent}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={form.idle_running_observed}
                      onChange={(e) =>
                        updateForm("idle_running_observed", e.target.checked)
                      }
                      disabled={!form.isEditing}
                    />
                    <span className="flex items-center">
                      Idle Running Observed
                      <FieldInfo
                        title="Idle Running Observed"
                        message="Yes or No."
                      />
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={form.parallel_operation}
                      onChange={(e) =>
                        updateForm("parallel_operation", e.target.checked)
                      }
                      disabled={!form.isEditing}
                    />
                    <span className="flex items-center">
                      Parallel Operation
                      <FieldInfo
                        title="Parallel Operation"
                        message="Yes or No."
                      />
                    </span>
                  </label>
                </div>
              </div>

              {/* Fuel & Generation (Facility Records) */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Fuel & Generation (Facility Records)
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Annual Fuel Consumption (Liters)
                      <FieldInfo
                        title="Annual Fuel Consumption"
                        message="Liters/year (Collect data from client Records)*"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.annual_fuel_consumption_liters}
                      onChange={(e) =>
                        updateForm("annual_fuel_consumption_liters", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Units Generated Per Year (kWh)
                      <FieldInfo
                        title="Units Generated/ year"
                        message="kWh (Collect data from client Records)*"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.units_generated_per_year_kWh}
                      onChange={(e) =>
                        updateForm("units_generated_per_year_kWh", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Total Working Hours Per Year
                      <FieldInfo
                        title="Total Working Hours in a Year"
                        message="Hours (Collect data from client Records)*"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.total_working_hours_per_year}
                      onChange={(e) =>
                        updateForm("total_working_hours_per_year", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Units Generated Per Hour (kWh)
                      <FieldInfo
                        title="Units Generated per hour"
                        message="In kWh"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.units_generated_per_hour_kWh}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Fuel Consumption Per Hour (Liters)
                      <FieldInfo
                        title="Fuel Consumption per hour"
                        message="In Ltrs"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.fuel_consumption_per_hour_liters}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Specific Fuel Consumption (L/kWh)
                      <FieldInfo
                        title="Specific Fuel Consumption"
                        message="L/kWh"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.specific_fuel_consumption_l_per_kWh}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>
                </div>
              </div>

              {/* Fuel & Generation (Measurements) */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Fuel & Generation (Measurements)
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Units Generated During Test (kWh)
                      <FieldInfo
                        title="Units Generated During Test"
                        message="kWh generated during the field test"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.units_generated_during_test_kWh}
                      onChange={(e) =>
                        updateForm(
                          "units_generated_during_test_kWh",
                          e.target.value,
                        )
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Fuel Consumption During Test (Liters)
                      <FieldInfo
                        title="Fuel Consumption During Test"
                        message="L/hr (Operate the DG at 80% Load and record fuel consumption in one hour)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.fuel_consumption_during_test_lph}
                      onChange={(e) =>
                        updateForm(
                          "fuel_consumption_during_test_lph",
                          e.target.value,
                        )
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Time Duration of the Test (Hours)
                      <FieldInfo
                        title="Time Duration of the Test"
                        message="Hours"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.time_duration_of_the_test_hours}
                      onChange={(e) =>
                        updateForm(
                          "time_duration_of_the_test_hours",
                          e.target.value,
                        )
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Units Generated Per Hour During Test (kWh)
                      <FieldInfo
                        title="Units Generated Per Hour During Test"
                        message="In kWh"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.units_generated_per_hour_kWh_during_test}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Fuel Consumption Per Hour During Test (Liters)
                      <FieldInfo
                        title="Fuel Consumption Per Hour During Test"
                        message="In Ltrs"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.fuel_consumption_per_hour_liters_during_test}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Specific Fuel Consumption During Test (L/kWh)
                      <FieldInfo
                        title="Specific Fuel Consumption (Measured)"
                        message="L/kWh"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.specific_fuel_consumption_l_per_kWh_during_test}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>
                </div>
              </div>

              {/* Fuel & Generation (SFC Deviation (%)) */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Fuel & Generation (SFC Deviation (%))
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Manufacturer SFC (L/kWh)
                      <FieldInfo
                        title="Manufacturer SFC"
                        message="L/kWh (Add value given by the Manufacturer at average load as calculated)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.manufacturer_sfc_l_per_kWh}
                      onChange={(e) =>
                        updateForm("manufacturer_sfc_l_per_kWh", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      SFC Deviation (Facility Records) (%)
                      <FieldInfo
                        title="SFC Deviation (Facility Records)"
                        message="% Deviation as per calculated SFC from Client data"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.sfc_deviation_percent}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      SFC Deviation During Test (%)
                      <FieldInfo
                        title="SFC Deviation During Test"
                        message="% Deviation as per measured SFC from field measurement data"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.sfc_deviation_percent_during_test}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>
                </div>
              </div>

              {/* Cost Analysis */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Cost Analysis
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Fuel Cost (Rs/Liter)
                      <FieldInfo
                        title="Fuel Cost"
                        message="₹/Liter (Add average value of diesel purchase over the audit period)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.fuel_cost_rs_per_liter}
                      onChange={(e) =>
                        updateForm("fuel_cost_rs_per_liter", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Annual Fuel Cost (Rs)
                      <FieldInfo
                        title="Cost of Fuel (Annual)"
                        message="₹/year"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.annual_fuel_cost_rs}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      DG Cost Per kWh (Rs)
                      <FieldInfo
                        title="DG Generation Cost per kWh"
                        message="₹/kWh"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.dg_cost_per_kWh_rs}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2 ">
                    <Label className="flex items-center">
                      Grid Cost Per kWh (Rs)
                      <FieldInfo
                        title="Grid Cost per kWh"
                        message="₹/kWh data from sheet no-1"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.grid_cost_per_kWh_rs}
                      onChange={(e) =>
                        updateForm("grid_cost_per_kWh_rs", e.target.value)
                      }
                      disabled
                      className={getInputClass(true)}
                    />
                    <span className="flex justify-center text-xs text-muted-foreground">
                      From {fromDate} - To {toDate}
                    </span>
                    <span className="flex justify-center text-xs text-muted-foreground">
                      *this data is calculated on the basis of utility billing
                      records. Please fill 1 year data to get accurate data.
                    </span>
                  </div>
                </div>
              </div>

              {/* Efficiency */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Efficiency
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Calculated Efficiency (%)
                      <FieldInfo
                        title="Calculated DG Efficiency"
                        message="% (calculate)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.calculated_efficiency_percent}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Manufacturer Efficiency (%)
                      <FieldInfo
                        title="Manufacturer Efficiency"
                        message="% (Collect data from client Records)* generally between 35% to 42 %"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.manufacturer_efficiency_percent}
                      onChange={(e) =>
                        updateForm(
                          "manufacturer_efficiency_percent",
                          e.target.value,
                        )
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Efficiency Deviation (%)
                      <FieldInfo
                        title="Efficiency Deviation"
                        message="% (Calculate)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.efficiency_deviation_percent}
                      disabled
                      className={getInputClass(true)}
                    />
                  </div>
                </div>
              </div>

              {/* Operating Conditions */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Operating Conditions
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Exhaust Temperature (°C)
                      <FieldInfo
                        title="Exhaust Temperature"
                        message="°C (Add Measured Value)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.exhaust_temperature_C}
                      onChange={(e) =>
                        updateForm("exhaust_temperature_C", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Cooling Water Temperature (°C)
                      <FieldInfo
                        title="Cooling Water Temp (In/Out)"
                        message="°C (Add Measured Value) if water cooled unit"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.cooling_water_temperature_C}
                      onChange={(e) =>
                        updateForm("cooling_water_temperature_C", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Lube Oil Pressure (bar)
                      <FieldInfo
                        title="Lube Oil Pressure"
                        message="Bar (Add Recorded Value)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.lube_oil_pressure_bar}
                      onChange={(e) =>
                        updateForm("lube_oil_pressure_bar", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Lube Oil Consumption (Liters/Year)
                      <FieldInfo
                        title="Lube Oil Consumption"
                        message="Liters/year (Collect data from client Records)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.lube_oil_consumption_liters_per_year}
                      onChange={(e) =>
                        updateForm(
                          "lube_oil_consumption_liters_per_year",
                          e.target.value,
                        )
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Total Operating Hours
                      <FieldInfo
                        title="Total Operating Hours"
                        message="Hours (Collect data from client Records)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.total_operating_hours}
                      onChange={(e) =>
                        updateForm("total_operating_hours", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Hours Since Last Overhaul
                      <FieldInfo
                        title="Hours Since Last Overhaul"
                        message="Hours (Collect data from client Records)"
                      />
                    </Label>
                    <Input
                      type="number"
                      value={form.hours_since_last_overhaul}
                      onChange={(e) =>
                        updateForm("hours_since_last_overhaul", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Air / Fuel Filter Condition
                      <FieldInfo
                        title="Air/Fuel Filter Condition"
                        message="OK/Not OK (Check and Add)"
                      />
                    </Label>
                    <select
                      value={form.air_fuel_filter_condition}
                      onChange={(e) =>
                        updateForm("air_fuel_filter_condition", e.target.value)
                      }
                      disabled={!form.isEditing}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select condition</option>
                      <option value="good">Good</option>
                      <option value="moderate">Moderate</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={form.visible_smoke_or_abnormal_vibration}
                      onChange={(e) =>
                        updateForm(
                          "visible_smoke_or_abnormal_vibration",
                          e.target.checked,
                        )
                      }
                      disabled={!form.isEditing}
                      className={getInputClass(!form.isEditing)}
                    />
                    <span className="flex items-center">
                      Visible Smoke or Abnormal Vibration
                      <FieldInfo
                        title="Visible Smoke / Abnormal Vibration"
                        message="Yes/No (Check and Add)"
                      />
                    </span>
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Remarks
                </h4>
                <div className="space-y-2">
                  <Label>Remarks / Notes</Label>
                  <Textarea
                    value={form.remarks}
                    onChange={(e) => updateForm("remarks", e.target.value)}
                    disabled={!form.isEditing}
                    className={getInputClass(!form.isEditing)}
                    rows={4}
                    placeholder="Write any audit observations here..."
                  />
                </div>
              </div>

              {/* Images & Documents */}
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
                <AlertDialogTitle>Delete DG audit record?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the current DG audit record. This action
                  cannot be undone.
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
