"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import {
  editableInputClass,
  type SolarPlantFormState,
  updateSolarPlantForm,
} from "./solar-plant-utils";

type Props = {
  form: SolarPlantFormState;
  onFormChange: (updater: (prev: SolarPlantFormState) => SolarPlantFormState) => void;
};

export function SolarPlantFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: SolarPlantFormState) => SolarPlantFormState) => {
    onFormChange((prev) => updateSolarPlantForm(prev, updater));
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label>Plant Name</Label>
        <Input
          value={form.plant_name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, plant_name: e.target.value }))
          }
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Rating (kWp)</Label>
        <Input
          type="number"
          value={form.rating_kWp}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rating_kWp: e.target.value }))
          }
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Panel Rating (W)</Label>
        <Input
          type="number"
          value={form.panel_rating_watt}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, panel_rating_watt: e.target.value }))
          }
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>No. of Panels</Label>
        <Input
          type="number"
          value={form.no_of_panels}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, no_of_panels: e.target.value }))
          }
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Inverter Make</Label>
        <Input
          value={form.inverter_make}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, inverter_make: e.target.value }))
          }
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Inverter Rating (kW)</Label>
        <Input
          type="number"
          value={form.inverter_rating_kW}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, inverter_rating_kW: e.target.value }))
          }
          className={editableInputClass}
        />
      </div>
    </div>
  );
}
