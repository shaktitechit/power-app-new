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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { Card, CardContent } from "@/components/portal/ui/card";
import { Badge } from "@/components/portal/ui/badge";
import {
  Plus,
  PlusCircle,
  Trash2,
  Building2,
  Briefcase,
  User,
  Calendar,
  MapPin,
  Clock,
  FileText,
  X,
  Maximize2,
  Search,
  Check,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { useCreateWorkPlanMutation } from "@/store/slices/workPlannerApiSlice";
import { useGetFacilitiesQuery } from "@/store/slices/facilityApiSlice";
import { useGetEnquiriesQuery, Enquiry } from "@/store/slices/enquiryApiSlice";
import { useGetTeamUsersQuery } from "@/store/slices/teamManagerApiSlice";
import { useAppSelector } from "@/store/hooks";
import { formatRoleLabel } from "@/components/portal/lib/authRoles";
import { toast } from "sonner";

export interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  initialDate?: string;
}

interface VisitDraft {
  visitSource?: "facility" | "enquiry" | "new_lead";
  facilityId?: string;
  facilityName: string;
  location: string;
  clientName?: string;
  clientContactNumber?: string;
  clientEmail?: string;
  purpose?: string;
  expectedOutcome?: string;
  notes?: string;
}

interface WorkDraft {
  title: string;
  category: string;
  description: string;
  estimatedHours: number;
}

