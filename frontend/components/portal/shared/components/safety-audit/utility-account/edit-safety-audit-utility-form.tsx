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
  DEFAULT_SAFETY_DATASHEET_INCLUSIONS,
  getDataSheetInclusionsFromAccount,
  type DataSheetInclusions,
  type DataSheetKey,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import { SafetyUtilityDataSheetFields } from "./safety-utility-data-sheet-fields";

interface SafetyAuditUtilityAccount {
  _id: string;
  facility_id?: string;
  account_number: string;
  connection_type: "LT" | "HT";
  category?: string;
  location?: string;
  sanctioned_demand_value?: number;
  sanctioned_demand_unit?: string;
  provider?: string;
  dataSheet?: any;
}

export interface EditSafetyAuditUtilityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  utilityAccount: SafetyAuditUtilityAccount | null;
}

export function EditSafetyAuditUtilityForm({
  open,
  onOpenChange,
  onComplete,
  utilityAccount,
}: EditSafetyAuditUtilityFormProps) {
  const [updateUtilityAccount, { isLoading: updatingUtilityAccount }] =
    useUpdateUtilityAccountMutation();

  const [dataSheetInclusions, setDataSheetInclusions] =
    useState<DataSheetInclusions>(DEFAULT_SAFETY_DATASHEET_INCLUSIONS);

  const [formData, setFormData] = useState({
    account_number: "",
    connection_type: "",
    category: "",
    location: "",
    sanctioned_demand_value: "",
    sanctioned_demand_unit: "kVA",
    provider: "",
  });

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
      provider: utilityAccount.provider || "",
      sanctioned_demand_unit: utilityAccount.sanctioned_demand_unit || "kVA",
    });

    if (utilityAccount.dataSheet) {
      setDataSheetInclusions(getDataSheetInclusionsFromAccount(utilityAccount));
    } else {
      setDataSheetInclusions(DEFAULT_SAFETY_DATASHEET_INCLUSIONS);
    }

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
    });

    setDataSheetInclusions(DEFAULT_SAFETY_DATASHEET_INCLUSIONS);
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
          <DialogTitle>Edit Utility Account (Safety Audit)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="safety-edit-ua-account_number">
                Account Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="safety-edit-ua-account_number"
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
                <SelectTrigger id="safety-edit-ua-connection_type">
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
                <SelectTrigger id="safety-edit-ua-category">
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
              <Label htmlFor="safety-edit-ua-location">Location</Label>
              <Input
                id="safety-edit-ua-location"
                placeholder="Enter location"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="safety-edit-ua-sanctioned_demand_value">
                Sanctioned Demand
              </Label>
              <div className="flex gap-2">
                <Input
                  id="safety-edit-ua-sanctioned_demand_value"
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
              <Label htmlFor="safety-edit-ua-provider">Provider</Label>
              <Input
                id="safety-edit-ua-provider"
                placeholder="e.g. PSPCL, DHBVN"
                value={formData.provider}
                onChange={(e) => updateField("provider", e.target.value)}
              />
            </div>
          </div>

          <SafetyUtilityDataSheetFields
            values={dataSheetInclusions}
            onChange={(key, checked) =>
              setDataSheetInclusions((prev) => ({ ...prev, [key]: checked }))
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
