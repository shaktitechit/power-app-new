"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  autoInputClass,
  editableInputClass,
  type LightingAuditFormState,
  updateLightingAuditForm,
} from "./lighting-audit-utils";

type Props = {
  form: LightingAuditFormState;
  onFormChange: (updater: (prev: LightingAuditFormState) => LightingAuditFormState) => void;
};

export function LightingAuditFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: LightingAuditFormState) => LightingAuditFormState) => {
    onFormChange((prev) => updateLightingAuditForm(prev, updater));
  };

  return (
    <div className="space-y-8">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <Label>Fixture Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.fixture_type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        fixture_type: e.target
                          .value as LightingAuditFormState["fixture_type"],
                      }))
                    }
                  >
                    <option value="">Select fixture type</option>
                    <option value="tube_light">Tube Light</option>
                    <option value="bulb">Bulb</option>
                    <option value="led_panel">LED Panel</option>
                    <option value="flood_light">Flood Light</option>
                    <option value="street_light">Street Light</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Lamp Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.lamp_type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        lamp_type: e.target
                          .value as LightingAuditFormState["lamp_type"],
                      }))
                    }
                  >
                    <option value="">Select lamp type</option>
                    <option value="LED">LED</option>
                    <option value="CFL">CFL</option>
                    <option value="fluorescent">Fluorescent</option>
                    <option value="halogen">Halogen</option>
                    <option value="incandescent">Incandescent</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Control Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.control_type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        control_type: e.target
                          .value as LightingAuditFormState["control_type"],
                      }))
                    }
                  >
                    <option value="">Select control type</option>
                    <option value="manual">Manual</option>
                    <option value="sensor">Sensor</option>
                    <option value="timer">Timer</option>
                    <option value="bms">BMS</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Wattage (W)</Label>
                  <Input
                    type="number"
                    value={form.wattage_W}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        wattage_W: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
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
                  <Label>Working Hours / Day</Label>
                  <Input
                    type="number"
                    value={form.working_hours_per_day}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        working_hours_per_day: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Working Days / Year</Label>
                  <Input
                    type="number"
                    value={form.working_days_per_year}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        working_days_per_year: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Connected Load (kW)</Label>
                  <Input
                    value={form.connected_load_kW}
                    disabled
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Annual Energy (kWh)</Label>
                  <Input
                    value={form.annual_energy_kWh}
                    disabled
                    className={editableInputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
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
  );
}
