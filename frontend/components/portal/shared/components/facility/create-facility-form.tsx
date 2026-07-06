"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  Search,
} from "lucide-react";

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

import { useAssignableUsersQuery } from "@/store/slices/userApiSlice";
import type { Enquiry } from "@/store/slices/enquiryApiSlice";
import {
  useCreateFacilityMutation,
  useCreateFacilityFromEnquiryMutation,
} from "@/store/slices/facilityApiSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import { AUDIT_TYPE_OPTIONS } from "@/components/portal/lib/facilityConstants";

interface CreateFacilityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  /**
   * Submitted (won) enquiry: opens the same UI prefilled and POSTs to
   * `/v1/enquiries/:id/facility` (super_admin only on the server).
   */
  fromEnquiry?: Enquiry | null;
}

// FacilityDocument type removed (document upload omitted)

type AssignableUser = {
  _id: string;
  name: string;
  email: string;
  role?: string;
};

type ClientRepresentative = {
  name: string;
  contact_number: string;
  email: string;
};

/** `YYYY-MM-DD` for `<input type="date" />` using local calendar date */
function getTodayLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function TeamMemberMultiSelect({
  users,
  selectedIds,
  onChange,
  disabled = false,
}: {
  users: AssignableUser[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const toggleMember = (userId: string) => {
    if (disabled) return;

    const exists = selectedIds.includes(userId);

    if (exists) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const selectedUsers = users.filter((user) =>
    selectedIds.includes(user._id),
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const nameMatch = user.name?.toLowerCase().includes(query) ?? false;
      const emailMatch = user.email?.toLowerCase().includes(query) ?? false;
      const roleMatch = user.role?.toLowerCase().includes(query) ?? false;
      return nameMatch || emailMatch || roleMatch;
    });
  }, [users, searchQuery]);

  return (
    <div className="space-y-2">
      <Label>Assign Team</Label>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          disabled={disabled}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate text-left">
            {selectedUsers.length > 0
              ? `${selectedUsers.length} member${selectedUsers.length > 1 ? "s" : ""
              } selected`
              : "Select team members"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </button>

        {open && !disabled && (
          <div className="absolute z-50 mt-2 max-h-80 w-full overflow-hidden rounded-md border bg-popover shadow-md flex flex-col">
            <div className="p-2 border-b relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground/75" />
              <Input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs w-full bg-muted/40"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const checked = selectedIds.includes(user._id);

                  return (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => toggleMember(user._id)}
                      className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left hover:bg-accent"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="truncate text-sm font-medium">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                          {user.role ? ` • ${user.role.replace("_", " ")}` : ""}
                        </p>
                      </div>

                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border">
                        {checked && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  No team members found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedUsers.map((user) => (
            <div
              key={user._id}
              className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs"
            >
              <span>{user.name}</span>
              <button
                type="button"
                onClick={() => toggleMember(user._id)}
                className="font-semibold text-muted-foreground hover:text-foreground"
                disabled={disabled}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreateFacilityForm({
  open,
  onOpenChange,
  onComplete,
  fromEnquiry = null,
}: CreateFacilityFormProps) {
  const { data, isLoading: auditorsLoading } = useAssignableUsersQuery();
  const [createFacility, { isLoading: creatingFacility }] =
    useCreateFacilityMutation();
  const [createFacilityFromEnquiry, { isLoading: creatingFromEnquiry }] =
    useCreateFacilityFromEnquiryMutation();

  const isSavingFacility = creatingFacility || creatingFromEnquiry;

  const users: AssignableUser[] = data?.data || [];
  const assignableUsers = users.filter(
    (user) => user.role !== "super_admin",
  );

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    start_date: getTodayLocalDateString(),
    client_representatives: [
      { name: "", contact_number: "", email: "" },
    ] as ClientRepresentative[],
    facility_type: "",
    audit_type: AUDIT_TYPE_OPTIONS[0],
    auditor_ids: [] as string[],
    closure_date: "",
    budget: {
      no_of_persons: "",
      no_planned_site_visits: "",
      tentative_budget: "",
      actual_budget: "",
    },
  });

  const [submitError, setSubmitError] = useState("");

  const updateField = (
    field: keyof typeof formData,
    value: string | string[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      city: "",
      address: "",
      start_date: getTodayLocalDateString(),
      client_representatives: [{ name: "", contact_number: "", email: "" }],
      facility_type: "",
      audit_type: AUDIT_TYPE_OPTIONS[0],
      auditor_ids: [],
      closure_date: "",
      budget: { no_of_persons: "", no_planned_site_visits: "", tentative_budget: "", actual_budget: "" },
    });

    setSubmitError("");
    setStep(1);
  };

  useEffect(() => {
    if (!open || !fromEnquiry) return;

    const optionSet = new Set<string>(
      AUDIT_TYPE_OPTIONS as unknown as string[],
    );

    const repsFromEnquiry = (fromEnquiry.client_representatives ?? []).filter(
      (r) =>
        String(r?.name || "").trim() ||
        String(r?.contact_number || "").trim() ||
        String(r?.email || "").trim(),
    );

    const clientRepresentativesMapped: ClientRepresentative[] =
      repsFromEnquiry.length > 0
        ? repsFromEnquiry.map((r) => ({
            name: r.name ?? "",
            contact_number: r.contact_number ?? "",
            email: r.email ?? "",
          }))
        : [
            {
              name: fromEnquiry.client_representative ?? "",
              contact_number: fromEnquiry.client_contact_number ?? "",
              email: fromEnquiry.client_email ?? "",
            },
          ];

    const preferredAuditRaw =
      fromEnquiry.requested_audit_types?.find((t) => optionSet.has(t)) ??
      AUDIT_TYPE_OPTIONS[0];

    setFormData((prev) => ({
      ...prev,
      name: fromEnquiry.name ?? "",
      city: fromEnquiry.city ?? "",
      address: fromEnquiry.address ?? "",
      client_representatives:
        clientRepresentativesMapped.some(
          (r) => r.name || r.contact_number || r.email,
        )
          ? clientRepresentativesMapped
          : [{ name: "", contact_number: "", email: "" }],
      audit_type:
        typeof preferredAuditRaw === "string" &&
        AUDIT_TYPE_OPTIONS.includes(
          preferredAuditRaw as (typeof AUDIT_TYPE_OPTIONS)[number],
        )
          ? (preferredAuditRaw as (typeof AUDIT_TYPE_OPTIONS)[number])
          : AUDIT_TYPE_OPTIONS[0],
      start_date: getTodayLocalDateString(),
    }));
  }, [open, fromEnquiry]);

  // File upload logic removed

  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 0 && formData.city.trim().length > 0;
  }, [formData.name, formData.city]);

  const handleSubmit = async () => {
    setSubmitError("");

    if (!isFormValid) {
      setSubmitError("Facility name and city are required.");
      return;
    }

    const sanitizedReps = formData.client_representatives
      .map((rep) => ({
        name: rep.name.trim(),
        contact_number: rep.contact_number.trim(),
        email: rep.email.trim(),
      }))
      .filter((rep) => rep.name || rep.contact_number || rep.email);
    const primaryRep = sanitizedReps[0];

    const requestBody = {
      name: formData.name.trim(),
      city: formData.city.trim(),
      address: formData.address.trim() || undefined,
      start_date: formData.start_date || undefined,
      client_representatives: sanitizedReps,
      client_representative: primaryRep?.name || undefined,
      client_contact_number: primaryRep?.contact_number || undefined,
      client_email: primaryRep?.email || undefined,
      facility_type: formData.facility_type.trim(),
      audit_type: formData.audit_type,
      auditor_ids: formData.auditor_ids,
      closure_date: formData.closure_date || undefined,
      budget: {
        no_of_persons:
          formData.budget.no_of_persons !== ""
            ? Number(formData.budget.no_of_persons)
            : null,
        no_planned_site_visits:
          formData.budget.no_planned_site_visits !== ""
            ? Number(formData.budget.no_planned_site_visits)
            : null,
        tentative_budget:
          formData.budget.tentative_budget !== ""
            ? Number(formData.budget.tentative_budget)
            : null,
        actual_budget:
          formData.budget.actual_budget !== ""
            ? Number(formData.budget.actual_budget)
            : null,
      },
    };

    try {
      await toastHandler({
        action: () =>
          fromEnquiry
            ? createFacilityFromEnquiry({
                enquiryId: fromEnquiry._id,
                ...requestBody,
              }).unwrap()
            : createFacility(requestBody).unwrap(),

        loading: fromEnquiry
          ? "Creating facility from enquiry…"
          : "Creating facility...",
        success: fromEnquiry
          ? "Facility created and linked to the enquiry."
          : "Facility created successfully",
      });

      onComplete();
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create facility:", error);
    }
  };

  const steps = [
    { id: 1, name: "Facility Info", description: "Basic details & team" },
    { id: 2, name: "Client Info", description: "Representative contacts" },
    { id: 3, name: "Budget Info", description: "Planned vs actual budgets" }
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {fromEnquiry
              ? "Create facility from submitted enquiry"
              : "Create New Facility"}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper Progress Bar */}
        <div className="mb-6 mt-2 border-b pb-5">
          <div className="flex items-center justify-center gap-2 md:gap-4 max-w-2xl mx-auto px-4">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={s.id > 1 && !isFormValid}
                    onClick={() => isFormValid && setStep(s.id)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-200 ${
                      step === s.id
                        ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/10"
                        : step > s.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                  </button>
                  <div className="text-left hidden sm:block">
                    <p className={`text-xs font-semibold ${step === s.id ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 leading-none mt-0.5">
                      {s.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 min-w-[30px] mx-4 transition-colors duration-300 ${
                    step > s.id ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 py-2">
          {/* Step 1: Facility Information */}
          {step === 1 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Facility Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Enter facility name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  disabled={isSavingFacility}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  disabled={isSavingFacility}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facility_type">Facility Type</Label>
                <Input
                  id="facility_type"
                  placeholder="e.g. hospital, factory, data center"
                  value={formData.facility_type}
                  onChange={(e) => updateField("facility_type", e.target.value)}
                  disabled={isSavingFacility}
                />
              </div>

              <div className="space-y-2">
                <Label>Audit Type</Label>
                <Select
                  value={formData.audit_type}
                  onValueChange={(value) => updateField("audit_type", value)}
                  disabled={isSavingFacility}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateField("start_date", e.target.value)}
                  disabled={isSavingFacility}
                />
              </div>

              <div className="space-y-2">
                <Label>Planned Closure Date</Label>
                <Input
                  type="date"
                  value={formData.closure_date}
                  onChange={(e) => updateField("closure_date", e.target.value)}
                  disabled={isSavingFacility}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                {auditorsLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading team members...
                  </div>
                ) : (
                  <TeamMemberMultiSelect
                    users={assignableUsers}
                    selectedIds={formData.auditor_ids}
                    onChange={(ids) => updateField("auditor_ids", ids)}
                    disabled={isSavingFacility}
                  />
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter full address"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  disabled={isSavingFacility}
                />
              </div>
            </div>
          )}

          {/* Step 2: Client Information */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-sm font-semibold text-foreground">Client Representatives</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      client_representatives: [
                        ...prev.client_representatives,
                        { name: "", contact_number: "", email: "" },
                      ],
                    }))
                  }
                  disabled={isSavingFacility}
                >
                  Add Representative
                </Button>
              </div>
              <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
                {formData.client_representatives.map((rep, index) => (
                  <div
                    key={`client-rep-${index}`}
                    className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between border-b pb-2">
                      <p className="text-sm font-medium text-foreground">
                        Representative {index + 1}
                      </p>
                      {formData.client_representatives.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              client_representatives:
                                prev.client_representatives.filter(
                                  (_, i) => i !== index,
                                ),
                            }))
                          }
                          disabled={isSavingFacility}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="Representative name"
                          value={rep.name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              client_representatives:
                                prev.client_representatives.map((r, i) =>
                                  i === index ? { ...r, name: e.target.value } : r,
                                ),
                            }))
                          }
                          disabled={isSavingFacility}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Number</Label>
                        <Input
                          type="tel"
                          placeholder="Contact number"
                          value={rep.contact_number}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              client_representatives:
                                prev.client_representatives.map((r, i) =>
                                  i === index
                                    ? { ...r, contact_number: e.target.value }
                                    : r,
                                ),
                            }))
                          }
                          disabled={isSavingFacility}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="Email address"
                          value={rep.email}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              client_representatives:
                                prev.client_representatives.map((r, i) =>
                                  i === index ? { ...r, email: e.target.value } : r,
                                ),
                            }))
                          }
                          disabled={isSavingFacility}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Budget Information */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground border-b pb-2 mb-2">Budget Information</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="no_of_persons">No. of Persons</Label>
                  <Input
                    id="no_of_persons"
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={formData.budget.no_of_persons}
                    onChange={(e) => setFormData((prev) => ({ ...prev, budget: { ...prev.budget, no_of_persons: e.target.value } }))}
                    disabled={isSavingFacility}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="no_planned_site_visits">Planned Site Visits</Label>
                  <Input
                    id="no_planned_site_visits"
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={formData.budget.no_planned_site_visits}
                    onChange={(e) => setFormData((prev) => ({ ...prev, budget: { ...prev.budget, no_planned_site_visits: e.target.value } }))}
                    disabled={isSavingFacility}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tentative_budget">Tentative Budget (₹)</Label>
                  <Input
                    id="tentative_budget"
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={formData.budget.tentative_budget}
                    onChange={(e) => setFormData((prev) => ({ ...prev, budget: { ...prev.budget, tentative_budget: e.target.value } }))}
                    disabled={isSavingFacility}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual_budget">Actual Budget (₹)</Label>
                  <Input
                    id="actual_budget"
                    type="number"
                    min="0"
                    placeholder="e.g. 45000"
                    value={formData.budget.actual_budget}
                    onChange={(e) => setFormData((prev) => ({ ...prev, budget: { ...prev.budget, actual_budget: e.target.value } }))}
                    disabled={isSavingFacility}
                  />
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between items-center w-full sm:space-x-0">
          <div>
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((prev) => prev - 1)}
                disabled={isSavingFacility}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSavingFacility}
              >
                Cancel
              </Button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((prev) => prev + 1)}
                disabled={!isFormValid || isSavingFacility}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!isFormValid || isSavingFacility}
              >
                {isSavingFacility
                  ? fromEnquiry
                    ? "Creating…"
                    : "Creating..."
                  : fromEnquiry
                    ? "Create facility & link"
                    : "Create Facility"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
