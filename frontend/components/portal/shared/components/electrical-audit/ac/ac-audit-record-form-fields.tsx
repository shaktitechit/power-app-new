"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  autoInputClass,
  editableInputClass,
  type ACAuditFormState,
  updateACAuditForm,
} from "./ac-audit-record-utils";

type Props = {
  form: ACAuditFormState;
  onFormChange: (updater: (prev: ACAuditFormState) => ACAuditFormState) => void;
};

function AutoInput({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} disabled className={autoInputClass} />
    </div>
  );
}

export function ACAuditRecordFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: ACAuditFormState) => ACAuditFormState) => {
    onFormChange((prev) => updateACAuditForm(prev, updater));
  };

  return (
    <div className="space-y-8">
              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Basic Details
                </h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Unit ID</Label>
                    <Input
                      value={form.unit_id}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          unit_id: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Building / Block</Label>
                    <Input
                      value={form.building_block}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          building_block: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Area / Location</Label>
                    <Input
                      value={form.area_location}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          area_location: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>AC Type</Label>
                    <select
                      value={form.ac_type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          ac_type: e.target
                            .value as ACAuditFormState["ac_type"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select AC Type</option>
                      <option value="window">Window</option>
                      <option value="split">Split</option>
                      <option value="ductable">Ductable</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Make</Label>
                    <Input
                      value={form.make}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          make: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={form.model}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          model: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cooling Capacity (TR)</Label>
                    <Input
                      type="number"
                      value={form.cooling_capacity_TR}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cooling_capacity_TR: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rated Input Power (kW)</Label>
                    <Input
                      type="number"
                      value={form.rated_input_power_kW}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          rated_input_power_kW: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>BEE Star Rating</Label>
                    <Input
                      type="number"
                      value={form.bee_star_rating}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          bee_star_rating: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Refrigerant</Label>
                    <Input
                      value={form.refrigerant}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          refrigerant: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Year of Installation</Label>
                    <Input
                      type="number"
                      value={form.year_of_installation}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          year_of_installation: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Control Type</Label>
                    <select
                      value={form.control_type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          control_type: e.target
                            .value as ACAuditFormState["control_type"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select Control</option>
                      <option value="manual">Manual</option>
                      <option value="thermostat">Thermostat</option>
                      <option value="bms">BMS</option>
                      <option value="timer">Timer</option>
                      <option value="inverter">Inverter</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity (Nos)</Label>
                    <Input
                      type="number"
                      value={form.quantity_nos}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          quantity_nos: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Running Status</Label>
                    <select
                      value={form.running_status}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          running_status: e.target
                            .value as ACAuditFormState["running_status"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select Status</option>
                      <option value="running">Running</option>
                      <option value="not_running">Not Running</option>
                      <option value="standby">Standby</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <select
                      value={form.condition}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          condition: e.target
                            .value as ACAuditFormState["condition"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select Condition</option>
                      <option value="good">Good</option>
                      <option value="average">Average</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Audit Date</Label>
                    <Input
                      type="date"
                      value={form.audit_date}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          audit_date: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={form.remarks}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        remarks: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Measurement Section
                </h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Voltage (V)</Label>
                    <Input
                      type="number"
                      value={form.voltage_V}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          voltage_V: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Current (A)</Label>
                    <Input
                      type="number"
                      value={form.current_A}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          current_A: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Power Factor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={form.power_factor}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          power_factor: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Measured Power (kW)</Label>
                    <Input
                      type="number"
                      value={form.measured_power_kW}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          measured_power_kW: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Return Air Temp (°C)</Label>
                    <Input
                      type="number"
                      value={form.return_air_temp_C}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          return_air_temp_C: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Supply Air Temp (°C)</Label>
                    <Input
                      type="number"
                      value={form.supply_air_temp_C}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          supply_air_temp_C: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ambient Temp (°C)</Label>
                    <Input
                      type="number"
                      value={form.ambient_temp_C}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          ambient_temp_C: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Thermostat Set Temp (°C)</Label>
                    <Input
                      type="number"
                      value={form.thermostat_set_temp_C}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          thermostat_set_temp_C: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Operating Hrs / Day</Label>
                    <Input
                      type="number"
                      value={form.operating_hours_per_day}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          operating_hours_per_day: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Operating Days / Year</Label>
                    <Input
                      type="number"
                      value={form.operating_days_per_year}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          operating_days_per_year: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Compressor / Fan Cycling</Label>
                    <select
                      value={form.compressor_fan_cycling}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          compressor_fan_cycling: e.target
                            .value as ACAuditFormState["compressor_fan_cycling"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select</option>
                      <option value="normal">Normal</option>
                      <option value="frequent">Frequent</option>
                      <option value="continuous">Continuous</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Filter / Evaporator Condition</Label>
                    <select
                      value={form.filter_evaporator_condition}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          filter_evaporator_condition: e.target
                            .value as ACAuditFormState["filter_evaporator_condition"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select</option>
                      <option value="clean">Clean</option>
                      <option value="moderate">Moderate</option>
                      <option value="dirty">Dirty</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Condenser Condition</Label>
                    <select
                      value={form.condenser_condition}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          condenser_condition: e.target
                            .value as ACAuditFormState["condenser_condition"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select</option>
                      <option value="clean">Clean</option>
                      <option value="moderate">Moderate</option>
                      <option value="dirty">Dirty</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Airflow / Noise / Leakage Observation</Label>
                    <Textarea
                      value={form.airflow_noise_leakage}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          airflow_noise_leakage: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Measurement Remarks</Label>
                    <Textarea
                      value={form.measurement_remarks}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          measurement_remarks: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Calculation Section (Auto Formula Based)
                </h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <AutoInput label="Air-side ΔT (°C)" value={form.airside_delta_T} />
                  <AutoInput label="Loading Factor (%)" value={form.loading_factor_percent} />
                  <AutoInput label="Connected Load (kW)" value={form.connected_load_kW} />
                  <AutoInput label="Annual Energy Consumption (kWh)" value={form.annual_energy_consumption_kWh} />
                  <AutoInput label="Specific Power (kW/TR)" value={form.specific_power_kW_per_TR} />
                  <AutoInput label="Age (Years)" value={form.age_years} />
                  <AutoInput label="O&M Flag" value={form.om_flag} />
                  <AutoInput label="Replacement Flag" value={form.replacement_flag} />
                  <AutoInput label="Control Flag" value={form.control_flag} />
                  <AutoInput label="Overall ECM Suggestion" value={form.overall_ecm_suggestion} />
                  <AutoInput label="Priority" value={form.priority} />
                  <AutoInput label="Indicative Basis" value={form.indicative_basis} />
                </div>
              </div>
    </div>
  );
}
