"use client";

import { useState } from "react";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import { Checkbox } from "@/components/portal/ui/checkbox";
import {
  autoInputClass,
  editableInputClass,
  type UPSAuditFormState,
  updateUPSAuditForm,
} from "./ups-audit-utils";

type Props = {
  form: UPSAuditFormState;
  onFormChange: (updater: (prev: UPSAuditFormState) => UPSAuditFormState) => void;
};

type TabType = "nameplate" | "input" | "output" | "loading" | "benchmarking" | "battery" | "thermal";

export function UPSAuditFormFields({ form, onFormChange }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<TabType>("nameplate");

  const setForm = (updater: (prev: UPSAuditFormState) => UPSAuditFormState) => {
    onFormChange((prev) => updateUPSAuditForm(prev, updater));
  };

  const tabsList: { id: TabType; label: string }[] = [
    { id: "nameplate", label: "1. Nameplate" },
    { id: "input", label: "2. Input Side" },
    { id: "output", label: "3. Output Side" },
    { id: "loading", label: "4. Loading & Energy" },
    { id: "benchmarking", label: "5. Benchmarking" },
    { id: "battery", label: "6. Battery System" },
    { id: "thermal", label: "7. Thermal & Ops" },
  ];

  return (
    <div className="space-y-6">
      {/* Horizontal Tabs */}
      <div className="flex flex-wrap gap-1 border-b pb-1">
        {tabsList.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveSubTab(t.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === t.id
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="py-2">
        {activeSubTab === "nameplate" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>UPS Tag / Asset ID</Label>
              <Input
                value={form.ups_tag_asset_id}
                onChange={(e) => setForm((p) => ({ ...p, ups_tag_asset_id: e.target.value }))}
                className={editableInputClass}
                placeholder="e.g. UPS-MDB-01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Make & Model</Label>
              <Input
                value={form.make_model}
                onChange={(e) => setForm((p) => ({ ...p, make_model: e.target.value }))}
                className={editableInputClass}
                placeholder="e.g. Emerson LX 40"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Year of Manufacture/Install</Label>
              <Input
                value={form.year_of_manufacture_installation}
                onChange={(e) => setForm((p) => ({ ...p, year_of_manufacture_installation: e.target.value }))}
                className={editableInputClass}
                placeholder="e.g. 2018 / 2019"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Technology Type</Label>
              <Input
                value={form.technology_type}
                onChange={(e) => setForm((p) => ({ ...p, technology_type: e.target.value }))}
                className={editableInputClass}
                placeholder="e.g. Online (Double Conversion)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Input Phases</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.input_phases}
                onChange={(e) => setForm((p) => ({ ...p, input_phases: e.target.value as any }))}
              >
                <option value="">Select phases</option>
                <option value="1-Phase">1-Phase</option>
                <option value="3-Phase">3-Phase</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Output Phases</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.output_phases}
                onChange={(e) => setForm((p) => ({ ...p, output_phases: e.target.value as any }))}
              >
                <option value="">Select phases</option>
                <option value="1-Phase">1-Phase</option>
                <option value="3-Phase">3-Phase</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Rated Capacity (kVA)</Label>
              <Input
                type="number"
                value={form.rated_capacity_kVA}
                onChange={(e) => setForm((p) => ({ ...p, rated_capacity_kVA: e.target.value }))}
                className={editableInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rated Output Power (kW)</Label>
              <Input
                type="number"
                value={form.rated_output_power_kW}
                onChange={(e) => setForm((p) => ({ ...p, rated_output_power_kW: e.target.value }))}
                className={editableInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rated Input Voltage V (L-L)</Label>
              <Input
                type="number"
                value={form.rated_input_voltage_LL}
                onChange={(e) => setForm((p) => ({ ...p, rated_input_voltage_LL: e.target.value }))}
                className={editableInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rated Input Current (A)</Label>
              <Input
                type="number"
                value={form.rated_input_current_A}
                onChange={(e) => setForm((p) => ({ ...p, rated_input_current_A: e.target.value }))}
                className={editableInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rated Output Voltage V (L-L)</Label>
              <Input
                type="number"
                value={form.rated_output_voltage_LL}
                onChange={(e) => setForm((p) => ({ ...p, rated_output_voltage_LL: e.target.value }))}
                className={editableInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rated Input Frequency (Hz)</Label>
              <Input
                type="number"
                value={form.rated_input_frequency_Hz}
                onChange={(e) => setForm((p) => ({ ...p, rated_input_frequency_Hz: e.target.value }))}
                className={editableInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rated Output Power Factor</Label>
              <Input
                type="number"
                step="0.01"
                value={form.rated_output_power_factor}
                onChange={(e) => setForm((p) => ({ ...p, rated_output_power_factor: e.target.value }))}
                className={editableInputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label>IEC / IS Compliance</Label>
              <Input
                value={form.standard_compliance}
                onChange={(e) => setForm((p) => ({ ...p, standard_compliance: e.target.value }))}
                className={editableInputClass}
                placeholder="e.g. IEC 62040-3 / IS 16242"
              />
            </div>
            <div className="space-y-1.5">
              <Label>BEE Star Rating (Stars)</Label>
              <Input
                type="number"
                min="0"
                max="5"
                value={form.bee_star_rating}
                onChange={(e) => setForm((p) => ({ ...p, bee_star_rating: e.target.value }))}
                className={editableInputClass}
              />
            </div>
          </div>
        )}

        {activeSubTab === "input" && (
          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-3">
              <h4 className="text-sm font-semibold text-foreground">Voltages & Currents (R / Y / B)</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Input Voltage R (V RMS)</Label>
                <Input
                  type="number"
                  value={form.input_voltage_R}
                  onChange={(e) => setForm((p) => ({ ...p, input_voltage_R: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Voltage Y (V RMS)</Label>
                <Input
                  type="number"
                  value={form.input_voltage_Y}
                  onChange={(e) => setForm((p) => ({ ...p, input_voltage_Y: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Voltage B (V RMS)</Label>
                <Input
                  type="number"
                  value={form.input_voltage_B}
                  onChange={(e) => setForm((p) => ({ ...p, input_voltage_B: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Current R (A RMS)</Label>
                <Input
                  type="number"
                  value={form.input_current_R}
                  onChange={(e) => setForm((p) => ({ ...p, input_current_R: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Current Y (A RMS)</Label>
                <Input
                  type="number"
                  value={form.input_current_Y}
                  onChange={(e) => setForm((p) => ({ ...p, input_current_Y: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Current B (A RMS)</Label>
                <Input
                  type="number"
                  value={form.input_current_B}
                  onChange={(e) => setForm((p) => ({ ...p, input_current_B: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
            </div>

            <div className="border-l-4 border-primary pl-3 pt-2">
              <h4 className="text-sm font-semibold text-foreground">Power Parameters</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Input Active Power (kW)</Label>
                <Input
                  type="number"
                  value={form.input_active_power_kW}
                  onChange={(e) => setForm((p) => ({ ...p, input_active_power_kW: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Apparent Power (kVA)</Label>
                <Input
                  type="number"
                  value={form.input_apparent_power_kVA}
                  onChange={(e) => setForm((p) => ({ ...p, input_apparent_power_kVA: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Reactive Power (kVAR)</Label>
                <Input
                  type="number"
                  value={form.input_reactive_power_kVAR}
                  onChange={(e) => setForm((p) => ({ ...p, input_reactive_power_kVAR: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Power Factor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.input_power_factor}
                  onChange={(e) => setForm((p) => ({ ...p, input_power_factor: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Input Frequency (Hz)</Label>
                <Input
                  type="number"
                  value={form.input_frequency_Hz}
                  onChange={(e) => setForm((p) => ({ ...p, input_frequency_Hz: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
            </div>

            <div className="border-l-4 border-primary pl-3 pt-2">
              <h4 className="text-sm font-semibold text-foreground">Harmonics (THD R/Y/B)</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Voltage THD R (%)</Label>
                <Input
                  type="number"
                  value={form.input_voltage_thd_R}
                  onChange={(e) => setForm((p) => ({ ...p, input_voltage_thd_R: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Voltage THD Y (%)</Label>
                <Input
                  type="number"
                  value={form.input_voltage_thd_Y}
                  onChange={(e) => setForm((p) => ({ ...p, input_voltage_thd_Y: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Voltage THD B (%)</Label>
                <Input
                  type="number"
                  value={form.input_voltage_thd_B}
                  onChange={(e) => setForm((p) => ({ ...p, input_voltage_thd_B: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Current THD R (%)</Label>
                <Input
                  type="number"
                  value={form.input_current_thd_R}
                  onChange={(e) => setForm((p) => ({ ...p, input_current_thd_R: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Current THD Y (%)</Label>
                <Input
                  type="number"
                  value={form.input_current_thd_Y}
                  onChange={(e) => setForm((p) => ({ ...p, input_current_thd_Y: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Current THD B (%)</Label>
                <Input
                  type="number"
                  value={form.input_current_thd_B}
                  onChange={(e) => setForm((p) => ({ ...p, input_current_thd_B: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "output" && (
          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-3">
              <h4 className="text-sm font-semibold text-foreground">Voltages & Currents (R / Y / B)</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Output Voltage R (V RMS)</Label>
                <Input
                  type="number"
                  value={form.output_voltage_R}
                  onChange={(e) => setForm((p) => ({ ...p, output_voltage_R: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Voltage Y (V RMS)</Label>
                <Input
                  type="number"
                  value={form.output_voltage_Y}
                  onChange={(e) => setForm((p) => ({ ...p, output_voltage_Y: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Voltage B (V RMS)</Label>
                <Input
                  type="number"
                  value={form.output_voltage_B}
                  onChange={(e) => setForm((p) => ({ ...p, output_voltage_B: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Current R (A RMS)</Label>
                <Input
                  type="number"
                  value={form.output_current_R}
                  onChange={(e) => setForm((p) => ({ ...p, output_current_R: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Current Y (A RMS)</Label>
                <Input
                  type="number"
                  value={form.output_current_Y}
                  onChange={(e) => setForm((p) => ({ ...p, output_current_Y: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Current B (A RMS)</Label>
                <Input
                  type="number"
                  value={form.output_current_B}
                  onChange={(e) => setForm((p) => ({ ...p, output_current_B: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
            </div>

            <div className="border-l-4 border-primary pl-3 pt-2">
              <h4 className="text-sm font-semibold text-foreground">Power Parameters</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Output Active Power (kW)</Label>
                <Input
                  type="number"
                  value={form.output_active_power_kW}
                  onChange={(e) => setForm((p) => ({ ...p, output_active_power_kW: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Apparent Power (kVA)</Label>
                <Input
                  type="number"
                  value={form.output_apparent_power_kVA}
                  onChange={(e) => setForm((p) => ({ ...p, output_apparent_power_kVA: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Power Factor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.output_power_factor}
                  onChange={(e) => setForm((p) => ({ ...p, output_power_factor: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Frequency (Hz)</Label>
                <Input
                  type="number"
                  value={form.output_frequency_Hz}
                  onChange={(e) => setForm((p) => ({ ...p, output_frequency_Hz: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
            </div>

            <div className="border-l-4 border-primary pl-3 pt-2">
              <h4 className="text-sm font-semibold text-foreground">Harmonics (THD R/Y/B)</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Output Voltage THD R (%)</Label>
                <Input
                  type="number"
                  value={form.output_voltage_thd_R}
                  onChange={(e) => setForm((p) => ({ ...p, output_voltage_thd_R: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Voltage THD Y (%)</Label>
                <Input
                  type="number"
                  value={form.output_voltage_thd_Y}
                  onChange={(e) => setForm((p) => ({ ...p, output_voltage_thd_Y: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Output Voltage THD B (%)</Label>
                <Input
                  type="number"
                  value={form.output_voltage_thd_B}
                  onChange={(e) => setForm((p) => ({ ...p, output_voltage_thd_B: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "loading" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Working Hours / Day (Max 24)</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={form.working_hours_per_day}
                  onChange={(e) => setForm((p) => ({ ...p, working_hours_per_day: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Working Days / Year (Max 365)</Label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={form.working_days_per_year}
                  onChange={(e) => setForm((p) => ({ ...p, working_days_per_year: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Load Factor (0.0 to 1.0)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.load_factor}
                  onChange={(e) => setForm((p) => ({ ...p, load_factor: e.target.value }))}
                  className={editableInputClass}
                  placeholder="e.g. 0.5"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Auto Calculated Load & Energy Parameters</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Loading on kVA Basis (%)</Label>
                  <Input value={form.loading_kVA_percent} disabled className={autoInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label>Loading on kW Basis (%)</Label>
                  <Input value={form.loading_kW_percent} disabled className={autoInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label>Annual Input Energy (kWh/yr)</Label>
                  <Input value={form.annual_input_energy_kWh} disabled className={autoInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label>Annual Output Energy (kWh/yr)</Label>
                  <Input value={form.annual_output_energy_kWh} disabled className={autoInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label>Annual Energy Loss (kWh/yr)</Label>
                  <Input value={form.annual_energy_loss_kWh} disabled className={autoInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label>Annual CO₂ Emission (tCO₂/yr)</Label>
                  <Input value={form.annual_co2_emission_t} disabled className={autoInputClass} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "benchmarking" && (
          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-3">
              <h4 className="text-sm font-semibold text-foreground">Nameplate Efficiencies (%)</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Efficiency @ 100% Load</Label>
                <Input
                  type="number"
                  value={form.nameplate_efficiency_100_percent}
                  onChange={(e) => setForm((p) => ({ ...p, nameplate_efficiency_100_percent: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Efficiency @ 75% Load</Label>
                <Input
                  type="number"
                  value={form.nameplate_efficiency_75_percent}
                  onChange={(e) => setForm((p) => ({ ...p, nameplate_efficiency_75_percent: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Efficiency @ 50% Load</Label>
                <Input
                  type="number"
                  value={form.nameplate_efficiency_50_percent}
                  onChange={(e) => setForm((p) => ({ ...p, nameplate_efficiency_50_percent: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Efficiency @ 25% Load</Label>
                <Input
                  type="number"
                  value={form.nameplate_efficiency_25_percent}
                  onChange={(e) => setForm((p) => ({ ...p, nameplate_efficiency_25_percent: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Calculated Efficiency Benchmarks</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Measured Efficiency (%)</Label>
                  <Input value={form.measured_efficiency_percent} disabled className={autoInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label>Deviation from Rated Eff. (pp)</Label>
                  <Input value={form.efficiency_deviation_percentage_points} disabled className={autoInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label>Measured Losses (kW)</Label>
                  <Input value={form.measured_losses_kW} disabled className={autoInputClass} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "battery" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Battery Type</Label>
                <Input
                  value={form.battery_type}
                  onChange={(e) => setForm((p) => ({ ...p, battery_type: e.target.value }))}
                  className={editableInputClass}
                  placeholder="e.g. VRLA (Sealed)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>No. of Strings</Label>
                <Input
                  type="number"
                  value={form.battery_strings_count}
                  onChange={(e) => setForm((p) => ({ ...p, battery_strings_count: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cells per String</Label>
                <Input
                  type="number"
                  value={form.battery_cells_per_string}
                  onChange={(e) => setForm((p) => ({ ...p, battery_cells_per_string: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rated Battery Bank Voltage (V DC)</Label>
                <Input
                  type="number"
                  value={form.rated_battery_bank_voltage_V}
                  onChange={(e) => setForm((p) => ({ ...p, rated_battery_bank_voltage_V: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rated Ah Capacity (10-hr rate)</Label>
                <Input
                  type="number"
                  value={form.rated_ah_capacity}
                  onChange={(e) => setForm((p) => ({ ...p, rated_ah_capacity: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Float Charge Voltage (V DC)</Label>
                <Input
                  type="number"
                  value={form.float_charge_voltage_V}
                  onChange={(e) => setForm((p) => ({ ...p, float_charge_voltage_V: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Float Charge Current (A)</Label>
                <Input
                  type="number"
                  value={form.float_charge_current_A}
                  onChange={(e) => setForm((p) => ({ ...p, float_charge_current_A: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Battery Internal Resistance (mΩ)</Label>
                <Input
                  type="number"
                  value={form.battery_internal_resistance_mOhm}
                  onChange={(e) => setForm((p) => ({ ...p, battery_internal_resistance_mOhm: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Cell Voltages & Charging Calculations</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Cell Voltage Min (V)</Label>
                  <Input
                    type="number"
                    value={form.cell_voltage_min}
                    onChange={(e) => setForm((p) => ({ ...p, cell_voltage_min: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cell Voltage Max (V)</Label>
                  <Input
                    type="number"
                    value={form.cell_voltage_max}
                    onChange={(e) => setForm((p) => ({ ...p, cell_voltage_max: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cell Voltage Mean (V)</Label>
                  <Input
                    type="number"
                    value={form.cell_voltage_mean}
                    onChange={(e) => setForm((p) => ({ ...p, cell_voltage_mean: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Float Charge Power (W)</Label>
                  <Input value={form.float_charge_power_W} disabled className={autoInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cell Voltage Imbalance (V)</Label>
                  <Input value={form.cell_voltage_imbalance_V} disabled className={autoInputClass} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Temperatures & Backup Times</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>Ambient Temp (°C)</Label>
                  <Input
                    type="number"
                    value={form.battery_temp_ambient}
                    onChange={(e) => setForm((p) => ({ ...p, battery_temp_ambient: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hottest Cell Temp (°C)</Label>
                  <Input
                    type="number"
                    value={form.battery_temp_hottest_cell}
                    onChange={(e) => setForm((p) => ({ ...p, battery_temp_hottest_cell: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Actual Backup Time (min)</Label>
                  <Input
                    type="number"
                    value={form.actual_backup_time_min}
                    onChange={(e) => setForm((p) => ({ ...p, actual_backup_time_min: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rated Backup Time (min)</Label>
                  <Input
                    type="number"
                    value={form.rated_backup_time_full_load_min}
                    onChange={(e) => setForm((p) => ({ ...p, rated_backup_time_full_load_min: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Battery Age / Last Replace Yr</Label>
                  <Input
                    value={form.battery_age_years}
                    onChange={(e) => setForm((p) => ({ ...p, battery_age_years: e.target.value }))}
                    className={editableInputClass}
                    placeholder="e.g. 2021"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Battery Health Assessment</Label>
                  <Input
                    value={form.battery_health_assessment}
                    onChange={(e) => setForm((p) => ({ ...p, battery_health_assessment: e.target.value }))}
                    className={editableInputClass}
                    placeholder="e.g. Good"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "thermal" && (
          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-3">
              <h4 className="text-sm font-semibold text-foreground">Temperatures & Operational Conditions</h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Room Ambient Temp (°C)</Label>
                <Input
                  type="number"
                  value={form.ups_room_temp_C}
                  onChange={(e) => setForm((p) => ({ ...p, ups_room_temp_C: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Room Relative Humidity (%)</Label>
                <Input
                  type="number"
                  value={form.ups_room_humidity_percent}
                  onChange={(e) => setForm((p) => ({ ...p, ups_room_humidity_percent: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Enclosure Temp Front (°C)</Label>
                <Input
                  type="number"
                  value={form.ups_surface_temp_front_C}
                  onChange={(e) => setForm((p) => ({ ...p, ups_surface_temp_front_C: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Enclosure Temp Rear (°C)</Label>
                <Input
                  type="number"
                  value={form.ups_surface_temp_rear_C}
                  onChange={(e) => setForm((p) => ({ ...p, ups_surface_temp_rear_C: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hotspot Temp via IR Camera (°C)</Label>
                <Input
                  type="number"
                  value={form.hotspot_temperature_C}
                  onChange={(e) => setForm((p) => ({ ...p, hotspot_temperature_C: e.target.value }))}
                  className={editableInputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hotspot Location</Label>
                <Input
                  value={form.hotspot_location}
                  onChange={(e) => setForm((p) => ({ ...p, hotspot_location: e.target.value }))}
                  className={editableInputClass}
                  placeholder="e.g. Cable lug"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">UPS Control & Monitoring Options</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Cooling Fan Status</Label>
                  <Input
                    value={form.cooling_fan_status}
                    onChange={(e) => setForm((p) => ({ ...p, cooling_fan_status: e.target.value }))}
                    className={editableInputClass}
                    placeholder="e.g. OK"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>UPS Mode of Operation</Label>
                  <Input
                    value={form.operational_mode}
                    onChange={(e) => setForm((p) => ({ ...p, operational_mode: e.target.value }))}
                    className={editableInputClass}
                    placeholder="e.g. Online"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Transfer Time - Mains to Battery (ms)</Label>
                  <Input
                    type="number"
                    value={form.transfer_time_ms}
                    onChange={(e) => setForm((p) => ({ ...p, transfer_time_ms: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Odometer Operating Hours (hrs)</Label>
                  <Input
                    type="number"
                    value={form.operating_hours_total}
                    onChange={(e) => setForm((p) => ({ ...p, operating_hours_total: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last PM Date</Label>
                  <Input
                    value={form.last_preventive_maintenance_date}
                    onChange={(e) => setForm((p) => ({ ...p, last_preventive_maintenance_date: e.target.value }))}
                    className={editableInputClass}
                    placeholder="e.g. Mar-2026"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bypass Trips (Last 12 Months)</Label>
                  <Input
                    type="number"
                    value={form.bypass_trips_12m}
                    onChange={(e) => setForm((p) => ({ ...p, bypass_trips_12m: e.target.value }))}
                    className={editableInputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <Checkbox
                  checked={form.snmp_card_installed}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, snmp_card_installed: checked === true }))}
                />
                SNMP / Remote Monitoring Card Installed
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                <Checkbox
                  checked={form.input_submeter_installed}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, input_submeter_installed: checked === true }))}
                />
                Energy Sub-meter on UPS Input
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label>General Remarks / Observations</Label>
        <Textarea
          value={form.remarks}
          onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
          className={editableInputClass}
          placeholder="Enter audit details..."
        />
      </div>
    </div>
  );
}
