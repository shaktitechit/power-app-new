"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  autoInputClass,
  editableInputClass,
  type FanAuditFormState,
  updateFanAuditForm,
} from "./fan-audit-record-utils";

function AutoInput({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} disabled className={autoInputClass} />
    </div>
  );
}

type Props = {
  form: FanAuditFormState;
  onFormChange: (updater: (prev: FanAuditFormState) => FanAuditFormState) => void;
};

export function FanAuditRecordFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: FanAuditFormState) => FanAuditFormState) => {
    onFormChange((prev) => updateFanAuditForm(prev, updater));
  };

  return (
    <div className="space-y-8">
                          <div className="rounded-xl border p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Fan Details
                </h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <Label>Fan Type</Label>
                    <select
                      value={form.fan_type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          fan_type: e.target
                            .value as FanAuditFormState["fan_type"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select Fan Type</option>
                      <option value="ceiling">Ceiling</option>
                      <option value="exhaust">Exhaust</option>
                      <option value="pedestal">Pedestal</option>
                      <option value="wall">Wall</option>
                      <option value="industrial">Industrial</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Make & Model</Label>
                    <Input
                      value={form.make_model}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          make_model: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rated Power (W)</Label>
                    <Input
                      type="number"
                      value={form.rated_power_W}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          rated_power_W: e.target.value,
                        }))
                      }
                      className={editableInputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Measured Power (W)</Label>
                    <Input
                      type="number"
                      value={form.measured_power_W}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          measured_power_W: e.target.value,
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
                    <Label>Speed Control Type</Label>
                    <select
                      value={form.speed_control_type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          speed_control_type: e.target
                            .value as FanAuditFormState["speed_control_type"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select Speed Control</option>
                      <option value="regulator">Regulator</option>
                      <option value="electronic">Electronic</option>
                      <option value="vfd">VFD</option>
                      <option value="none">None</option>
                    </select>
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
                    <Label>Condition</Label>
                    <select
                      value={form.condition}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          condition: e.target
                            .value as FanAuditFormState["condition"],
                        }))
                      }
                      className={`flex h-10 w-full rounded-md px-3 py-2 text-sm ${editableInputClass}`}
                    >
                      <option value="">Select Condition</option>
                      <option value="good">Good</option>
                      <option value="old">Old</option>
                      <option value="inefficient">Inefficient</option>
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

              <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
                <h4 className="mb-4 text-base font-semibold text-foreground">
                  Calculation Section (Auto Formula Based)
                </h4>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <AutoInput label="Loading Factor (%)" value={form.loading_factor_percent} />
                  <AutoInput label="Connected Load (kW)" value={form.connected_load_kW} />
                  <AutoInput label="Annual Energy Consumption (kWh)" value={form.annual_energy_consumption_kWh} />
                </div>
              </div>
    </div>
  );
}
