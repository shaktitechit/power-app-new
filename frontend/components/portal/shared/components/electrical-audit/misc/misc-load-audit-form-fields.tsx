"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  autoInputClass,
  editableInputClass,
  type MiscLoadAuditFormState,
  updateMiscLoadAuditForm,
} from "./misc-load-audit-utils";

type Props = {
  form: MiscLoadAuditFormState;
  onFormChange: (updater: (prev: MiscLoadAuditFormState) => MiscLoadAuditFormState) => void;
};

export function MiscLoadAuditFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: MiscLoadAuditFormState) => MiscLoadAuditFormState) => {
    onFormChange((prev) => updateMiscLoadAuditForm(prev, updater));
  };

  return (
    <div className="space-y-8">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Equipment Name</Label>
                  <Input
                    value={form.equipment_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        equipment_name: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location / Department</Label>
                  <Input
                    value={form.location_department}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        location_department: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rated Power (kW)</Label>
                  <Input
                    type="number"
                    value={form.rated_power_kW}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        rated_power_kW: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Average Operating Hours / Day</Label>
                  <Input
                    type="number"
                    value={form.average_operating_hours_per_day}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        average_operating_hours_per_day: e.target.value,
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
                  <Label>Load Factor (%)</Label>
                  <Input
                    type="number"
                    value={form.load_factor_percent}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        load_factor_percent: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estimated Annual Energy (kWh)</Label>
                  <Input
                    value={form.estimated_annual_energy_kWh}
                    disabled
                    className={autoInputClass}
                  />
                </div>
              </div>
    </div>
  );
}
