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
import { toastHandler } from "@/components/portal/lib/toast";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";
import {
  datetimeLocalToIso,
  isoToDatetimeLocal,
} from "@/components/portal/lib/enquiryConstants";
import { resolveUserId, canAssignEnquiryRoles } from "@/components/portal/lib/enquiryAccess";
import {
  useGetEnquiryByIdQuery,
  useUpdateEnquiryMutation,
} from "@/store/slices/enquiryApiSlice";
import {
  emptyClientRepresentative,
  EnquiryClientRepresentativesFields,
  hydrateEnquiryClientRepresentatives,
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
  hydrateEnquiryRequestedAudits,
  sanitizeEnquiryRequestedAudits,
  type EnquiryRequestedAudit,
} from "./enquiry-requested-audits-fields";

interface EditEnquiryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  enquiryId: string | null;
}

const UNASSIGNED = ENQUIRY_UNASSIGNED;

export function EditEnquiryForm({
  open,
  onOpenChange,
  onComplete,
  enquiryId,
}: EditEnquiryFormProps) {
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
  const [isConverted, setIsConverted] = useState(false);
  const [convertedFacilityId, setConvertedFacilityId] = useState("");

  const { data: assignableRes } = useAssignableUsersQuery(undefined, {
    skip: !open,
  });
  const assignableUsers = assignableRes?.data ?? [];
  const currentUser = useAppSelector((state) => state.auth.user);
  const canAssignAll = canAssignEnquiryRoles(currentUser?.role);

  const {
    data: enquiryRes,
    isLoading: enquiryLoading,
    isFetching,
    isError,
  } = useGetEnquiryByIdQuery(enquiryId ?? "", {
    skip: !open || !enquiryId,
  });

  const [updateEnquiry, { isLoading: saving }] = useUpdateEnquiryMutation();

  const enquiry = enquiryRes?.data;

  useEffect(() => {
    if (!enquiry || !open) return;

    setName(enquiry.name ?? "");
    setCity(enquiry.city ?? "");
    setAddress(enquiry.address ?? "");
    setClientRepresentatives(hydrateEnquiryClientRepresentatives(enquiry));

    const auditorId = resolveUserId(enquiry.assigned_to);
    const managerId = resolveUserId(enquiry.assigned_manager_to);
    const adminId = resolveUserId(enquiry.assigned_admin_to);
    setAssignedTo(auditorId ?? UNASSIGNED);
    setAssignedManagerTo(managerId ?? UNASSIGNED);
    setAssignedAdminTo(adminId ?? UNASSIGNED);

    setSource(enquiry.source ?? "");
    setNotes(enquiry.notes ?? "");

    setNextFollowupDate(isoToDatetimeLocal(enquiry.next_followup_date));

    setRequestedAudits(hydrateEnquiryRequestedAudits(enquiry));

    setIsConverted(Boolean(enquiry.is_converted_to_facility));
    const cf =
      enquiry.converted_facility_id &&
      typeof enquiry.converted_facility_id === "object"
        ? enquiry.converted_facility_id._id
        : enquiry.converted_facility_id;
    setConvertedFacilityId(cf ? String(cf) : "");
  }, [enquiry, open]);

  const submitDisabled = useMemo(() => {
    return (
      !name.trim() ||
      !city.trim() ||
      saving ||
      enquiryLoading ||
      !enquiryId ||
      !enquiry ||
      isError
    );
  }, [name, city, saving, enquiryLoading, enquiryId, enquiry, isError]);

  const handleClose = (next: boolean) => {
    if (!next) {
      /* reset handled when reopen loads enquiry */
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryId || submitDisabled) return;

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
      id: enquiryId,
      name: name.trim(),
      city: city.trim(),
      address: address.trim() || undefined,
      client_representatives: sanitizedReps,
      client_representative: primaryRep?.name || "",
      client_contact_number: primaryRep?.contact_number || undefined,
      client_email: primaryRep?.email || undefined,
      ...(canAssignAll
        ? {
            assigned_to:
              assignedTo === UNASSIGNED ? null : assignedTo || undefined,
            assigned_manager_to:
              assignedManagerTo === UNASSIGNED
                ? null
                : assignedManagerTo || undefined,
            assigned_admin_to:
              assignedAdminTo === UNASSIGNED
                ? null
                : assignedAdminTo || undefined,
          }
        : {}),
      source: source.trim() || undefined,
      requested_audits: sanitizeEnquiryRequestedAudits(requestedAudits),
      notes: notes.trim() || undefined,
      next_followup_date: datetimeLocalToIso(nextFollowupDate) ?? null,
      is_converted_to_facility: isConverted,
      converted_facility_id: isConverted
        ? convertedFacilityId.trim() === ""
          ? null
          : convertedFacilityId.trim()
        : null,
    };

    try {
      await toastHandler({
        action: async () => {
          await updateEnquiry(payload).unwrap();
        },
        loading: "Saving enquiry…",
        success: "Enquiry updated.",
      });
      onOpenChange(false);
      onComplete();
    } catch {
      /* toast shown */
    }
  };

  const loadingDialog = open && enquiryId && (enquiryLoading || isFetching) && !enquiry && !isError;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit enquiry</DialogTitle>
        </DialogHeader>

        {loadingDialog ? (
          <p className="text-sm text-muted-foreground">Loading enquiry…</p>
        ) : open && enquiryId && isError ? (
          <p className="text-sm text-destructive">
            Could not load this enquiry. You may not have access or it no longer
            exists.
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="eenq-name">Name / organisation *</Label>
                <Input
                  id="eenq-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eenq-city">City *</Label>
                <Input
                  id="eenq-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eenq-address">Address</Label>
              <Input
                id="eenq-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <EnquiryClientRepresentativesFields
              idPrefix="eenq"
              value={clientRepresentatives}
              onChange={setClientRepresentatives}
            />

            <EnquiryAssignmentFields
              mode="edit"
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
                <Label htmlFor="eenq-source">Source</Label>
                <Input
                  id="eenq-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
            </div>

            <EnquiryRequestedAuditsFields
              idPrefix="eenq"
              value={requestedAudits}
              onChange={setRequestedAudits}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eenq-nfd">Next follow-up</Label>
                <Input
                  id="eenq-nfd"
                  type="datetime-local"
                  value={nextFollowupDate}
                  onChange={(e) => setNextFollowupDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isConverted}
                  onChange={(e) => setIsConverted(e.target.checked)}
                  className="rounded border-input"
                />
                Converted to facility
              </label>
              {isConverted ? (
                <div className="space-y-2">
                  <Label htmlFor="eenq-fac">Facility ID</Label>
                  <Input
                    id="eenq-fac"
                    value={convertedFacilityId}
                    onChange={(e) => setConvertedFacilityId(e.target.value)}
                    placeholder="Mongo ObjectId of facility"
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="eenq-notes">Notes</Label>
              <Textarea
                id="eenq-notes"
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
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
