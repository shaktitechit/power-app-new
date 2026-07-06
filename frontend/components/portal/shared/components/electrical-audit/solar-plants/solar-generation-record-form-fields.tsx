"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import {
  getInputClass,
  type SolarGenerationFormState,
  updateSolarGenerationForm,
} from "./solar-generation-record-utils";

type Props = {
  form: SolarGenerationFormState;
  onFormChange: (
    updater: (prev: SolarGenerationFormState) => SolarGenerationFormState,
  ) => void;
};

export function SolarGenerationRecordFormFields({ form, onFormChange }: Props) {
  const setForm = (
    updater: (prev: SolarGenerationFormState) => SolarGenerationFormState,
  ) => {
    onFormChange((prev) => updateSolarGenerationForm(prev, updater));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-muted/20 p-4">
        <h4 className="mb-4 text-base font-semibold text-foreground">
          Billing Information
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Billing Period Start</Label>
            <Input
              type="date"
              value={form.billing_period_start}
              disabled
              className={getInputClass(true)}
            />
          </div>
          <div className="space-y-2">
            <Label>Billing Period End</Label>
            <Input
              type="date"
              value={form.billing_period_end}
              disabled
              className={getInputClass(true)}
            />
          </div>
          <div className="space-y-2">
            <Label>Billing Days</Label>
            <Input
              type="number"
              value={form.billing_days}
              disabled
              className={getInputClass(true)}
            />
          </div>
          <div className="space-y-2">
            <Label>Bill No</Label>
            <Input value={form.bill_no} disabled className={getInputClass(true)} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h4 className="mb-4 text-base font-semibold text-foreground">
          Import (Grid Consumption)
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(
            [
              ["import_kWh", "Import kWh"],
              ["import_kVAh", "Import kVAh"],
              ["import_kVA", "Import kVA"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="number"
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className={getInputClass(false)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h4 className="mb-4 text-base font-semibold text-foreground">
          Export (Solar Sent to Grid)
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(
            [
              ["export_kWh", "Export kWh"],
              ["export_kVAh", "Export kVAh"],
              ["export_kVA", "Export kVA"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="number"
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className={getInputClass(false)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <h4 className="mb-4 text-base font-semibold text-foreground">
          Net Values
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(
            [
              ["net_kWh", "Net kWh"],
              ["net_kVAh", "Net kVAh"],
              ["net_kVA", "Net kVA"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="number"
                value={form[key]}
                disabled
                className={getInputClass(true)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h4 className="mb-4 text-base font-semibold text-foreground">
          Solar Generation
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(
            [
              ["solar_generation_kWh", "Solar Generation kWh"],
              ["solar_generation_kVAh", "Solar Generation kVAh"],
              ["solar_generation_kVA", "Solar Generation kVA"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="number"
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className={getInputClass(false)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
