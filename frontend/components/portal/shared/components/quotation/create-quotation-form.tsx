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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
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
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGetEnquiriesQuery } from "@/store/slices/enquiryApiSlice";
import {
  useCreateQuotationMutation,
  useGetQuotationSignatoriesQuery,
  useUpdateQuotationMutation,
  type Quotation,
  type QuotationItemInput,
  type QuotationTaxType,
} from "@/store/slices/quotationApiSlice";
import { useGetTermsConditionsQuery } from "@/store/slices/termsConditionsApiSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import { formatInr, quotationEnquiryId, quotationEnquiryLabel } from "@/components/portal/lib/quotationConstants";
import {
  TERMINAL_ENQUIRY_STATUSES,
  enquiryStatusLabel,
  pipelineStatusValue,
} from "@/components/portal/lib/enquiryConstants";
import { enquirySearchHaystack } from "@/components/portal/lib/enquirySearchHaystack";
import { hydrateEnquiryRequestedAudits } from "@/components/portal/shared/components/enquiry/enquiry-requested-audits-fields";
import { formatRoleLabel } from "@/components/portal/lib/authRoles";
import {
  DEFAULT_SIGNATORY_DESIGNATION,
  ELECTRONIC_SIGNATORY_LABEL,
  isDefaultSignatoryDesignation,
  isElectronicSignatory,
  signatoryDesignationForRole,
} from "@/components/portal/lib/signatoryDesignation";
import { cn } from "@/components/portal/lib/utils";
import { useAppSelector } from "@/store/hooks";

interface CreateQuotationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  enquiryId?: string;
  quotation?: Quotation;
}

type LineItemDraft = {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  rate: string;
};

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

function signatoryIdFromQuotation(quotation: Quotation) {
  const userId = quotation.signatory?.userId;
  if (!userId) return NONE;
  return typeof userId === "string" ? userId : String(userId._id || NONE);
}

function emptyItem(): LineItemDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    quantity: "1",
    unit: "Nos",
    rate: "",
  };
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

