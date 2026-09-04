"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/components/portal/ui/checkbox";
import { Textarea } from "@/components/portal/ui/textarea";
import { RichTextEditor } from "@/components/portal/ui/rich-text-editor";
import { isEmptyRichHtml, sanitizeRichHtml } from "@/components/portal/lib/richText";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/portal/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/portal/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useGetEnquiriesQuery } from "@/store/slices/enquiryApiSlice";
import {
  useCreateEoiMutation,
  useGetEoiSignatoriesQuery,
  useUpdateEoiMutation,
  type ExpressionOfInterest,
} from "@/store/slices/eoiApiSlice";
import { getEnquiryClientRepresentatives } from "@/components/portal/shared/components/enquiry/enquiry-client-representatives-fields";
import { toastHandler } from "@/components/portal/lib/toast";
import {
  DEFAULT_EOI_CLOSE,
  DEFAULT_EOI_SALUTATION,
  defaultEoiBody,
  defaultEoiSubject,
  eoiBodyForEditor,
  eoiEnquiryId,
  eoiEnquiryLabel,
} from "@/components/portal/lib/eoiConstants";
import {
  TERMINAL_ENQUIRY_STATUSES,
  enquiryStatusLabel,
  pipelineStatusValue,
} from "@/components/portal/lib/enquiryConstants";
import { enquirySearchHaystack } from "@/components/portal/lib/enquirySearchHaystack";
import { formatRoleLabel } from "@/components/portal/lib/authRoles";
import {
  DEFAULT_SIGNATORY_DESIGNATION,
  ELECTRONIC_SIGNATORY_LABEL,
  isDefaultSignatoryDesignation,
  isElectronicSignatory,
  isEligibleSignatoryRole,
  signatoryDesignationForRole,
} from "@/components/portal/lib/signatoryDesignation";
import { cn } from "@/components/portal/lib/utils";
import { useAppSelector } from "@/store/hooks";

interface CreateEoiFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  enquiryId?: string;
  eoi?: ExpressionOfInterest;
}

const NONE = "";

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayInputValue() {
  return toDateInputValue(new Date().toISOString());
}

function signatoryIdFromEoi(eoi: ExpressionOfInterest) {
  const userId = eoi.signatory?.userId;
  if (!userId) return NONE;
  return typeof userId === "string" ? userId : String(userId._id || NONE);
}

function joinParts(...parts: Array<string | undefined | null>) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(", ");
}

function enquiryOptionLabel(enquiry: {
  enquiry_number?: string;
  name: string;
  city?: string;
}) {
  const number = enquiry.enquiry_number ? `${enquiry.enquiry_number} — ` : "";
  const city = enquiry.city ? ` (${enquiry.city})` : "";
  return `${number}${enquiry.name}${city}`;
}

