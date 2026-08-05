"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import type { PumpFormState } from "./pump-utils";

type RatedFlowSource = "lph" | "m3hr" | null;

type Props = {
  form: PumpFormState;
  onChange: (updater: (prev: PumpFormState) => PumpFormState) => void;
  disabled?: boolean;
};

function resolveRatedFlowSource(form: PumpFormState): RatedFlowSource {
  const hasLph = form.rated_flow_liters_per_hour !== "";
  const hasM3 = form.rated_flow_m3_per_hr !== "";
  // Prefer m³/hr when both exist — it's the required field and the usual edit source.
  if (hasM3) return "m3hr";
  if (hasLph) return "lph";
  return null;
}

export function PumpFormFields({ form, onChange, disabled = false }: Props) {
  const [ratedFlowSource, setRatedFlowSource] = useState<RatedFlowSource>(() =>
    resolveRatedFlowSource(form),
  );

  // Reset source when a different pump (or a new blank form) is loaded.
  useEffect(() => {
    setRatedFlowSource(resolveRatedFlowSource(form));
  }, [form.id, form.isNew]);

  const updateField = (key: keyof PumpFormState, value: any) => {
    if (key === "rated_flow_liters_per_hour") {
      setRatedFlowSource(value === "" ? null : "lph");
    } else if (key === "rated_flow_m3_per_hr") {
      setRatedFlowSource(value === "" ? null : "m3hr");
    }

    onChange((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };
      if (key === "rated_flow_liters_per_hour") {
        if (value === "") {
          next.rated_flow_m3_per_hr = "";
        } else {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            next.rated_flow_m3_per_hr = (num / 1000).toString();
          }
        }
      } else if (key === "rated_flow_m3_per_hr") {
        if (value === "") {
          next.rated_flow_liters_per_hour = "";
        } else {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            next.rated_flow_liters_per_hour = (num * 1000).toString();
          }
        }
      }
      return next;
    });
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
        <Label htmlFor="make_model">Make / Model *</Label>
        <Input
          id="make_model"
          value={form.make_model}
          onChange={(e) => updateField("make_model", e.target.value)}
          disabled={disabled}
          placeholder="e.g. Kirloskar"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_power_kW_or_HP">Rated Power (Motor) * (kW / HP)</Label>
        <Input
          id="rated_power_kW_or_HP"
          type="number"
          step="any"
          value={form.rated_power_kW_or_HP}
          onChange={(e) => updateField("rated_power_kW_or_HP", e.target.value)}
          disabled={disabled}
          placeholder="e.g. 63"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_efficiency_motor_percent">Rated Efficiency (Motor) * (%)</Label>
        <Input
          id="rated_efficiency_motor_percent"
          type="number"
          step="any"
          value={form.rated_efficiency_motor_percent}
          onChange={(e) => updateField("rated_efficiency_motor_percent", e.target.value)}
          disabled={disabled}
          placeholder="e.g. 91"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_flow_liters_per_hour">Rated Flow (Liters/Hour)</Label>
        <Input
          id="rated_flow_liters_per_hour"
          type="number"
          step="any"
          value={form.rated_flow_liters_per_hour}
          onChange={(e) => updateField("rated_flow_liters_per_hour", e.target.value)}
          disabled={disabled || ratedFlowSource === "m3hr"}
          placeholder="e.g. 25000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_flow_m3_per_hr">Rated Flow * (m³/hr)</Label>
        <Input
          id="rated_flow_m3_per_hr"
          type="number"
          step="any"
          value={form.rated_flow_m3_per_hr}
          onChange={(e) => updateField("rated_flow_m3_per_hr", e.target.value)}
          disabled={disabled || ratedFlowSource === "lph"}
          placeholder="e.g. 25"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rated_head_m">
          Rated Head (m) <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal ml-1">(Should be in normal range)</span>
        </Label>
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
        <Label htmlFor="rated_speed_RPM">
          Rated Speed (RPM) <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal ml-1">(Should be in normal range)</span>
        </Label>
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
        <Label htmlFor="number_of_stages">No. of Stages</Label>
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