export function CreateQuotationForm({
  open,
  onOpenChange,
  onComplete,
  enquiryId: presetEnquiryId,
  quotation,
}: CreateQuotationFormProps) {
  const [enquiryId, setEnquiryId] = useState(presetEnquiryId || NONE);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [signatoryId, setSignatoryId] = useState(NONE);
  const [signatoryDesignation, setSignatoryDesignation] = useState("");
  const [electronicSignOff, setElectronicSignOff] = useState(true);
  const [signatoryOpen, setSignatoryOpen] = useState(false);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);
  const [termsOpen, setTermsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [taxType, setTaxType] = useState<QuotationTaxType>("intra");
  const [items, setItems] = useState<LineItemDraft[]>([emptyItem()]);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerKindAttn, setCustomerKindAttn] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>();
  const signatoryTriggerRef = useRef<HTMLButtonElement>(null);
  const [signatoryPopoverWidth, setSignatoryPopoverWidth] = useState<number | undefined>();
  const termsTriggerRef = useRef<HTMLButtonElement>(null);
  const [termsPopoverWidth, setTermsPopoverWidth] = useState<number | undefined>();

  const currentUser = useAppSelector((state) => state.auth.user);
  const { data: enquiriesRes } = useGetEnquiriesQuery(undefined, { skip: !open });
  const { data: signatoriesRes } = useGetQuotationSignatoriesQuery(undefined, { skip: !open });
  const { data: termsRes } = useGetTermsConditionsQuery(undefined, { skip: !open });
  const enquiries = enquiriesRes?.data ?? [];
  const signatories = signatoriesRes?.data ?? [];
  const termsSets = termsRes?.data ?? [];
  const [createQuotation, { isLoading: creating }] = useCreateQuotationMutation();
  const [updateQuotation, { isLoading: updating }] = useUpdateQuotationMutation();
  const isEdit = Boolean(quotation);
  const isLoading = creating || updating;

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

  const selectedTerms = useMemo(
    () => termsSets.filter((set) => selectedTermIds.includes(set._id)),
    [termsSets, selectedTermIds],
  );

  const termsFieldLabel =
    selectedTerms.length === 0
      ? "No terms selected"
      : selectedTerms.length === termsSets.length
        ? `All terms (${termsSets.length})`
        : selectedTerms.map((set) => set.title).join(", ");

  const toggleTermId = (id: string) => {
    setSelectedTermIds((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id],
    );
  };

  const presetBlocked =
    Boolean(presetEnquiryId) &&
    enquiries.length > 0 &&
    !activeEnquiries.some((enquiry) => enquiry._id === presetEnquiryId);

  const isStandalone = !enquiryId && !presetBlocked;
  const showCustomerFields = isStandalone || isEdit;

  useEffect(() => {
    if (!open) return;
    setEnquiryOpen(false);
    setSignatoryOpen(false);
    setTermsOpen(false);
    if (quotation) {
      setEnquiryId(quotationEnquiryId(quotation) || NONE);
      setSignatoryId(signatoryIdFromQuotation(quotation));
      setSignatoryDesignation(quotation.signatory?.designation || "");
      setElectronicSignOff(isElectronicSignatory(quotation.signatory));
      setSubject(quotation.subject || "");
      setValidUntil(toDateInputValue(quotation.validUntil));
      setGstRate(String(quotation.financials?.gstRate ?? 18));
      setTaxType(quotation.financials?.taxType || "intra");
      setItems(
        quotation.items?.length
          ? quotation.items.map((item) => ({
              key: `${item.srNo}-${item.description}`,
              description: item.description || "",
              quantity: String(item.quantity ?? 1),
              unit: item.unit || "Nos",
              rate: String(item.rate ?? ""),
            }))
          : [emptyItem()],
      );
      setCustomerName(quotation.customer?.name || "");
      setCustomerAddress(quotation.customer?.address || "");
      setCustomerKindAttn(quotation.customer?.kindAttn || "");
      setCustomerEmail(quotation.customer?.email || "");
      setCustomerPhone(quotation.customer?.phone || quotation.customer?.mobile || "");
      setCustomerGstin(quotation.customer?.gstin || "");
      return;
    }
    setEnquiryId(presetEnquiryId || NONE);
    const selfIsSignatory = Boolean(
      currentUser?._id &&
        ["super_admin", "admin", "manager"].includes(currentUser.role),
    );
    setSignatoryId(selfIsSignatory ? currentUser?._id ?? NONE : NONE);
    setSignatoryDesignation(
      selfIsSignatory ? signatoryDesignationForRole(currentUser?.role) : DEFAULT_SIGNATORY_DESIGNATION,
    );
    setElectronicSignOff(true);
    setSubject("");
    setValidUntil("");
    setGstRate("18");
    setTaxType("intra");
    setItems([emptyItem()]);
    setCustomerName("");
    setCustomerAddress("");
    setCustomerKindAttn("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerGstin("");
  }, [open, quotation, presetEnquiryId, currentUser?._id, currentUser?.role]);

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

  useEffect(() => {
    if (!termsOpen) return;
    const el = termsTriggerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setTermsPopoverWidth(el.offsetWidth));
    observer.observe(el);
    setTermsPopoverWidth(el.offsetWidth);
    return () => observer.disconnect();
  }, [termsOpen]);

  useEffect(() => {
    if (!open) return;
    const library = termsRes?.data ?? [];
    if (quotation) {
      const snapshotTitles = new Set(
        (quotation.termsAndConditions ?? []).map((term) => term.title),
      );
      setSelectedTermIds(
        library.filter((set) => snapshotTitles.has(set.title)).map((set) => set._id),
      );
      return;
    }
    setSelectedTermIds(library.map((set) => set._id));
  }, [open, termsRes?.data, quotation]);

  useEffect(() => {
    if (!open || !selectedEnquiry || quotation) return;
    setSubject(
      `Quotation for ${selectedEnquiry.name}${selectedEnquiry.city ? ` — ${selectedEnquiry.city}` : ""}`,
    );
    // Each requested audit becomes a line item priced at its expected value.
    const requestedAudits = hydrateEnquiryRequestedAudits(selectedEnquiry);
    if (requestedAudits.length > 0) {
      setItems(
        requestedAudits.map((audit) => ({
          ...emptyItem(),
          description: audit.audit_type,
          rate: Number(audit.expected_value) > 0 ? audit.expected_value : "",
        })),
      );
    }
  }, [open, selectedEnquiry?._id, quotation]);

  const previewSubtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return sum + quantity * rate;
  }, 0);
  const previewGst = previewSubtotal * ((Number(gstRate) || 0) / 100);
  const previewTotal = previewSubtotal + previewGst;

  const hasValidItems = items.some(
    (item) =>
      item.description.trim() &&
      Number(item.quantity) >= 0 &&
      Number(item.rate) >= 0 &&
      item.rate !== "",
  );

  const updateItem = (key: string, patch: Partial<LineItemDraft>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const handleSubmit = async () => {
    const payloadItems: QuotationItemInput[] = items
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim() || "Nos",
        rate: Number(item.rate),
      }))
      .filter((item) => item.description && Number.isFinite(item.quantity) && Number.isFinite(item.rate));

    if (payloadItems.length === 0) {
      toast.error("Add at least one line item with a description and rate.");
      return;
    }

    if (showCustomerFields) {
      if (!subject.trim()) {
        toast.error("Subject is required.");
        return;
      }
      if (!customerName.trim() || !customerAddress.trim()) {
        toast.error("Customer name and address are required.");
        return;
      }
    }

    if (!signatoryId) {
      toast.error("Select a signatory.");
      return;
    }

    const payload = {
      ...(enquiryId && !isEdit ? { enquiryId } : {}),
      subject: subject.trim() || undefined,
      validUntil: validUntil || undefined,
      financials: {
        gstRate: Number(gstRate) || 18,
        taxType,
      },
      items: payloadItems,
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
      termsConditionsIds: selectedTermIds,
      ...(showCustomerFields
        ? {
            customer: {
              name: customerName.trim(),
              address: customerAddress.trim(),
              kindAttn: customerKindAttn.trim(),
              email: customerEmail.trim(),
              phone: customerPhone.trim(),
              gstin: customerGstin.trim(),
            },
          }
        : {}),
    };

    await toastHandler({
      loading: isEdit ? "Updating quotation…" : "Creating quotation…",
      success: isEdit ? "Quotation updated." : "Quotation created.",
      action: () =>
        isEdit && quotation
          ? updateQuotation({ id: quotation._id, ...payload }).unwrap()
          : createQuotation(payload).unwrap(),
    });

    onOpenChange(false);
    onComplete();
  };

  const canSubmit =
    hasValidItems &&
    Boolean(signatoryId) &&
    (!showCustomerFields || (Boolean(subject.trim()) && Boolean(customerName.trim()) && Boolean(customerAddress.trim())));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit quotation" : "Create quotation"}</DialogTitle>
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
                  <span className={cn("truncate text-left", !selectedEnquiry && !quotation?.enquiryId && "text-muted-foreground")}>
                    {selectedEnquiry
                      ? enquiryOptionLabel(selectedEnquiry)
                      : quotation?.enquiryId
                        ? quotationEnquiryLabel(quotation)
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
                This enquiry is won, lost, or dropped, so a quotation cannot be created for it.
              </p>
            )}
          </div>

          {showCustomerFields && (
            <>
              <div className="space-y-1.5">
                <Label>Customer name</Label>
                <Input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Customer / organisation"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kind attn</Label>
                <Input
                  value={customerKindAttn}
                  onChange={(event) => setCustomerKindAttn(event.target.value)}
                  placeholder="Contact person"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Customer address</Label>
                <Textarea
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress(event.target.value)}
                  placeholder="Billing / site address"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="customer@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Contact number"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>GSTIN</Label>
                <Input
                  value={customerGstin}
                  onChange={(event) => setCustomerGstin(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </>
          )}

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
                          <span className="min-w-0 flex-1 truncate">
                            {user.name}
                            {user.email ? (
                              <span className="text-muted-foreground"> · {user.email}</span>
                            ) : null}
                          </span>
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
              Printed under the signatory name on the quotation PDF.
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
                Prints a note that the quotation does not require a signature. The signatory name, designation, and phone still appear.
              </span>
            </span>
          </label>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Terms & conditions</Label>
            <Popover open={termsOpen} onOpenChange={setTermsOpen} modal>
              <PopoverTrigger asChild>
                <button
                  ref={termsTriggerRef}
                  type="button"
                  role="combobox"
                  aria-expanded={termsOpen}
                  className={cn(
                    "flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-xs",
                    "transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  )}
                >
                  <span
                    className={cn(
                      "truncate text-left",
                      selectedTerms.length === 0 && "text-muted-foreground",
                    )}
                  >
                    {termsSets.length === 0 ? "No terms & conditions yet" : termsFieldLabel}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="p-0"
                style={{ width: termsPopoverWidth ? `${termsPopoverWidth}px` : undefined }}
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <Command>
                  <CommandInput placeholder="Search terms & conditions…" />
                  <CommandList>
                    <CommandEmpty>No terms & conditions found.</CommandEmpty>
                    {termsSets.length > 0 && (
                      <CommandGroup>
                        <CommandItem
                          value="select all terms"
                          onSelect={() =>
                            setSelectedTermIds(
                              selectedTermIds.length === termsSets.length
                                ? []
                                : termsSets.map((set) => set._id),
                            )
                          }
                        >
                          <Check
                            className={cn(
                              "h-4 w-4",
                              selectedTermIds.length === termsSets.length
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="font-medium">
                            {selectedTermIds.length === termsSets.length
                              ? "Clear all"
                              : "Select all"}
                          </span>
                        </CommandItem>
                        {termsSets.map((set) => (
                          <CommandItem
                            key={set._id}
                            value={`${set.title} ${set.lines.length} lines`}
                            onSelect={() => toggleTermId(set._id)}
                          >
                            <Check
                              className={cn(
                                "h-4 w-4",
                                selectedTermIds.includes(set._id) ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate">{set.title}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {set.lines.length} {set.lines.length === 1 ? "line" : "lines"}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Selected sets are copied onto the quotation. Leave none selected to create without terms.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Quotation subject"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Valid until</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>GST rate (%)</Label>
            <Input
              type="number"
              min={0}
              value={gstRate}
              onChange={(event) => setGstRate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tax type</Label>
            <Select value={taxType} onValueChange={(value) => setTaxType(value as QuotationTaxType)}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intra">CGST + SGST</SelectItem>
                <SelectItem value="inter">IGST</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Line items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((current) => [...current, emptyItem()])}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add item
            </Button>
          </div>

          {enquiryId ? (
            <p className="text-xs text-muted-foreground">
              Audit line items are priced from the enquiry&apos;s requested audits, and
              saving writes the quoted amounts back to the enquiry.
            </p>
          ) : null}

          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.key}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_80px_80px_110px_auto]"
              >
                <Input
                  placeholder={`Description ${index + 1}`}
                  value={item.description}
                  onChange={(event) => updateItem(item.key, { description: event.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                />
                <Input
                  placeholder="Unit"
                  value={item.unit}
                  onChange={(event) => updateItem(item.key, { unit: event.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="Rate"
                  value={item.rate}
                  onChange={(event) => updateItem(item.key, { rate: event.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) => current.filter((row) => row.key !== item.key))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Subtotal {formatInr(previewSubtotal)} · GST {formatInr(previewGst)} · Total{" "}
            <span className="font-medium text-foreground">{formatInr(previewTotal)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isLoading || presetBlocked}>
            {isEdit ? "Save changes" : "Create quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
