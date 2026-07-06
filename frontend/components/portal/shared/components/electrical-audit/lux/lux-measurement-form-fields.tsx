"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  autoInputClass,
  editableInputClass,
  type LuxMeasurementFormState,
  updateLuxMeasurementForm,
} from "./lux-measurement-utils";

type Props = {
  form: LuxMeasurementFormState;
  onFormChange: (updater: (prev: LuxMeasurementFormState) => LuxMeasurementFormState) => void;
};

export function LuxMeasurementFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: LuxMeasurementFormState) => LuxMeasurementFormState) => {
    onFormChange((prev) => updateLuxMeasurementForm(prev, updater));
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
                  <Label>Room Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.room_type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        room_type: e.target
                          .value as LuxMeasurementFormState["room_type"],
                      }))
                    }
                  >
                    <option value="">Select room type</option>
                    <option value="office">Office</option>
                    <option value="corridor">Corridor</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="hospital">Hospital</option>
                    <option value="classroom">Classroom</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Required Lux</Label>
                  <Input
                    type="number"
                    value={form.required_lux}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        required_lux: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Measured Lux Point 1</Label>
                  <Input
                    type="number"
                    value={form.measured_lux_point_1}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        measured_lux_point_1: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Measured Lux Point 2</Label>
                  <Input
                    type="number"
                    value={form.measured_lux_point_2}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        measured_lux_point_2: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Measured Lux Point 3</Label>
                  <Input
                    type="number"
                    value={form.measured_lux_point_3}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        measured_lux_point_3: e.target.value,
                      }))
                    }
                    className={editableInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Average Lux</Label>
                  <Input
                    value={form.average_lux}
                    disabled
                    className={autoInputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Compliance</Label>
                  <Input
                    value={
                      form.compliance === undefined
                        ? ""
                        : form.compliance
                          ? "Compliant"
                          : "Non-compliant"
                    }
                    disabled
                    className={autoInputClass}
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