export function CreatePlanModal({ open, onClose, initialDate }: CreatePlanModalProps) {
  const currentUser = useAppSelector((s) => s.auth.user);
  const [createWorkPlan, { isLoading }] = useCreateWorkPlanMutation();

  const { data: facilitiesData } = useGetFacilitiesQuery(undefined as any);
  const facilities = ((facilitiesData as any)?.facilities || (facilitiesData as any)?.data || []) as any[];

  const { data: enquiriesData } = useGetEnquiriesQuery(undefined as any);
  const rawEnquiries = ((enquiriesData as any)?.data || (enquiriesData as any)?.enquiries || (Array.isArray(enquiriesData) ? enquiriesData : [])) as Enquiry[];

  const canAssignOtherUser = currentUser?.role === "super_admin" || currentUser?.role === "admin" || currentUser?.role === "manager";
  const { data: teamData } = useGetTeamUsersQuery({ limit: 100 }, { skip: !canAssignOtherUser });
  const teamUsers = teamData?.users || [];

  const [ownerId, setOwnerId] = useState<string>("");
  const [date, setDate] = useState<string>(initialDate || new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  const [planType, setPlanType] = useState<"visits" | "work_from_office" | "work_from_home" | "leave">("work_from_office");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [leaveReason, setLeaveReason] = useState<string>("");

  // Site Visit Source Selection
  const [visitSourceType, setVisitSourceType] = useState<"facility" | "enquiry" | "new_lead">("facility");
  const [facilitySearch, setFacilitySearch] = useState("");
  const [enquirySearch, setEnquirySearch] = useState("");
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);

  // Multiple Site Visits State
  const [visits, setVisits] = useState<VisitDraft[]>([]);
  const [currentVisit, setCurrentVisit] = useState<VisitDraft>({
    visitSource: "facility",
    facilityId: "",
    facilityName: "",
    location: "",
    clientName: "",
    clientContactNumber: "",
    clientEmail: "",
    purpose: "",
    expectedOutcome: "",
  });

  // Multiple Work Tasks State
  const [works, setWorks] = useState<WorkDraft[]>([]);
  const [currentWork, setCurrentWork] = useState<WorkDraft>({
    title: "",
    category: "general",
    description: "",
    estimatedHours: 2,
  });

  useEffect(() => {
    if (open && currentUser?._id) {
      setOwnerId(currentUser._id);
    }
  }, [open, currentUser]);

  const filteredFacilities = useMemo(() => {
    if (!facilitySearch.trim()) return facilities.slice(0, 8);
    const q = facilitySearch.toLowerCase();
    return facilities.filter(
      (f: any) =>
        f.name?.toLowerCase().includes(q) ||
        f.city?.toLowerCase().includes(q) ||
        f.address?.toLowerCase().includes(q) ||
        f.client_representative?.toLowerCase().includes(q) ||
        f.client_representatives?.[0]?.name?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [facilities, facilitySearch]);

  const filteredEnquiries = useMemo(() => {
    if (!enquirySearch.trim()) return rawEnquiries.slice(0, 8);
    const q = enquirySearch.toLowerCase();
    return rawEnquiries.filter((e: Enquiry) =>
      e.name?.toLowerCase().includes(q) ||
      e.enquiry_number?.toLowerCase().includes(q) ||
      e.city?.toLowerCase().includes(q) ||
      e.client_representative?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [rawEnquiries, enquirySearch]);

  const handleSelectFacility = (fac: any) => {
    const clientRepName = fac.client_representative || fac.client_representatives?.[0]?.name || fac.clientName || "";
    const clientContact = fac.client_contact_number || fac.client_representatives?.[0]?.contact_number || fac.contact_number || fac.phone || "";
    const clientEmail = fac.client_email || fac.client_representatives?.[0]?.email || fac.email || "";

    setCurrentVisit((prev) => ({
      ...prev,
      visitSource: "facility",
      facilityId: fac._id,
      facilityName: fac.name,
      location: fac.city || fac.address || "",
      clientName: clientRepName,
      clientContactNumber: clientContact,
      clientEmail: clientEmail,
      purpose: prev.purpose || "Facility Audit & Safety Inspection",
    }));
  };

  const handleSelectEnquiry = (enq: Enquiry) => {
    const convFacId = typeof enq.converted_facility_id === 'string'
      ? enq.converted_facility_id
      : enq.converted_facility_id?._id || undefined;

    const contactNum = enq.client_contact_number || enq.client_representatives?.[0]?.contact_number || "";
    const emailAddr = enq.client_email || enq.client_representatives?.[0]?.email || "";

    setSelectedEnquiryId(enq._id);
    setCurrentVisit((prev) => ({
      ...prev,
      visitSource: "enquiry",
      facilityId: convFacId,
      facilityName: enq.name,
      location: enq.city || enq.address || "",
      clientName: enq.client_representative || enq.name || "",
      clientContactNumber: contactNum,
      clientEmail: emailAddr,
      purpose: enq.requested_audit_types?.length ? enq.requested_audit_types.join(", ") : (prev.purpose || "Enquiry Survey & Follow-up"),
      expectedOutcome: prev.expectedOutcome || "Discussion on audit scope & site evaluation",
    }));
  };

  const handleAddVisit = (isMore = false) => {
    if (!currentVisit.facilityName && !currentVisit.purpose && !currentVisit.facilityId) {
      toast.error("Please select a facility/enquiry or enter custom details.");
      return;
    }
    const newVisit: VisitDraft = {
      visitSource: visitSourceType,
      facilityId: currentVisit.facilityId || undefined,
      facilityName: currentVisit.facilityName || "Site Visit",
      location: currentVisit.location || "",
      clientName: currentVisit.clientName || "",
      clientContactNumber: currentVisit.clientContactNumber || "",
      clientEmail: currentVisit.clientEmail || "",
      purpose: currentVisit.purpose || "",
      expectedOutcome: currentVisit.expectedOutcome || "",
    };
    setVisits((prev) => [...prev, newVisit]);
    
    // Reset draft visit form
    setVisitSourceType("facility");
    setFacilitySearch("");
    setEnquirySearch("");
    setSelectedEnquiryId(null);
    setCurrentVisit({
      visitSource: "facility",
      facilityId: "",
      facilityName: "",
      location: "",
      clientName: "",
      clientContactNumber: "",
      clientEmail: "",
      purpose: "",
      expectedOutcome: "",
    });

    if (isMore) {
      toast.success("Visit added! You can add another visit now.");
    } else {
      toast.success("Visit added to list.");
    }
  };

  const handleRemoveVisit = (index: number) => {
    setVisits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddWork = (isMore = false) => {
    if (!currentWork.title.trim()) {
      toast.error("Task title is required.");
      return;
    }
    setWorks((prev) => [...prev, { ...currentWork }]);
    setCurrentWork({
      title: "",
      category: "general",
      description: "",
      estimatedHours: 2,
    });

    if (isMore) {
      toast.success("Task added! You can add another task now.");
    } else {
      toast.success("Task added to list.");
    }
  };

  const handleRemoveWork = (index: number) => {
    setWorks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!date) {
      toast.error("Plan date is required.");
      return;
    }

    // Auto-include active entry if queued array is empty
    let finalVisits = [...visits];
    if (planType === "visits" && finalVisits.length === 0) {
      if (currentVisit.facilityName || currentVisit.purpose || currentVisit.facilityId) {
        finalVisits.push({
          visitSource: visitSourceType,
          facilityId: currentVisit.facilityId || undefined,
          facilityName: currentVisit.facilityName || "Site Visit",
          location: currentVisit.location || "",
          clientName: currentVisit.clientName || "",
          clientContactNumber: currentVisit.clientContactNumber || "",
          clientEmail: currentVisit.clientEmail || "",
          purpose: currentVisit.purpose || "",
          expectedOutcome: currentVisit.expectedOutcome || "",
        });
      }
    }

    let finalWorks = [...works];
    if (["work_from_office", "work_from_home"].includes(planType) && finalWorks.length === 0) {
      if (currentWork.title.trim()) {
        finalWorks.push({ ...currentWork });
      }
    }

    const actualUserId = currentUser?._id || (currentUser as any)?.id || "";
    const effectiveOwnerId = (ownerId && ownerId !== "me" && ownerId !== "self") ? ownerId : actualUserId;

    try {
      await createWorkPlan({
        ownerId: effectiveOwnerId || undefined,
        title: title || `Work Plan - ${date}`,
        description,
        planType,
        date,
        leaveReason,
        visits: finalVisits.map((v) => ({
          facility: v.facilityId ? (v.facilityId as any) : null,
          facilityName: v.facilityName,
          location: v.location,
          clientName: v.clientName,
          clientContactNumber: v.clientContactNumber,
          clientEmail: v.clientEmail,
          purpose: v.purpose,
          expectedOutcome: v.expectedOutcome,
          status: "scheduled" as const,
        })),
        works: finalWorks.map((w) => ({
          title: w.title,
          category: w.category,
          description: w.description,
          estimatedHours: Number(w.estimatedHours) || 1,
          status: "pending" as const,
        })),
        period: {
          type: "daily",
          startDate: date,
          endDate: date,
        },
      }).unwrap();

      toast.success("Daily work plan created successfully.");
      handleReset();
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to create work plan.");
    }
  };

  const handleReset = () => {
    setTitle("");
    setDescription("");
    setPlanType("work_from_office");
    setDate(new Date().toISOString().split("T")[0]);
    setLeaveReason("");
    setVisits([]);
    setWorks([]);
    setVisitSourceType("facility");
    setFacilitySearch("");
    setEnquirySearch("");
    setSelectedEnquiryId(null);
    setCurrentVisit({ visitSource: "facility", facilityId: "", facilityName: "", location: "", clientName: "", clientContactNumber: "", clientEmail: "", purpose: "", expectedOutcome: "" });
    setCurrentWork({ title: "", category: "general", description: "", estimatedHours: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isLoading && onClose()}>
      <DialogContent
        fullscreen
        showCloseButton={false}
        className="w-screen h-screen max-w-none max-h-none h-full w-full rounded-none p-0 gap-0 flex flex-col overflow-hidden bg-background border-none sm:max-w-none"
      >
        {/* FULLSCREEN FIXED HEADER */}
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-white flex flex-row items-center justify-between space-y-0 text-left border-slate-200 shadow-2xs">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <Maximize2 className="h-5 w-5 text-primary" /> Create Daily Work Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Full-Screen Editor — Schedule site visits from assigned facilities or enquiries, list work tasks, or assign plans to team members.
            </DialogDescription>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-slate-500 hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        {/* FULLSCREEN SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 max-w-6xl mx-auto w-full">
          {/* TOP SECTION: GENERAL PLAN CONFIGURATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 border rounded-2xl shadow-2xs">
            {/* Left Column: Plan Date & Plan Type */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> General Plan Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-plan-date" className="text-xs font-semibold text-slate-700">Plan Date *</Label>
                  <Input
                    id="create-plan-date"
                    type="date"
                    className="h-10 text-sm bg-white border-slate-300"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Plan Type *</Label>
                  <Select value={planType} onValueChange={(v: any) => setPlanType(v)}>
                    <SelectTrigger className="h-10 text-sm bg-white border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work_from_office">Work From Office</SelectItem>
                      <SelectItem value="work_from_home">Work From Home</SelectItem>
                      <SelectItem value="visits">Site Visits</SelectItem>
                      <SelectItem value="leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-plan-title" className="text-xs font-semibold text-slate-700">Plan Title (Optional)</Label>
                <Input
                  id="create-plan-title"
                  className="h-10 text-sm bg-white border-slate-300"
                  placeholder="e.g. Industrial Audit Visit & Baseline Study"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Right Column: Owner Assignment (Higher Authority -> Lower Authority) */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Target Owner / Assignee
              </h3>

              {canAssignOtherUser ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Assign Work Plan To *</Label>
                  <Select
                    value={ownerId || currentUser?._id || (currentUser as any)?.id || "self"}
                    onValueChange={(v) => setOwnerId(v === "self" ? (currentUser?._id || (currentUser as any)?.id || "") : v)}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border-primary/40 font-medium">
                      <SelectValue placeholder="Select target team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={currentUser?._id || (currentUser as any)?.id || "self"}>
                        Myself ({currentUser?.name || "Me"} - {formatRoleLabel(currentUser?.role)})
                      </SelectItem>
                      {teamUsers
                        .filter((u) => u._id !== (currentUser?._id || (currentUser as any)?.id))
                        .map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.name} ({formatRoleLabel(u.role)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    As a {formatRoleLabel(currentUser?.role)}, you can create work plans for yourself or assign them directly to team members.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-white border rounded-xl space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground block">Plan Owner:</span>
                  <p className="text-sm font-medium">{currentUser?.name} ({formatRoleLabel(currentUser?.role)})</p>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC SECTION 1: SITE VISITS */}
          {planType === "visits" && (
            <div className="space-y-5 p-6 bg-purple-50/40 rounded-2xl border border-purple-200 shadow-2xs">
              <div className="flex justify-between items-center border-b border-purple-200/80 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-purple-950 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-700" /> Planned Site Visits ({visits.length})
                  </h3>
                  <p className="text-xs text-purple-800/80">Add one or multiple facility/client site visits for this work plan day</p>
                </div>
              </div>

              {/* Queued Visits Grid */}
              {visits.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visits.map((v, idx) => (
                    <Card key={idx} className="bg-white border-purple-200 shadow-2xs hover:shadow-xs transition-shadow">
                      <CardContent className="p-4 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-purple-950 text-sm truncate">{v.facilityName}</span>
                            {v.visitSource && (
                              <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0 h-4">
                                {v.visitSource === "facility" ? "Facility" : v.visitSource === "enquiry" ? "Enquiry" : "New Lead"}
                              </Badge>
                            )}
                            {v.location && (
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 gap-1">
                                <MapPin className="h-3 w-3" /> {v.location}
                              </Badge>
                            )}
                          </div>
                          {v.clientName && (
                            <div className="space-y-0.5 text-[11px] text-muted-foreground">
                              <p className="font-semibold text-slate-800">Client Rep: {v.clientName}</p>
                              {(v.clientContactNumber || v.clientEmail) && (
                                <p className="flex items-center gap-2 flex-wrap text-[10px]">
                                  {v.clientContactNumber && <span>📞 {v.clientContactNumber}</span>}
                                  {v.clientEmail && <span>✉️ {v.clientEmail}</span>}
                                </p>
                              )}
                            </div>
                          )}
                          {v.purpose && <p className="text-xs text-slate-700">Purpose: {v.purpose}</p>}
                          {v.expectedOutcome && <p className="text-[11px] text-slate-500 italic">Expected: {v.expectedOutcome}</p>}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveVisit(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* New Visit Inputs Form with 3 Source Options */}
              <div className="space-y-5 pt-4 border-t border-purple-200/80 bg-white p-6 rounded-2xl border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <span className="text-sm font-bold text-purple-900 block">Add New Visit to Plan List</span>
                    <span className="text-xs text-muted-foreground">Select visit source or enter custom lead information</span>
                  </div>

                  {/* Visit Source Type Selector Buttons */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 gap-1 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setVisitSourceType("facility")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        visitSourceType === "new_lead"
                          ? "bg-purple-700 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> New Lead / Custom
                    </button>
                  </div>
                </div>

                {/* OPTION 1: ASSIGNED FACILITY SEARCH & SELECT */}
                {visitSourceType === "facility" && (
                  <div className="space-y-3 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-purple-950 flex items-center justify-between">
                        <span>Search Assigned Facility</span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {facilities.length} facilities available
                        </span>
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search facility name, city, or address..."
                          className="pl-9 h-9 text-xs bg-white border-purple-200"
                          value={facilitySearch}
                          onChange={(e) => setFacilitySearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Facility Options List */}
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {filteredFacilities.length > 0 ? (
                        filteredFacilities.map((fac: any) => {
                          const isSelected = currentVisit.facilityId === fac._id;
                          return (
                            <div
                              key={fac._id}
                              onClick={() => handleSelectFacility(fac)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "bg-purple-700 text-white border-purple-800 shadow-2xs"
                                  : "bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/80 text-slate-800"
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0 pr-2">
                                <p className="font-bold truncate text-xs">{fac.name}</p>
                                <p className={`text-[11px] truncate ${isSelected ? "text-purple-100" : "text-slate-500"}`}>
                                  {fac.city || fac.address || "Location specified on file"}
                                  {(fac.client_representative || fac.client_representatives?.[0]?.name)
                                    ? ` • Rep: ${fac.client_representative || fac.client_representatives?.[0]?.name}`
                                    : ""}
                                </p>
                              </div>
                              {isSelected ? (
                                <Badge variant="secondary" className="bg-white/20 text-white gap-1 text-[10px] shrink-0">
                                  <Check className="h-3 w-3" /> Selected
                                </Badge>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 text-[11px] text-purple-700 hover:bg-purple-100 hover:text-purple-900 shrink-0">
                                  Select
                                </Button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground py-3 text-center italic">No matching facilities found.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* OPTION 2: ASSIGNED ENQUIRY SEARCH & SELECT */}
                {visitSourceType === "enquiry" && (
                  <div className="space-y-3 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-purple-950 flex items-center justify-between">
                        <span>Search Assigned Enquiry</span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {rawEnquiries.length} enquiries assigned
                        </span>
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search enquiry title, #, representative, or city..."
                          className="pl-9 h-9 text-xs bg-white border-purple-200"
                          value={enquirySearch}
                          onChange={(e) => setEnquirySearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Enquiry Options List */}
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {filteredEnquiries.length > 0 ? (
                        filteredEnquiries.map((enq: Enquiry) => {
                          const isSelected = selectedEnquiryId === enq._id;
                          return (
                            <div
                              key={enq._id}
                              onClick={() => handleSelectEnquiry(enq)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "bg-purple-700 text-white border-purple-800 shadow-2xs"
                                  : "bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/80 text-slate-800"
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold truncate text-xs">{enq.name}</p>
                                  {enq.enquiry_number && (
                                    <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? "bg-purple-800 text-purple-100" : "bg-slate-100 text-slate-600"}`}>
                                      {enq.enquiry_number}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[11px] truncate ${isSelected ? "text-purple-100" : "text-slate-500"}`}>
                                  {enq.city} {enq.client_representative ? `• Contact: ${enq.client_representative}` : ""}
                                </p>
                              </div>
                              {isSelected ? (
                                <Badge variant="secondary" className="bg-white/20 text-white gap-1 text-[10px] shrink-0">
                                  <Check className="h-3 w-3" /> Selected
                                </Badge>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-7 text-[11px] text-purple-700 hover:bg-purple-100 hover:text-purple-900 shrink-0">
                                  Select
                                </Button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground py-3 text-center italic">No matching enquiries found.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* COMMON & CUSTOM VISIT FIELDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Facility / Location / Client Name *</Label>
                    <Input
                      className="h-10 text-sm"
                      placeholder="e.g. Apex Manufacturing Plant B"
                      value={currentVisit.facilityName}
                      onChange={(e) => setCurrentVisit((f) => ({ ...f, facilityName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Location / City</Label>
                    <Input
                      className="h-10 text-sm"
                      placeholder="e.g. Pune, Maharashtra"
                      value={currentVisit.location}
                      onChange={(e) => setCurrentVisit((f) => ({ ...f, location: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Client / Contact Representative</Label>
                    <Input
                      className="h-10 text-sm"
                      placeholder="e.g. Mr. Rajesh Sharma"
                      value={currentVisit.clientName}
                      onChange={(e) => setCurrentVisit((f) => ({ ...f, clientName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Contact Phone Number</Label>
                    <Input
                      className="h-10 text-sm"
                      placeholder="e.g. +91 98765 43210"
                      value={currentVisit.clientContactNumber || ""}
                      onChange={(e) => setCurrentVisit((f) => ({ ...f, clientContactNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Contact Email Address</Label>
                    <Input
                      className="h-10 text-sm"
                      type="email"
                      placeholder="e.g. rajesh@client.com"
                      value={currentVisit.clientEmail || ""}
                      onChange={(e) => setCurrentVisit((f) => ({ ...f, clientEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Purpose of Visit</Label>
                  <Input
                    className="h-10 text-sm"
                    placeholder="e.g. Electrical Safety Audit Inspection"
                    value={currentVisit.purpose}
                    onChange={(e) => setCurrentVisit((f) => ({ ...f, purpose: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Expected Outcome / Objective</Label>
                  <Input
                    className="h-10 text-sm"
                    placeholder="e.g. Completion of physical verification and single-line diagram review"
                    value={currentVisit.expectedOutcome}
                    onChange={(e) => setCurrentVisit((f) => ({ ...f, expectedOutcome: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full sm:w-1/2 h-10 text-sm bg-purple-700 hover:bg-purple-800 text-white gap-2 font-bold shadow-2xs"
                    onClick={() => handleAddVisit(false)}
                  >
                    <Plus className="h-4 w-4" /> Add Visit
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-1/2 h-10 text-sm border-purple-300 text-purple-900 bg-purple-50 hover:bg-purple-100 gap-2 font-bold"
                    onClick={() => handleAddVisit(true)}
                  >
                    <PlusCircle className="h-4 w-4 text-purple-700" /> Add More
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC SECTION 2: WORK ITEMS */}
          {["work_from_office", "work_from_home"].includes(planType) && (
            <div className="space-y-5 p-6 bg-blue-50/40 rounded-2xl border border-blue-200 shadow-2xs">
              <div className="flex justify-between items-center border-b border-blue-200/80 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-blue-950 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-700" /> Planned Work Tasks ({works.length})
                  </h3>
                  <p className="text-xs text-blue-800/80">List one or multiple tasks and responsibilities planned for today</p>
                </div>
              </div>

              {/* Queued Works Grid */}
              {works.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {works.map((w, idx) => (
                    <Card key={idx} className="bg-white border-blue-200 shadow-2xs hover:shadow-xs transition-shadow">
                      <CardContent className="p-4 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-blue-950 text-sm truncate">{w.title}</span>
                            <Badge variant="outline" className="capitalize text-[10px] px-2 bg-blue-50 text-blue-700 border-blue-200">
                              {w.category}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {w.estimatedHours}h
                            </span>
                          </div>
                          {w.description && <p className="text-xs text-slate-700">{w.description}</p>}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveWork(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* New Work Input Form */}
              <div className="space-y-4 pt-4 border-t border-blue-200/80 bg-white p-6 rounded-2xl border">
                <span className="text-sm font-bold text-blue-900 block">Add New Task to Plan List</span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Task / Work Title *</Label>
                    <Input
                      className="h-10 text-sm"
                      placeholder="e.g. Draft Audit Summary Report & Data Analysis"
                      value={currentWork.title}
                      onChange={(e) => setCurrentWork((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Category</Label>
                    <Select
                      value={currentWork.category}
                      onValueChange={(v) => setCurrentWork((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="report_writing">Report Writing</SelectItem>
                        <SelectItem value="data_analysis">Data Analysis</SelectItem>
                        <SelectItem value="client_meeting">Client Meeting</SelectItem>
                        <SelectItem value="documentation">Documentation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Task Details / Description</Label>
                    <Input
                      className="h-10 text-sm"
                      placeholder="Brief details..."
                      value={currentWork.description}
                      onChange={(e) => setCurrentWork((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Est. Hours</Label>
                    <Input
                      className="h-10 text-sm"
                      type="number"
                      min="0.5"
                      step="0.5"
                      placeholder="Hours"
                      value={currentWork.estimatedHours}
                      onChange={(e) => setCurrentWork((f) => ({ ...f, estimatedHours: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full sm:w-1/2 h-10 text-sm bg-blue-700 hover:bg-blue-800 text-white gap-2 font-bold shadow-2xs"
                    onClick={() => handleAddWork(false)}
                  >
                    <Plus className="h-4 w-4" /> Add Task
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-1/2 h-10 text-sm border-blue-300 text-blue-900 bg-blue-50 hover:bg-blue-100 gap-2 font-bold"
                    onClick={() => handleAddWork(true)}
                  >
                    <PlusCircle className="h-4 w-4 text-blue-700" /> Add More
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC SECTION 3: LEAVE DETAILS */}
          {planType === "leave" && (
            <div className="space-y-2 p-6 bg-amber-50/50 rounded-2xl border border-amber-200">
              <Label htmlFor="leave-reason-input" className="text-sm font-bold text-amber-950">
                Leave Reason / Details *
              </Label>
              <Textarea
                id="leave-reason-input"
                className="bg-white border-amber-200 text-sm"
                rows={4}
                placeholder="e.g. Casual Leave / Personal work"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* FULLSCREEN FIXED FOOTER */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 flex items-center justify-end gap-3 bg-slate-50 border-slate-200">
          <Button variant="outline" size="lg" onClick={onClose} disabled={isLoading} className="px-6 font-semibold">
            Cancel
          </Button>
          <Button size="lg" onClick={handleSubmit} disabled={isLoading} className="gap-2 px-8 font-bold text-base">
            {isLoading ? "Creating Plan..." : "Create Work Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
