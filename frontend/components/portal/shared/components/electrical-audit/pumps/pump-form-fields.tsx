"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import type { PumpFormState } from "./pump-utils";

type Props = {
  form: PumpFormState;
  onChange: (updater: (prev: PumpFormState) => PumpFormState) => void;
  disabled?: boolean;
};

export function PumpFormFields({ form, onChange, disabled = false }: Props) {
  const updateField = (key: keyof PumpFormState, value: any) => {
    onChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="pump_tag_number">Pump Tag Number *</Label>
        <Input
          id="pump_tag_number"
          value={form.pump_tag_number}
          onChange={(e) => updateField("pump_tag_number", e.target.value)}
          disabled={disabled}
          placeholder="e.g. P-01"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="make_model">Make / Model</Label>
        <Input
          id="make_model"
          value={form.make_model}
          onChange={(e) => updateField("make_model", e.target.value)}
          disabled={disabled}
          placeholder="e.g. Kirloskar"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_power_kW_or_HP">Rated Power (kW/HP)</Label>
        <Input
          id="rated_power_kW_or_HP"
          type="number"
          step="any"
          value={form.rated_power_kW_or_HP}
          onChange={(e) => updateField("rated_power_kW_or_HP", e.target.value)}
          disabled={disabled}
          placeholder="e.g. 15"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_flow_m3_per_hr">Rated Flow (m³/hr)</Label>
        <Input
          id="rated_flow_m3_per_hr"
          type="number"
          step="any"
          value={form.rated_flow_m3_per_hr}
          onChange={(e) => updateField("rated_flow_m3_per_hr", e.target.value)}
          disabled={disabled}
          placeholder="e.g. 120"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_head_m">Rated Head (m)</Label>
        <Input
          id="rated_head_m"
          type="number"
          step="any"
          value={form.rated_head_m}
          onChange={(e) => updateField("rated_head_m", e.target.value)}
          disabled={disabled}
          placeholder="e.g. 45"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_speed_RPM">Rated Speed (RPM)</Label>
        <Input
          id="rated_speed_RPM"
          type="number"
          step="any"
          value={form.rated_speed_RPM}
          onChange={(e) => updateField("rated_speed_RPM", e.target.value)}
          disabled={disabled}
          placeholder="e.g. 1450"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="number_of_stages">Number of Stages</Label>
        <Input
          id="number_of_stages"
          type="number"
          step="1"
          value={form.number_of_stages}
          onChange={(e) => updateField("number_of_stages", e.target.value)}
          disabled={disabled}
          placeholder="e.g. 2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="year_of_installation">Year of Installation</Label>
        <Input
          id="year_of_installation"
          type="number"
          step="1"
          value={form.year_of_installation}
          onChange={(e) => updateField("year_of_installation", e.target.value)}
          disabled={disabled}
          placeholder="e.g. 2021"
        />
      </div>
    </div>
  );
}
