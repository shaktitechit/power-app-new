"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import {
  editableInputClass,
  type DGSetFormState,
  updateDGSetForm,
} from "./dg-set-utils";

import { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/portal/ui/dialog";

type Props = {
  form: DGSetFormState;
  onFormChange: (updater: (prev: DGSetFormState) => DGSetFormState) => void;
};

/** Reusable info icon + modal for field-level instructions. */
function FieldInfo({ title, message }: { title: string; message: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-1 inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
        title={`Info: ${title}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed whitespace-pre-line">
              {message}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DGSetFormFields({ form, onFormChange }: Props) {
  const setForm = (updater: (prev: DGSetFormState) => DGSetFormState) => {
    onFormChange((prev) => updateDGSetForm(prev, updater));
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label className="flex items-center">
          DG Number *
          <FieldInfo
            title="DG Number"
            message="Select Number / Id of the DG set."
          />
        </Label>
        <Input
          value={form.dg_number}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, dg_number: e.target.value }))
          }
          placeholder="Enter DG number"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center">
          Make / Model
          <FieldInfo
            title="Make & Model"
            message="Add make and model for Name plate data or from official record."
          />
        </Label>
        <Input
          value={form.make_model}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, make_model: e.target.value }))
          }
          placeholder="Enter make or model"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center">
          Year of Installation
          <FieldInfo
            title="Year of Installation"
            message="Mention Year of installation."
          />
        </Label>
        <Input
          type="number"
          value={form.year_of_installation}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              year_of_installation: e.target.value,
            }))
          }
          placeholder="e.g. 2022"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center">
          Rated Capacity (kVA)
          <FieldInfo
            title="Rated Capacity (kVA)"
            message="Mention rated kVA."
          />
        </Label>
        <Input
          type="number"
          value={form.rated_capacity_kVA}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              rated_capacity_kVA: e.target.value,
            }))
          }
          placeholder="Enter capacity"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center">
          Rated Active Power (kW)
          <FieldInfo
            title="Rated Active Power (kW)"
            message="Mention rated kW."
          />
        </Label>
        <Input
          type="number"
          value={form.rated_active_power_kW}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              rated_active_power_kW: e.target.value,
            }))
          }
          placeholder="Enter active power"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center">
          Rated Voltage (V)
          <FieldInfo
            title="Rated Voltage (V)"
            message="Mention rated Voltage in V."
          />
        </Label>
        <Input
          type="number"
          value={form.rated_voltage_V}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rated_voltage_V: e.target.value }))
          }
          placeholder="Enter voltage"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center">
          Rated Speed (RPM)
          <FieldInfo
            title="Rated Speed (RPM)"
            message="Mention rated RPM."
          />
        </Label>
        <Input
          type="number"
          value={form.rated_speed_RPM}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, rated_speed_RPM: e.target.value }))
          }
          placeholder="Enter speed"
          className={editableInputClass}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center">
          Fuel Type
          <FieldInfo
            title="Fuel Type"
            message="Select type of fuel used HSD or LDO."
          />
        </Label>
        <select
          value={form.fuel_type}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              fuel_type: e.target.value as "diesel" | "gas" | "dual",
            }))
          }
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="diesel">Diesel</option>
          <option value="gas">Gas</option>
          <option value="dual">Dual</option>
        </select>
      </div>
    </div>
  );
}
