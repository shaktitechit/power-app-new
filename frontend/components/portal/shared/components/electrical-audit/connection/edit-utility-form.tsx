"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/portal/ui/dialog";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Button } from "@/components/portal/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { useUpdateUtilityAccountMutation } from "@/store/slices/electrical-audit/utilityApiSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import {
  DEFAULT_DATASHEET_INCLUSIONS,
  getDataSheetInclusionsFromAccount,
  type DataSheetInclusions,
  type DataSheetKey,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import { UtilityDataSheetFields } from "@/components/portal/shared/components/electrical-audit/connection/utility-data-sheet-fields";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";

interface EditUtilityAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  utilityAccount: UtilityAccount | null;
}

export function EditUtilityAccountForm({
  open,
  onOpenChange,
  onComplete,
  utilityAccount,
}: EditUtilityAccountFormProps) {
  const [updateUtilityAccount, { isLoading: updatingUtilityAccount }] =
    useUpdateUtilityAccountMutation();

  const [formData, setFormData] = useState({
    account_number: "",
    connection_type: "",
    category: "",
    location: "",
    sanctioned_demand_value: "",
    sanctioned_demand_unit: "kVA",
    provider: "",
    billing_cycle: "",
    is_transformer_maintained_by_facility: true,
  });

  const [dataSheetInclusions, setDataSheetInclusions] =
    useState<DataSheetInclusions>(DEFAULT_DATASHEET_INCLUSIONS);

  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!utilityAccount) return;

    setFormData({
      account_number: utilityAccount.account_number || "",
      connection_type: utilityAccount.connection_type || "",
      category: utilityAccount.category || "",
      location: utilityAccount.location || "",
      sanctioned_demand_value:
        utilityAccount.sanctioned_demand_value !== undefined &&
        utilityAccount.sanctioned_demand_value !== null
          ? String(utilityAccount.sanctioned_demand_value)
          : "",
      sanctioned_demand_unit: utilityAccount.sanctioned_demand_unit || "kVA",
      provider: utilityAccount.provider || "",
      billing_cycle: utilityAccount.billing_cycle || "",
      is_transformer_maintained_by_facility:
        utilityAccount.is_transformer_maintained_by_facility || false,
    });

    setDataSheetInclusions(getDataSheetInclusionsFromAccount(utilityAccount));
    setSubmitError("");
  }, [utilityAccount, open]);

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      account_number: "",
      connection_type: "",
      category: "",
      location: "",
      sanctioned_demand_value: "",
      sanctioned_demand_unit: "kVA",
      provider: "",
      billing_cycle: "",
      is_transformer_maintained_by_facility: true,
    });
    setDataSheetInclusions(DEFAULT_DATASHEET_INCLUSIONS);
    setSubmitError("");
  };

  const isFormValid = useMemo(() => {
    return (
      formData.account_number.trim().length > 0 &&
      formData.connection_type.trim().length > 0
    );
  }, [formData.account_number, formData.connection_type]);

  const handleSubmit = async () => {
    setSubmitError("");

    if (!utilityAccount?._id) {
      setSubmitError("Utility account not found.");
      return;
    }

    if (!isFormValid) {
      setSubmitError("Account number and connection type are required.");
      return;
    }

    await toastHandler({
      action: () =>
        updateUtilityAccount({
          id: utilityAccount._id,
          account_number: formData.account_number.trim(),
          connection_type: formData.connection_type as "LT" | "HT",
          category: formData.category.trim() || undefined,
          location: formData.location.trim() || undefined,
          sanctioned_demand_value: formData.sanctioned_demand_value
            ? Number(formData.sanctioned_demand_value)
            : undefined,
          sanctioned_demand_unit: formData.sanctioned_demand_unit as "kVA" | "kW" | "BHP",
          provider: formData.provider.trim() || undefined,
          billing_cycle: formData.billing_cycle || undefined,
          is_transformer_maintained_by_facility:
            formData.is_transformer_maintained_by_facility,
          data_sheet_inclusions: dataSheetInclusions,
        }).unwrap(),
      loading: "Updating utility account...",
      success: "Utility account updated successfully",
    });

    onComplete();
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Utility Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account_number">
                Account Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account_number"
                placeholder="Enter account number"
                value={formData.account_number}
                onChange={(e) => updateField("account_number", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Connection Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.connection_type}
                onValueChange={(value) => updateField("connection_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select connection type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LT">LT</SelectItem>
                  <SelectItem value="HT">HT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => updateField("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Institutional">Institutional</SelectItem>
                  <SelectItem value="Hospital">Hospital</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Enter location"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sanctioned_demand_value">
                Sanctioned Demand
              </Label>
              <div className="flex gap-2">
                <Input
                  id="sanctioned_demand_value"
                  type="number"
                  min="0"
                  placeholder="Enter value"
                  value={formData.sanctioned_demand_value}
                  onChange={(e) =>
                    updateField("sanctioned_demand_value", e.target.value)
                  }
                  className="flex-1"
                />
                <Select
                  value={formData.sanctioned_demand_unit}
                  onValueChange={(value) => updateField("sanctioned_demand_unit", value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kVA">kVA</SelectItem>
                    <SelectItem value="kW">kW</SelectItem>
                    <SelectItem value="BHP">BHP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                placeholder="e.g. PSPCL, DHBVN"
                value={formData.provider}
                onChange={(e) => updateField("provider", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select
                value={formData.billing_cycle}
                onValueChange={(val) => updateField("billing_cycle", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Billing cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="bi-monthly">Bi-Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <UtilityDataSheetFields
            values={dataSheetInclusions}
            onChange={(key: DataSheetKey, checked) =>
              setDataSheetInclusions((prev) => ({ ...prev, [key]: checked }))
            }
            is_transformer_maintained_by_facility={
              formData.is_transformer_maintained_by_facility
            }
            onTransformerMaintainedChange={(checked) =>
              updateField("is_transformer_maintained_by_facility", checked)
            }
          />

          {submitError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updatingUtilityAccount}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || updatingUtilityAccount}
          >
            {updatingUtilityAccount ? "Updating..." : "Update Utility Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
