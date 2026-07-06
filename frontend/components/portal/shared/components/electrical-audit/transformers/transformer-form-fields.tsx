"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import {
  editableInputClass,
  type TransformerFormState,
  updateTransformerForm,
} from "./transformer-utils";

type Props = {
  form: TransformerFormState;
  onFormChange: (updater: (prev: TransformerFormState) => TransformerFormState) => void;
};

export function TransformerFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: TransformerFormState) => TransformerFormState) => {
    onFormChange((prev) => updateTransformerForm(prev, updater));
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Transformer Tag *</Label>
        <Input
          value={form.transformer_tag}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, transformer_tag: e.target.value }))
          }
          placeholder="Enter transformer tag"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Rated Capacity (kVA)</Label>
        <Input
          type="number"
          value={form.rated_capacity_kVA}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rated_capacity_kVA: e.target.value }))
          }
          placeholder="Enter capacity"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Type of Cooling</Label>
        <select
          value={form.type_of_cooling}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              type_of_cooling: e.target.value as "ONAN" | "ONAF" | "OFWF" | "ODAF" | "dry",
            }))
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="ONAN">ONAN</option>
          <option value="ONAF">ONAF</option>
          <option value="OFWF">OFWF</option>
          <option value="ODAF">ODAF</option>
          <option value="dry">Dry</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Rated HV (kV)</Label>
        <Input
          type="number"
          step="0.01"
          value={form.rated_HV_kV}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rated_HV_kV: e.target.value }))
          }
          placeholder="Enter HV voltage"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Rated LV (V)</Label>
        <Input
          type="number"
          value={form.rated_LV_V}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rated_LV_V: e.target.value }))
          }
          placeholder="Enter LV voltage"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Rated HV Current (A)</Label>
        <Input
          type="number"
          step="0.01"
          value={form.rated_HV_current_A}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rated_HV_current_A: e.target.value }))
          }
          placeholder="Enter HV current"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Rated LV Current (A)</Label>
        <Input
          type="number"
          step="0.01"
          value={form.rated_LV_current_A}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rated_LV_current_A: e.target.value }))
          }
          placeholder="Enter LV current"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>No Load Loss (kW)</Label>
        <Input
          type="number"
          step="0.01"
          value={form.no_load_loss_kW}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, no_load_loss_kW: e.target.value }))
          }
          placeholder="Enter no load loss"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Full Load Loss (kW)</Label>
        <Input
          type="number"
          step="0.01"
          value={form.full_load_loss_kW}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, full_load_loss_kW: e.target.value }))
          }
          placeholder="Enter full load loss"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label>Nameplate Efficiency (%)</Label>
        <Input
          type="number"
          step="0.01"
          value={form.nameplate_efficiency_percent}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, nameplate_efficiency_percent: e.target.value }))
          }
          placeholder="Enter efficiency"
          className={editableInputClass}
        />
      </div>
    </div>
  );
}
