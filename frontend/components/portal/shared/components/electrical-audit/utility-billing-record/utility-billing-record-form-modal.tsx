"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Save, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useParseUtilityBillMutation } from "@/store/slices/openRouterApiSlice";
import {
  autoInputClass,
  editableInputClass,
  type BillingFormState,
} from "./utility-billing-record-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: BillingFormState | null;
  onFieldChange: (key: keyof BillingFormState, value: string) => void;
  onSave: () => void;
  saving?: boolean;
};

export function UtilityBillingRecordFormModal({
  open,
  onOpenChange,
  form,
  onFieldChange,
  onSave,
  saving = false,
}: Props) {
  const [parseUtilityBill, { isLoading: parsing }] = useParseUtilityBillMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiAutofillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Only image files or PDFs are supported.");
      return;
    }

    const formData = new FormData();
    formData.append("documents", file);

    const parsePromise = parseUtilityBill(formData).unwrap();

    toast.promise(parsePromise, {
      loading: "AI is analyzing your bill...",
      success: (data) => {
        if (!data || Object.keys(data).length === 0) {
          return "No readable electricity bill data was detected. Try another file.";
        }

        let filledCount = 0;
        Object.entries(data).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            onFieldChange(key as keyof BillingFormState, String(val));
            filledCount++;
          }
        });

        return filledCount > 0
          ? `Autofilled ${filledCount} fields from the bill!`
          : "No billing fields could be extracted from this document.";
      },
      error: (err) => {
        return `Autofill failed: ${err?.data?.message || err?.message || "Internal error"}`;
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="flex flex-row items-center justify-between pr-8 space-y-0">
          <DialogTitle>
            {form.isNew ? "Add Billing Record" : "Edit Billing Record"}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleAiAutofillUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing || saving}
              className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 h-8 font-medium text-xs rounded-lg transition-all"
            >
              <Sparkles className={`h-3.5 w-3.5 ${parsing ? "animate-pulse text-primary" : ""}`} />
              {parsing ? "Processing..." : "AI Autofill from Bill"}
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-2">
          <div className="space-y-2">
            <Label>Billing Period Start</Label>
            <Input
              type="date"
              value={form.billing_period_start}
              onChange={(e) =>
                onFieldChange("billing_period_start", e.target.value)
              }
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Billing Period End</Label>
            <Input
              type="date"
              value={form.billing_period_end}
              onChange={(e) =>
                onFieldChange("billing_period_end", e.target.value)
              }
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Billing Days (Auto)</Label>
            <Input
              type="number"
              value={form.billing_days}
              disabled
              className={autoInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Bill No</Label>
            <Input
              value={form.bill_no}
              onChange={(e) => onFieldChange("bill_no", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>MDI (kVA)</Label>
            <Input
              type="number"
              value={form.mdi_kVA}
              onChange={(e) => onFieldChange("mdi_kVA", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Units (kWh)</Label>
            <Input
              type="number"
              value={form.units_kWh}
              onChange={(e) => onFieldChange("units_kWh", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Units (kVAh)</Label>
            <Input
              type="number"
              value={form.units_kVAh}
              onChange={(e) => onFieldChange("units_kVAh", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>PF (Auto = kWh / kVAh)</Label>
            <Input type="number" step="0.001" value={form.pf} disabled className={autoInputClass} />
          </div>

          <div className="space-y-2">
            <Label>Fixed Charges (Min. Charges) (₹)</Label>
            <Input
              type="number"
              value={form.fixed_charges_rs}
              onChange={(e) => onFieldChange("fixed_charges_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Demand Charges (₹)</Label>
            <Input
              type="number"
              value={form.demand_charges_rs}
              onChange={(e) => onFieldChange("demand_charges_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Energy Charges (₹)</Label>
            <Input
              type="number"
              value={form.energy_charges_rs}
              onChange={(e) => onFieldChange("energy_charges_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Taxes and Rent (Duty) (₹)</Label>
            <Input
              type="number"
              value={form.taxes_and_rent_rs}
              onChange={(e) => onFieldChange("taxes_and_rent_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Other Charges (₹)</Label>
            <Input
              type="number"
              value={form.other_charges_rs}
              onChange={(e) => onFieldChange("other_charges_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="col-span-3 space-y-2">
            <Label>Other Charges Remark</Label>
            <Input
              value={form.other_charges_remark}
              onChange={(e) =>
                onFieldChange("other_charges_remark", e.target.value)
              }
              className={editableInputClass}
              placeholder="Enter other charges remark"
            />
          </div>

          <div className="space-y-2">
            <Label>Penalty (₹)</Label>
            <Input
              type="number"
              value={form.penalty_rs}
              onChange={(e) => onFieldChange("penalty_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Rebate / Subsidy (₹)</Label>
            <Input
              type="number"
              value={form.rebate_subsidy_rs}
              onChange={(e) => onFieldChange("rebate_subsidy_rs", e.target.value)}
              className={editableInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Monthly Electricity Bill (Auto)</Label>
            <Input
              type="number"
              value={form.monthly_electricity_bill_rs}
              disabled
              className={autoInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Unit Consumption / Day (Auto)</Label>
            <Input
              type="number"
              value={form.unit_consumption_per_day_kVAh}
              disabled
              className={autoInputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Average Per Unit Cost (Auto)</Label>
            <Input
              type="number"
              value={form.average_per_unit_cost_rs}
              disabled
              className={autoInputClass}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : form.isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
