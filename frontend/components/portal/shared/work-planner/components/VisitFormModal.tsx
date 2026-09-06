"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/portal/ui/dialog";
import { Button } from "@/components/portal/ui/button";
import { Label } from "@/components/portal/ui/label";
import { Input } from "@/components/portal/ui/input";
import { Textarea } from "@/components/portal/ui/textarea";
import { Badge } from "@/components/portal/ui/badge";
import { Building2, ClipboardList, Sparkles, Search, Check } from "lucide-react";
import { useGetFacilitiesQuery } from "@/store/slices/facilityApiSlice";
import { useGetEnquiriesQuery, Enquiry } from "@/store/slices/enquiryApiSlice";
import { VisitItem } from "@/store/slices/workPlannerApiSlice";

export interface VisitFormModalProps {
  open: boolean;
  initial?: VisitItem | null;
  isSaving?: boolean;
  onClose: () => void;
  onConfirm: (visit: VisitItem) => void | Promise<void>;
}

export function VisitFormModal({
  open,
  initial,
  isSaving,
  onClose,
  onConfirm,
}: VisitFormModalProps) {
  const { data: facilitiesData } = useGetFacilitiesQuery(undefined as any);
  const facilities = (((facilitiesData as any)?.facilities || (facilitiesData as any)?.data || []) as any[]);

  const { data: enquiriesData } = useGetEnquiriesQuery(undefined as any);
  const rawEnquiries = (((enquiriesData as any)?.data || (enquiriesData as any)?.enquiries || (Array.isArray(enquiriesData) ? enquiriesData : [])) as Enquiry[]);

  const [visitSourceType, setVisitSourceType] = useState<"facility" | "enquiry" | "new_lead">("facility");
  const [facilitySearch, setFacilitySearch] = useState("");
  const [enquirySearch, setEnquirySearch] = useState("");
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);

  const [form, setForm] = useState<VisitItem>({
    facilityId: "",
    facilityName: "",
    location: "",
    clientName: "",
    clientContactNumber: "",
    clientEmail: "",
    purpose: "",
    expectedOutcome: "",
    status: "scheduled",
    notes: "",
  } as any);

  useEffect(() => {
    if (initial) {
      setForm({
        facilityId: (initial.facility as any)?._id || initial.facility || "",
        facilityName: initial.facilityName || (initial.facility as any)?.name || "",
        location: initial.location || (initial.facility as any)?.city || "",
        clientName: initial.clientName || "",
        clientContactNumber: initial.clientContactNumber || "",
        clientEmail: initial.clientEmail || "",
        purpose: initial.purpose || "",
        expectedOutcome: initial.expectedOutcome || "",
        status: initial.status || "scheduled",
        notes: initial.notes || "",
      } as any);
      if ((initial.facility as any)?._id || initial.facility) {
        setVisitSourceType("facility");
      }
    } else {
      setForm({
        facilityId: "",
        facilityName: "",
        location: "",
        clientName: "",
        clientContactNumber: "",
        clientEmail: "",
        purpose: "",
        expectedOutcome: "",
        status: "scheduled",
        notes: "",
      } as any);
      setVisitSourceType("facility");
      setFacilitySearch("");
      setEnquirySearch("");
      setSelectedEnquiryId(null);
    }
  }, [initial, open]);

  const filteredFacilities = useMemo(() => {
    if (!facilitySearch.trim()) return facilities.slice(0, 6);
    const q = facilitySearch.toLowerCase();
    return facilities.filter(
      (f: any) =>
        f.name?.toLowerCase().includes(q) ||
        f.city?.toLowerCase().includes(q) ||
        f.address?.toLowerCase().includes(q) ||
        f.client_representative?.toLowerCase().includes(q) ||
        f.client_representatives?.[0]?.name?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [facilities, facilitySearch]);

  const filteredEnquiries = useMemo(() => {
    if (!enquirySearch.trim()) return rawEnquiries.slice(0, 6);
    const q = enquirySearch.toLowerCase();
    return rawEnquiries.filter((e: Enquiry) =>
      e.name?.toLowerCase().includes(q) ||
      e.enquiry_number?.toLowerCase().includes(q) ||
      e.city?.toLowerCase().includes(q) ||
      e.client_representative?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [rawEnquiries, enquirySearch]);

  const handleSelectFacility = (fac: any) => {
    const clientRepName = fac.client_representative || fac.client_representatives?.[0]?.name || fac.clientName || "";
    const clientContact = fac.client_contact_number || fac.client_representatives?.[0]?.contact_number || fac.contact_number || fac.phone || "";
    const clientEmail = fac.client_email || fac.client_representatives?.[0]?.email || fac.email || "";

    setForm((prev) => ({
      ...prev,
      facilityId: fac._id,
      facilityName: fac.name,
      location: fac.city || fac.address || "",
      clientName: clientRepName,
      clientContactNumber: clientContact,
      clientEmail: clientEmail,
      purpose: prev.purpose || "Facility Audit & Safety Inspection",
    } as any));
  };

  const handleSelectEnquiry = (enq: Enquiry) => {
    const convFacId = typeof enq.converted_facility_id === 'string'
      ? enq.converted_facility_id
      : enq.converted_facility_id?._id || undefined;

    const contactNum = enq.client_contact_number || enq.client_representatives?.[0]?.contact_number || "";
    const emailAddr = enq.client_email || enq.client_representatives?.[0]?.email || "";

    setSelectedEnquiryId(enq._id);
    setForm((prev) => ({
      ...prev,
      facilityId: convFacId,
      facilityName: enq.name,
      location: enq.city || enq.address || "",
      clientName: enq.client_representative || enq.name || "",
      clientContactNumber: contactNum,
      clientEmail: emailAddr,
      purpose: enq.requested_audit_types?.length ? enq.requested_audit_types.join(", ") : (prev.purpose || "Enquiry Survey & Follow-up"),
      expectedOutcome: prev.expectedOutcome || "Discussion on audit scope & site evaluation",
    } as any));
  };

  const handleSubmit = async () => {
    const selectedFac = facilities.find((f: any) => f._id === (form as any).facilityId);
    const payload: VisitItem = {
      facility: (form as any).facilityId ? ((form as any).facilityId as any) : null,
      facilityName: selectedFac?.name || form.facilityName,
      location: selectedFac?.city || form.location,
      clientName: form.clientName,
      clientContactNumber: form.clientContactNumber,
      clientEmail: form.clientEmail,
      purpose: form.purpose,
      expectedOutcome: form.expectedOutcome,
      status: form.status || "scheduled",
      notes: form.notes,
    };
    await onConfirm(payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Site Visit" : "Add Site / Client Visit"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update details for this site visit." : "Schedule a visit from assigned facilities, enquiries, or custom lead details."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Visit Source Type Selector Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => setVisitSourceType("facility")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                visitSourceType === "facility"
                  ? "bg-purple-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" /> Facility
            </button>
            <button
              type="button"
              onClick={() => setVisitSourceType("enquiry")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                visitSourceType === "enquiry"
                  ? "bg-purple-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" /> Enquiry
            </button>
            <button
              type="button"
              onClick={() => setVisitSourceType("new_lead")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                visitSourceType === "new_lead"
                  ? "bg-purple-700 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> New Lead
            </button>
          </div>

          {/* FACILITY SEARCH & SELECT */}
          {visitSourceType === "facility" && (
            <div className="space-y-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search facilities..."
                  className="pl-8 h-8 text-xs bg-white border-purple-200"
                  value={facilitySearch}
                  onChange={(e) => setFacilitySearch(e.target.value)}
                />
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {filteredFacilities.length > 0 ? (
                  filteredFacilities.map((fac: any) => {
                    const isSelected = (form as any).facilityId === fac._id;
                    return (
                      <div
                        key={fac._id}
                        onClick={() => handleSelectFacility(fac)}
                        className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-purple-700 text-white border-purple-800"
                            : "bg-white border-slate-200 hover:bg-purple-50 text-slate-800"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold truncate text-xs">{fac.name}</p>
                          <p className={`text-[10px] truncate ${isSelected ? "text-purple-100" : "text-slate-500"}`}>
                            {fac.city || fac.address || "Location specified"}
                            {(fac.client_representative || fac.client_representatives?.[0]?.name)
                              ? ` • Rep: ${fac.client_representative || fac.client_representatives?.[0]?.name}`
                              : ""}
                          </p>
                        </div>
                        {isSelected && <Badge variant="secondary" className="bg-white/20 text-white text-[10px]">Selected</Badge>}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center italic">No facilities found.</p>
                )}
              </div>
            </div>
          )}

          {/* ENQUIRY SEARCH & SELECT */}
          {visitSourceType === "enquiry" && (
            <div className="space-y-2 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search enquiries..."
                  className="pl-8 h-8 text-xs bg-white border-purple-200"
                  value={enquirySearch}
                  onChange={(e) => setEnquirySearch(e.target.value)}
                />
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {filteredEnquiries.length > 0 ? (
                  filteredEnquiries.map((enq: Enquiry) => {
                    const isSelected = selectedEnquiryId === enq._id;
                    return (
                      <div
                        key={enq._id}
                        onClick={() => handleSelectEnquiry(enq)}
                        className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-purple-700 text-white border-purple-800"
                            : "bg-white border-slate-200 hover:bg-purple-50 text-slate-800"
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-bold truncate text-xs">{enq.name}</p>
                          <p className={`text-[10px] truncate ${isSelected ? "text-purple-100" : "text-slate-500"}`}>{enq.city} • {enq.client_representative || "No contact"}</p>
                        </div>
                        {isSelected && <Badge variant="secondary" className="bg-white/20 text-white text-[10px]">Selected</Badge>}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center italic">No enquiries found.</p>
                )}
              </div>
            </div>
          )}

          {/* DETAILS FIELDS */}
          <div className="space-y-1">
            <Label className="text-xs">Facility / Location Name *</Label>
            <Input
              className="h-9 text-xs"
              placeholder="e.g. Apex Industrial Site B"
              value={form.facilityName || ""}
              onChange={(e) => setForm((f) => ({ ...f, facilityName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Location / City</Label>
            <Input
              className="h-9 text-xs"
              placeholder="e.g. Pune, Maharashtra"
              value={form.location || ""}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Client Contact Representative</Label>
            <Input
              className="h-9 text-xs"
              placeholder="e.g. Mr. Rajesh Sharma"
              value={form.clientName || ""}
              onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Contact Phone Number</Label>
              <Input
                className="h-9 text-xs"
                placeholder="e.g. +91 98765 43210"
                value={form.clientContactNumber || ""}
                onChange={(e) => setForm((f) => ({ ...f, clientContactNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Email Address</Label>
              <Input
                className="h-9 text-xs"
                type="email"
                placeholder="e.g. rajesh@client.com"
                value={form.clientEmail || ""}
                onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Purpose of Visit</Label>
            <Input
              className="h-9 text-xs"
              placeholder="e.g. Electrical Safety Audit & Meter Check"
              value={form.purpose || ""}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Expected Outcome</Label>
            <Input
              className="h-9 text-xs"
              placeholder="e.g. Complete baseline data collection"
              value={form.expectedOutcome || ""}
              onChange={(e) => setForm((f) => ({ ...f, expectedOutcome: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes (Optional)</Label>
            <Textarea
              className="text-xs"
              placeholder="Any special instructions..."
              value={form.notes || ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : initial ? "Save Changes" : "Add Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
