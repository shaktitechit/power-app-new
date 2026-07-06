import type {
  CreateSolarPlantRequest,
  SolarPlant,
} from "@/store/slices/electrical-audit/solarPlantApiSlice";

export type SolarPlantFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  plant_name: string;
  rating_kWp: string;
  panel_rating_watt: string;
  no_of_panels: string;
  inverter_make: string;
  inverter_rating_kW: string;
};

export const editableInputClass =
  "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary";

const toStringValue = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export function createEmptyForm(): SolarPlantFormState {
  return {
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isNew: true,
    plant_name: "",
    rating_kWp: "",
    panel_rating_watt: "",
    no_of_panels: "",
    inverter_make: "",
    inverter_rating_kW: "",
  };
}

export function plantToForm(plant: SolarPlant): SolarPlantFormState {
  return {
    id: plant._id,
    localId: plant._id,
    isNew: false,
    plant_name: plant.plant_name || "",
    rating_kWp: toStringValue(plant.rating_kWp),
    panel_rating_watt: toStringValue(plant.panel_rating_watt),
    no_of_panels: toStringValue(plant.no_of_panels),
    inverter_make: plant.inverter_make || "",
    inverter_rating_kW: toStringValue(plant.inverter_rating_kW),
  };
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildSolarPlantPayload(
  form: SolarPlantFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateSolarPlantRequest {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    plant_name: form.plant_name.trim() || undefined,
    rating_kWp: toNumber(form.rating_kWp),
    panel_rating_watt: toNumber(form.panel_rating_watt),
    no_of_panels: toNumber(form.no_of_panels),
    inverter_make: form.inverter_make.trim() || undefined,
    inverter_rating_kW: toNumber(form.inverter_rating_kW),
  };
}

export function sortSolarPlantsStable(plants: SolarPlant[]): SolarPlant[] {
  return [...plants].sort((a, b) => {
    const ta = Date.parse(a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function updateSolarPlantForm(
  form: SolarPlantFormState,
  updater: (form: SolarPlantFormState) => SolarPlantFormState,
): SolarPlantFormState {
  return updater(form);
}
