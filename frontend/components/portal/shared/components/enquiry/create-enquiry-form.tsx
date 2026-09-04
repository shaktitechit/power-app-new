"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Button } from "@/components/portal/ui/button";
import { Textarea } from "@/components/portal/ui/textarea";
import { useAssignableUsersQuery } from "@/store/slices/userApiSlice";
import { useCreateEnquiryMutation } from "@/store/slices/enquiryApiSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";
import { datetimeLocalToIso } from "@/components/portal/lib/enquiryConstants";
import { canAssignEnquiryRoles } from "@/components/portal/lib/enquiryAccess";
import {
  emptyClientRepresentative,
  EnquiryClientRepresentativesFields,
  sanitizeEnquiryClientRepresentatives,
  type EnquiryClientRepresentative,
} from "./enquiry-client-representatives-fields";
import {
  ENQUIRY_UNASSIGNED,
  EnquiryAssignmentFields,
} from "./enquiry-assignment-fields";
import {
  EnquiryRequestedAuditsFields,
  findInvalidRequestedAudit,
  sanitizeEnquiryRequestedAudits,
  type EnquiryRequestedAudit,
} from "./enquiry-requested-audits-fields";

interface CreateEnquiryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const UNASSIGNED = ENQUIRY_UNASSIGNED;

export function CreateEnquiryForm({
  open,
  onOpenChange,
  onComplete,
}: CreateEnquiryFormProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [clientRepresentatives, setClientRepresentatives] = useState<
    EnquiryClientRepresentative[]
  >([emptyClientRepresentative()]);
  const [assignedTo, setAssignedTo] = useState<string>(UNASSIGNED);
  const [assignedManagerTo, setAssignedManagerTo] = useState<string>(UNASSIGNED);
  const [assignedAdminTo, setAssignedAdminTo] = useState<string>(UNASSIGNED);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [nextFollowupDate, setNextFollowupDate] = useState("");
  const [requestedAudits, setRequestedAudits] = useState<
    EnquiryRequestedAudit[]
  >([]);

  const { data: assignableRes } = useAssignableUsersQuery(undefined, {
    skip: !open,
  });
  const assignableUsers = assignableRes?.data ?? [];
  const currentUser = useAppSelector((state) => state.auth.user);
  const canAssignAll = canAssignEnquiryRoles(currentUser?.role);

  useEffect(() => {
    if (!open || !currentUser?._id) return;
    setAssignedTo(currentUser.role === "auditor" ? currentUser._id : UNASSIGNED);
    setAssignedManagerTo(
      currentUser.role === "manager" ? currentUser._id : UNASSIGNED,
    );
    setAssignedAdminTo(currentUser.role === "admin" ? currentUser._id : UNASSIGNED);
  }, [open, currentUser]);

  const [createEnquiry, { isLoading }] = useCreateEnquiryMutation();

  const reset = () => {
    setName("");
    setCity("");
    setAddress("");
    setClientRepresentatives([emptyClientRepresentative()]);
    setAssignedTo(UNASSIGNED);
    setAssignedManagerTo(UNASSIGNED);
    setAssignedAdminTo(UNASSIGNED);
    setSource("");
    setNotes("");
    setNextFollowupDate("");
    setRequestedAudits([]);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submitDisabled = useMemo(() => {
    return !name.trim() || !city.trim() || isLoading;
  }, [name, city, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;

    const invalidAudit = findInvalidRequestedAudit(requestedAudits);
    if (invalidAudit) {
      toast.error(
        `Expected value for ${invalidAudit.audit_type} must be a positive number.`,
      );
      return;
    }

    const sanitizedReps = sanitizeEnquiryClientRepresentatives(
      clientRepresentatives,
    );
    const primaryRep = sanitizedReps[0];

    const payload = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim() || undefined,
      client_representatives: sanitizedReps,
      client_representative: primaryRep?.name || undefined,
      client_contact_number: primaryRep?.contact_number || undefined,
      client_email: primaryRep?.email || undefined,
      ...(canAssignAll
        ? {
            assigned_to:
              assignedTo === UNASSIGNED ? undefined : assignedTo || undefined,
            assigned_manager_to:
              assignedManagerTo === UNASSIGNED
                ? undefined
                : assignedManagerTo || undefined,
            assigned_admin_to:
              assignedAdminTo === UNASSIGNED
                ? undefined
                : assignedAdminTo || undefined,
          }
        : {
            assigned_to:
              currentUser?.role === "auditor" ? currentUser._id : undefined,
            assigned_manager_to:
              currentUser?.role === "manager" ? currentUser._id : undefined,
            assigned_admin_to:
              currentUser?.role === "admin" ? currentUser._id : undefined,
          }),
      source: source.trim() || undefined,
      requested_audits: sanitizeEnquiryRequestedAudits(requestedAudits),
      notes: notes.trim() || undefined,
      next_followup_date: datetimeLocalToIso(nextFollowupDate),
    };

    try {
      await toastHandler({
        action: async () => {
          await createEnquiry(payload).unwrap();
        },
        loading: "Creating enquiry…",
        success: `"${payload.name}" has been added.`,
      });
      reset();
      onOpenChange(false);
      onComplete();
    } catch {
      /* toast shown */
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create enquiry</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="enq-name">Name / organisation *</Label>
              <Input
                id="enq-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Client or site name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enq-city">City *</Label>
              <Input
                id="enq-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="enq-address">Address</Label>
            <Input
              id="enq-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <EnquiryClientRepresentativesFields
            idPrefix="enq"
            value={clientRepresentatives}
            onChange={setClientRepresentatives}
          />

          <EnquiryAssignmentFields
            mode="create"
            assignedTo={assignedTo}
            assignedManagerTo={assignedManagerTo}
            assignedAdminTo={assignedAdminTo}
            onAssignedToChange={setAssignedTo}
            onAssignedManagerToChange={setAssignedManagerTo}
            onAssignedAdminToChange={setAssignedAdminTo}
            assignableUsers={assignableUsers}
            currentUser={currentUser}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enq-source">Source</Label>
              <Input
                id="enq-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Referral, web, etc."
              />
            </div>
          </div>

          <EnquiryRequestedAuditsFields
            idPrefix="enq"
            value={requestedAudits}
            onChange={setRequestedAudits}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enq-nfd">Next follow-up</Label>
              <Input
                id="enq-nfd"
                type="datetime-local"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="enq-notes">Notes</Label>
            <Textarea
              id="enq-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {isLoading ? "Saving..." : "Create enquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
