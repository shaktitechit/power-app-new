"use client";

/** New utility account for safety audit facilities — omits billing cycle and connected-systems flags. */

import { useMemo, useState } from "react";
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
import { useCreateUtilityAccountMutation } from "@/store/slices/electrical-audit/utilityApiSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import {
  DEFAULT_SAFETY_DATASHEET_INCLUSIONS,
  type DataSheetInclusions,
  type DataSheetKey,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import { SafetyUtilityDataSheetFields } from "./safety-utility-data-sheet-fields";

export interface CreateSafetyAuditUtilityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  facilityId: string;
}

export function CreateSafetyAuditUtilityForm({
  open,
  onOpenChange,
  onComplete,
  facilityId,
}: CreateSafetyAuditUtilityFormProps) {
  const [createUtilityAccount, { isLoading: creatingUtilityAccount }] =
    useCreateUtilityAccountMutation();

  const [formData, setFormData] = useState({
    account_number: "",
    connection_type: "",
    category: "",
    location: "",
    sanctioned_demand_value: "",
    sanctioned_demand_unit: "kVA",
    provider: "",
  });

  const [dataSheetInclusions, setDataSheetInclusions] =
    useState<DataSheetInclusions>(DEFAULT_SAFETY_DATASHEET_INCLUSIONS);
  const [submitError, setSubmitError] = useState("");

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

    if (!isFormValid) {
      setSubmitError("Account number and connection type are required.");
      return;
    }

    await toastHandler({
      action: () =>
        createUtilityAccount({
          facility_id: facilityId,
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
      loading: "Creating utility account...",
      success: "Utility account created successfully",
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
          <DialogTitle>Add Utility Account (Safety Audit)</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="safety-ua-account_number">
                Account Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="safety-ua-account_number"
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
                <SelectTrigger id="safety-ua-connection_type">
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
                <SelectTrigger id="safety-ua-category">
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
              <Label htmlFor="safety-ua-location">Location</Label>
              <Input
                id="safety-ua-location"
                placeholder="Enter location"
                value={formData.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="safety-ua-sanctioned_demand_value">
                Sanctioned Demand
              </Label>
              <div className="flex gap-2">
                <Input
                  id="safety-ua-sanctioned_demand_value"
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
              <Label htmlFor="safety-ua-provider">Provider</Label>
              <Input
                id="safety-ua-provider"
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
            disabled={creatingUtilityAccount}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || creatingUtilityAccount}
          >
            {creatingUtilityAccount ? "Creating..." : "Create Utility Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