export function CreateEoiForm({
  open,
  onOpenChange,
  onComplete,
  enquiryId: presetEnquiryId,
  eoi,
}: CreateEoiFormProps) {
  const [enquiryId, setEnquiryId] = useState(presetEnquiryId || NONE);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [signatoryId, setSignatoryId] = useState(NONE);
  const [signatoryDesignation, setSignatoryDesignation] = useState("");
  const [electronicSignOff, setElectronicSignOff] = useState(true);
  const [signatoryOpen, setSignatoryOpen] = useState(false);
  const [eoiDate, setEoiDate] = useState("");
  const [designation, setDesignation] = useState("");
  const [organization, setOrganization] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [salutation, setSalutation] = useState(DEFAULT_EOI_SALUTATION);
  const [body, setBody] = useState("");
  const [complimentaryClose, setComplimentaryClose] = useState(DEFAULT_EOI_CLOSE);
  const [editorKey, setEditorKey] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>();
  const signatoryTriggerRef = useRef<HTMLButtonElement>(null);
  const [signatoryPopoverWidth, setSignatoryPopoverWidth] = useState<number | undefined>();

  const currentUser = useAppSelector((state) => state.auth.user);
  const { data: enquiriesRes } = useGetEnquiriesQuery(undefined, { skip: !open });
  const { data: signatoriesRes } = useGetEoiSignatoriesQuery(undefined, { skip: !open });
  const enquiries = enquiriesRes?.data ?? [];
  const signatories = useMemo(
    () =>
      (signatoriesRes?.data ?? []).filter((user) => isEligibleSignatoryRole(user.role)),
    [signatoriesRes?.data],
  );
  const [createEoi, { isLoading: creating }] = useCreateEoiMutation();
  const [updateEoi, { isLoading: updating }] = useUpdateEoiMutation();
  const isEdit = Boolean(eoi);
  const isLoading = creating || updating;
  const prefillKeyRef = useRef("");

  const activeEnquiries = useMemo(
    () =>
      enquiries.filter(
        (enquiry) =>
          !TERMINAL_ENQUIRY_STATUSES.has(pipelineStatusValue(enquiry.enquiry_status)),
      ),
    [enquiries],
  );

  const selectedEnquiry = useMemo(
    () =>
      enquiries.find((enquiry) => enquiry._id === enquiryId) ||
      activeEnquiries.find((enquiry) => enquiry._id === enquiryId),
    [enquiries, activeEnquiries, enquiryId],
  );

  const selectedSignatory = useMemo(
    () => signatories.find((user) => user._id === signatoryId),
    [signatories, signatoryId],
  );

  const presetBlocked =
    Boolean(presetEnquiryId) &&
    enquiries.length > 0 &&
    !activeEnquiries.some((enquiry) => enquiry._id === presetEnquiryId);

  const isStandalone = !enquiryId && !presetBlocked;

  useEffect(() => {
    if (!open) {
      prefillKeyRef.current = "";
      return;
    }
    setEnquiryOpen(false);
    setSignatoryOpen(false);
    if (eoi) {
      setEnquiryId(eoiEnquiryId(eoi) || NONE);
      setSignatoryId(signatoryIdFromEoi(eoi));
      setSignatoryDesignation(eoi.signatory?.designation || "");
      setElectronicSignOff(isElectronicSignatory(eoi.signatory));
      setEoiDate(toDateInputValue(eoi.eoiDate) || todayInputValue());
      setDesignation(eoi.recipient?.designation || "");
      setOrganization(eoi.recipient?.organization || "");
      setAddress(eoi.recipient?.address || "");
      setEmail(eoi.recipient?.email || "");
      setPhone(eoi.recipient?.phone || "");
      setSubject(eoi.subject || "");
      setSalutation(eoi.salutation || DEFAULT_EOI_SALUTATION);
      setBody(eoiBodyForEditor(eoi.body));
      setComplimentaryClose(eoi.complimentaryClose || DEFAULT_EOI_CLOSE);
      setEditorKey((key) => key + 1);
      return;
    }

    setEnquiryId(presetEnquiryId || NONE);
    const selfIsSignatory = Boolean(
      currentUser?._id && isEligibleSignatoryRole(currentUser.role),
    );
    setSignatoryId(selfIsSignatory ? currentUser?._id ?? NONE : NONE);
    setSignatoryDesignation(
      selfIsSignatory ? signatoryDesignationForRole(currentUser?.role) : DEFAULT_SIGNATORY_DESIGNATION,
    );
    setElectronicSignOff(true);
    setEoiDate(todayInputValue());
    setSalutation(DEFAULT_EOI_SALUTATION);
    setComplimentaryClose(DEFAULT_EOI_CLOSE);
  }, [open, eoi, presetEnquiryId, currentUser?._id, currentUser?.role]);

  useEffect(() => {
    if (!open || eoi) return;
    if (enquiryId && !selectedEnquiry) return;
    const enquiry = selectedEnquiry;
    const prefillKey = `create:${enquiryId || ""}:${enquiry?._id || ""}`;
    if (prefillKeyRef.current === prefillKey) return;
    prefillKeyRef.current = prefillKey;

    const reps = getEnquiryClientRepresentatives(enquiry);
    const primary = reps[0];
    setDesignation(enquiry?.client_representative || primary?.name || "The Chief Executive Officer");
    setOrganization(enquiry?.name || "");
    setAddress(joinParts(enquiry?.address, enquiry?.city));
    setEmail(enquiry?.client_email || primary?.email || "");
    setPhone(enquiry?.client_contact_number || primary?.contact_number || "");
    setSubject(defaultEoiSubject(enquiry));
    setBody(defaultEoiBody(enquiry));
    setEditorKey((key) => key + 1);
  }, [open, eoi, enquiryId, selectedEnquiry]);

  useEffect(() => {
    if (!enquiryOpen) return;
    const el = triggerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setPopoverWidth(el.offsetWidth));
    observer.observe(el);
    setPopoverWidth(el.offsetWidth);
    return () => observer.disconnect();
  }, [enquiryOpen]);

  useEffect(() => {
    if (!signatoryOpen) return;
    const el = signatoryTriggerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSignatoryPopoverWidth(el.offsetWidth));
    observer.observe(el);
    setSignatoryPopoverWidth(el.offsetWidth);
    return () => observer.disconnect();
  }, [signatoryOpen]);

  const handleSubmit = async () => {
    if (!designation.trim() || !organization.trim()) {
      toast.error("Recipient designation and organization are required.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (isEmptyRichHtml(body)) {
      toast.error("Letter body is required.");
      return;
    }
    if (!signatoryId) {
      toast.error("Select a signatory.");
      return;
    }

    const payload = {
      ...(enquiryId && !isEdit ? { enquiryId } : {}),
      eoiDate: eoiDate || undefined,
      subject: subject.trim(),
      salutation: salutation.trim() || DEFAULT_EOI_SALUTATION,
      body: sanitizeRichHtml(body),
      complimentaryClose: complimentaryClose.trim() || DEFAULT_EOI_CLOSE,
      recipient: {
        designation: designation.trim(),
        organization: organization.trim(),
        address: address.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
      signatory: {
        electronic: electronicSignOff,
        userId: signatoryId,
        name: selectedSignatory?.name,
        designation:
          signatoryDesignation.trim() ||
          signatoryDesignationForRole(selectedSignatory?.role) ||
          undefined,
        phone: selectedSignatory?.phone,
      },
    };

    try {
      await toastHandler({
        loading: isEdit ? "Updating EOI…" : "Creating EOI…",
        success: isEdit ? "EOI updated." : "EOI created.",
        action: () =>
          isEdit && eoi
            ? updateEoi({ id: eoi._id, ...payload }).unwrap()
            : createEoi(payload).unwrap(),
      });
      onOpenChange(false);
      onComplete();
    } catch {
      /* toastHandler already surfaced the error */
    }
  };

  const canSubmit =
    Boolean(designation.trim()) &&
    Boolean(organization.trim()) &&
    Boolean(subject.trim()) &&
    !isEmptyRichHtml(body) &&
    Boolean(signatoryId) &&
    (isEdit || !presetBlocked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit EOI" : "Create EOI"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Enquiry</Label>
            <Popover open={enquiryOpen} onOpenChange={setEnquiryOpen} modal>
              <PopoverTrigger asChild>
                <button
                  ref={triggerRef}
                  type="button"
                  role="combobox"
                  aria-expanded={enquiryOpen}
                  disabled={Boolean(presetEnquiryId) || isEdit}
                  className={cn(
                    "flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs",
                    "transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    Boolean(presetEnquiryId) || isEdit ? "cursor-not-allowed opacity-70" : "",
                  )}
                >
                  <span className={cn("truncate text-left", !selectedEnquiry && !eoi?.enquiryId && "text-muted-foreground")}>
                    {selectedEnquiry
                      ? enquiryOptionLabel(selectedEnquiry)
                      : eoi?.enquiryId
                        ? eoiEnquiryLabel(eoi)
                        : "Create directly — no enquiry"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="p-0"
                style={{ width: popoverWidth ? `${popoverWidth}px` : undefined }}
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <Command>
                  <CommandInput placeholder="Search enquiry number, name, city…" />
                  <CommandList>
                    <CommandEmpty>No active enquiries found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="create directly no enquiry standalone"
                        onSelect={() => {
                          setEnquiryId(NONE);
                          setEnquiryOpen(false);
                        }}
                      >
                        <Check className={cn("h-4 w-4", isStandalone ? "opacity-100" : "opacity-0")} />
                        <span className="font-medium">Create directly — no enquiry</span>
                      </CommandItem>
                      {activeEnquiries.map((enquiry) => (
                        <CommandItem
                          key={enquiry._id}
                          value={enquirySearchHaystack(enquiry)}
                          onSelect={() => {
                            setEnquiryId(enquiry._id);
                            setEnquiryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              enquiryId === enquiry._id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {enquiryOptionLabel(enquiry)}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {enquiryStatusLabel(enquiry.enquiry_status)}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Optional. Only enquiries still in the pipeline can be linked — won, lost, and dropped leads are hidden.
            </p>
            {presetBlocked && (
              <p className="text-xs text-destructive">
                This enquiry is won, lost, or dropped, so an EOI cannot be created for it.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={eoiDate}
              onChange={(event) => setEoiDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>To (designation)</Label>
            <Input
              value={designation}
              onChange={(event) => setDesignation(event.target.value)}
              placeholder="The Chief Executive Officer"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Organization</Label>
            <Input
              value={organization}
              onChange={(event) => setOrganization(event.target.value)}
              placeholder="Cantonment Board, Delhi Cantonment"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              rows={2}
              placeholder="Optional address"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="recipient@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Submission of Expression of Interest (EOI)…"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Salutation</Label>
            <Input
              value={salutation}
              onChange={(event) => setSalutation(event.target.value)}
              placeholder="Dear Sir,"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Letter body</Label>
            <RichTextEditor
              key={editorKey}
              value={body}
              onChange={setBody}
              placeholder="Write the covering letter…"
              className="min-h-[12rem]"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Complimentary close</Label>
            <Textarea
              value={complimentaryClose}
              onChange={(event) => setComplimentaryClose(event.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Signatory</Label>
            <Popover open={signatoryOpen} onOpenChange={setSignatoryOpen} modal>
              <PopoverTrigger asChild>
                <button
                  ref={signatoryTriggerRef}
                  type="button"
                  role="combobox"
                  aria-expanded={signatoryOpen}
                  className={cn(
                    "flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs",
                    "transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  )}
                >
                  <span className={cn("truncate text-left", !selectedSignatory && "text-muted-foreground")}>
                    {selectedSignatory
                      ? `${selectedSignatory.name} (${formatRoleLabel(selectedSignatory.role)})`
                      : "Select admin, super admin, or manager"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="p-0"
                style={{ width: signatoryPopoverWidth ? `${signatoryPopoverWidth}px` : undefined }}
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <Command>
                  <CommandInput placeholder="Search name, email, or role…" />
                  <CommandList>
                    <CommandEmpty>No eligible signatories found.</CommandEmpty>
                    <CommandGroup>
                      {signatories.map((user) => (
                        <CommandItem
                          key={user._id}
                          value={`${user.name} ${user.email ?? ""} ${user.role} ${formatRoleLabel(user.role)}`}
                          onSelect={() => {
                            setSignatoryId(user._id);
                            setSignatoryDesignation((current) =>
                              isDefaultSignatoryDesignation(current)
                                ? signatoryDesignationForRole(user.role)
                                : current,
                            );
                            setSignatoryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              signatoryId === user._id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">{user.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatRoleLabel(user.role)}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Authorized signatory must be an admin, super admin, or manager.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Signatory designation</Label>
            <Input
              value={signatoryDesignation}
              onChange={(event) => setSignatoryDesignation(event.target.value)}
              placeholder="Director"
            />
            <p className="text-xs text-muted-foreground">
              Printed under the signatory name on the EOI letter.
            </p>
          </div>
          <label className="flex items-start gap-2 sm:col-span-2">
            <Checkbox
              checked={electronicSignOff}
              onCheckedChange={(checked) => setElectronicSignOff(checked === true)}
              className="mt-0.5"
            />
            <span>
              <span className="text-sm font-medium">{ELECTRONIC_SIGNATORY_LABEL}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Prints a note that the letter does not require a signature. The signatory name, designation, and phone still appear.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
            {isLoading ? "Saving…" : isEdit ? "Save changes" : "Create EOI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
