"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "@/components/portal/hooks/useParams";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { DataTable, Column } from "@/components/portal/ui/data-table";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/portal/ui/alert-dialog";
import { EnquiryStatusPill } from "@/components/portal/shared/components/enquiry/enquiry-status-pill";
import { EditEnquiryForm } from "@/components/portal/shared/components/enquiry/edit-enquiry-form";
import { canEditEnquiry } from "@/components/portal/lib/enquiryAccess";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import {
  ENQUIRY_STATUS_OPTIONS,
  FOLLOW_UP_MODE_OPTIONS,
  FOLLOW_UP_OUTCOME_OPTIONS,
} from "@/components/portal/lib/enquiryConstants";
import { toastHandler } from "@/components/portal/lib/toast";
import {
  type FollowUp,
  type EnquiryDocument,
  type EnquiryStatus,
  useGetEnquiryByIdQuery,
  useGetFollowUpsQuery,
  useGetEnquiryDocumentsQuery,
  useCreateFollowUpMutation,
  useUpdateFollowUpMutation,
  useDeleteFollowUpMutation,
  useCreateEnquiryDocumentMutation,
  useDeleteEnquiryDocumentMutation,
  useUpdateEnquiryDocumentMutation,
  useUpdateEnquiryMutation,
  useDeleteEnquiryMutation,
} from "@/store/slices/enquiryApiSlice";
import { useAppSelector } from "@/store/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  FileText,
  Send,
  CircleSlash,
  Pencil,
  Trash2,
  Eye,
  Upload,
  X,
  Download,
  Info,
  Image as ImageIcon,
} from "lucide-react";


function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function getTodayDateInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TERMINAL_ENQUIRY_STATUSES = new Set([
  "won",
  "lost",
  "dropped",
]);



function telHref(phone?: string | null) {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length ? `tel:${digits}` : null;
}

function mailtoHref(email?: string | null) {
  const e = email?.trim();
  return e ? `mailto:${encodeURIComponent(e)}` : null;
}

/** Opens WhatsApp chat; assumes India (+91) when only 10 digits are present. */
function whatsappHref(phone?: string | null) {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const wa = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${wa}`;
}

/** Earliest `next_followup_date` across follow-ups for the enquiry snapshot. */
function earliestEnquiryNextFollowDate(
  rows: FollowUp[],
  mode:
    | { type: "create"; newRowNext?: string | null }
    | { type: "update"; followUpId: string; nextIso: string | null },
): string | null {
  const instants: number[] = [];
  for (const r of rows) {
    let raw: string | null | undefined = r.next_followup_date;
    if (mode.type === "update" && r._id === mode.followUpId) {
      raw = mode.nextIso !== null ? mode.nextIso : undefined;
    }
    if (raw) {
      const t = new Date(raw).getTime();
      if (!Number.isNaN(t)) instants.push(t);
    }
  }
  if (mode.type === "create" && mode.newRowNext) {
    const t = new Date(mode.newRowNext).getTime();
    if (!Number.isNaN(t)) instants.push(t);
  }
  if (instants.length === 0) return null;
  return new Date(Math.min(...instants)).toISOString();
}

export default function EnquiryDetailPage() {
  const params = useParams();
  const enquiryId = useMemo(() => {
    const raw = params?.enquiryId;
    return Array.isArray(raw) ? raw[0] : (raw as string) ?? "";
  }, [params?.enquiryId]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") || "details";
  const setTab = (tabValue: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", tabValue);
    router.push(`${pathname}?${nextParams.toString()}`);
  };

  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id?.toString();

  const [fuOpen, setFuOpen] = useState(false);
  const [fuEditing, setFuEditing] = useState<FollowUp | null>(null);
  const [fuDate, setFuDate] = useState("");
  const [fuMode, setFuMode] = useState<string>("");
  const [fuRemarks, setFuRemarks] = useState("");
  const [fuOutcome, setFuOutcome] = useState<string>("");
  const [fuNext, setFuNext] = useState("");

  const [qOpen, setQOpen] = useState(false);
  const [qDocUrl, setQDocUrl] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<EnquiryDocument | null>(null);
  const [qFile, setQFile] = useState<File | null>(null);
  const [qFilePreview, setQFilePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [qCaption, setQCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [closeLeadOpen, setCloseLeadOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<EnquiryDocument["document"] | null>(null);
  const [deleteEnquiry, { isLoading: isDeletingEnquiry }] = useDeleteEnquiryMutation();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setQFile(file);
      if (file.type.startsWith("image/")) {
        setQFilePreview(URL.createObjectURL(file));
      } else {
        setQFilePreview(null);
      }
    }
  };

  const {
    data: enquiryRes,
    isLoading: enquiryLoading,
    isError: enquiryError,
    isFetching: enquiryFetching,
    refetch: refetchEnquiry,
  } = useGetEnquiryByIdQuery(enquiryId, { skip: !enquiryId });

  const { data: fuRes, isLoading: fuLoading } = useGetFollowUpsQuery(
    enquiryId,
    { skip: !enquiryId },
  );

  const { data: qRes, isLoading: qLoading } = useGetEnquiryDocumentsQuery(
    enquiryId,
    { skip: !enquiryId },
  );

  const [createFu, { isLoading: creatingFu }] = useCreateFollowUpMutation();
  const [updateFu, { isLoading: updatingFu }] = useUpdateFollowUpMutation();
  const [deleteFu, { isLoading: deletingFu }] = useDeleteFollowUpMutation();

  const [createQ, { isLoading: creatingQ }] = useCreateEnquiryDocumentMutation();
  const [updateQ, { isLoading: updatingQ }] =
    useUpdateEnquiryDocumentMutation();
  const [deleteQuote, { isLoading: deletingQuote }] =
    useDeleteEnquiryDocumentMutation();

  const [updateEnquiry, { isLoading: updatingLeadStatus }] =
    useUpdateEnquiryMutation();

  const enquiry = enquiryRes?.data;
  const followUps = fuRes?.data ?? [];
  const enquiryDocuments = qRes?.data ?? [];

  const canManage =
    user?.role === "super_admin" || (enquiry && canEditEnquiry(userId, enquiry));

  const canDeleteEnquiry = user?.role === "super_admin";

  const handleDeleteEnquiry = async () => {
    try {
      await toastHandler({
        action: () => deleteEnquiry(enquiryId!).unwrap(),
        loading: "Deleting enquiry...",
        success: "Enquiry deleted successfully.",
      });
      router.push("/enquiries");
    } catch (err) {
      console.error(err);
    }
  };

  const leadIsTerminal =
    enquiry != null && TERMINAL_ENQUIRY_STATUSES.has(enquiry.enquiry_status);

  /** Follow-ups and quotations are blocked once the lead is won / lost / dropped. */
  const canActOnFollowUpsAndQuotes = canManage && !leadIsTerminal;
  const contactTel = telHref(enquiry?.client_contact_number);
  const contactMail = mailtoHref(enquiry?.client_email);
  const contactWa = whatsappHref(enquiry?.client_contact_number);

  const changePipelineStatus = async (next: EnquiryStatus) => {
    if (!enquiryId || !enquiry || next === enquiry.enquiry_status) return;
    try {
      await toastHandler({
        action: () =>
          updateEnquiry({
            id: enquiryId,
            enquiry_status: next,
          }).unwrap(),
        loading: "Updating pipeline…",
        success: "Pipeline status updated.",
      });
    } catch {
      /* toast */
    }
  };

  const submitLead = async () => {
    if (!enquiryId) return;
    try {
      await toastHandler({
        action: () =>
          updateEnquiry({
            id: enquiryId,
            enquiry_status: "won",
          }).unwrap(),
        loading: "Updating lead…",
        success: "Lead submitted — marked as won.",
      });
    } catch {
      /* toast */
    }
  };

  const closeLeadAs = async (status: "lost" | "dropped") => {
    if (!enquiryId) return;
    try {
      await toastHandler({
        action: () =>
          updateEnquiry({
            id: enquiryId,
            enquiry_status: status,
          }).unwrap(),
        loading: "Closing lead…",
        success:
          status === "lost"
            ? "Lead marked as lost."
            : "Lead closed as dropped.",
      });
      setCloseLeadOpen(false);
    } catch {
      /* toast */
    }
  };

  const openCreateFu = () => {
    setFuEditing(null);
    setFuDate(getTodayDateInput());
    setFuMode("");
    setFuRemarks("");
    setFuOutcome("");
    setFuNext("");
    setFuOpen(true);
  };

  const openEditFu = useCallback((row: FollowUp) => {
    setFuEditing(row);
    const fd = new Date(row.followup_date);
    setFuDate(
      Number.isNaN(fd.getTime())
        ? getTodayDateInput()
        : `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, "0")}-${String(fd.getDate()).padStart(2, "0")}`,
    );
    setFuMode(row.mode ?? "");
    setFuRemarks(row.remarks ?? "");
    setFuOutcome(row.outcome ?? "");
    if (row.next_followup_date) {
      const nd = new Date(row.next_followup_date);
      setFuNext(
        Number.isNaN(nd.getTime())
          ? ""
          : `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}-${String(nd.getDate()).padStart(2, "0")}`,
      );
    } else setFuNext("");
    setFuOpen(true);
  }, []);

  const submitFollowUp = async () => {
    if (!canActOnFollowUpsAndQuotes) return;
    if (!enquiryId || !fuDate) return;
    const followup_date = new Date(fuDate);
    if (Number.isNaN(followup_date.getTime())) return;
    const nextFollow =
      fuNext.trim() === ""
        ? undefined
        : new Date(fuNext).getTime()
          ? new Date(fuNext).toISOString()
          : undefined;

    const body = {
      followup_date: followup_date.toISOString(),
      mode: (fuMode || undefined) as FollowUp["mode"],
      remarks: fuRemarks.trim() || undefined,
      outcome: (fuOutcome || undefined) as FollowUp["outcome"],
      next_followup_date: fuEditing
        ? fuNext.trim() === ""
          ? null
          : nextFollow ?? null
        : nextFollow,
    };

    const editing = fuEditing;

    try {
      await toastHandler({
        action: async () => {
          if (editing) {
            await updateFu({
              enquiryId,
              followUpId: editing._id,
              ...body,
            }).unwrap();
            const nextIso = earliestEnquiryNextFollowDate(followUps, {
              type: "update",
              followUpId: editing._id,
              nextIso: fuNext.trim() === "" ? null : nextFollow ?? null,
            });
            await updateEnquiry({
              id: enquiryId,
              next_followup_date: nextIso,
            }).unwrap();
          } else {
            await createFu({ enquiryId, ...body }).unwrap();
            const nextIso = earliestEnquiryNextFollowDate(followUps, {
              type: "create",
              newRowNext: nextFollow ?? null,
            });
            await updateEnquiry({
              id: enquiryId,
              next_followup_date: nextIso,
            }).unwrap();
          }
        },
        loading: editing ? "Updating follow-up…" : "Creating follow-up…",
        success: editing ? "Follow-up saved." : "Follow-up added.",
      });
      setFuOpen(false);
      setFuEditing(null);
    } catch {
      /* toast */
    }
  };

  const openCreateQuote = () => {
    setQDocUrl("");
    setQFile(null);
    if (qFilePreview) {
      URL.revokeObjectURL(qFilePreview);
      setQFilePreview(null);
    }
    setQCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setQOpen(true);
  };

  const submitQuote = async () => {
    if (!canActOnFollowUpsAndQuotes) return;
    if (!enquiryId) return;

    try {
      await toastHandler({
        action: () =>
          createQ({
            enquiryId,
            document_url: qDocUrl.trim() || undefined,
            file: qFile || undefined,
            caption: qCaption.trim() || undefined,
          }).unwrap(),
        loading: "Adding document…",
        success: "Document added.",
      });
      if (qFilePreview) {
        URL.revokeObjectURL(qFilePreview);
        setQFilePreview(null);
      }
      setQFile(null);
      setQOpen(false);
    } catch {
      /* toast */
    }
  };



  const quoteBusy = creatingQ || updatingQ || deletingQuote;

  const followUpColumns: Column<FollowUp>[] = useMemo(
    () => [
      {
        key: "followup_date",
        header: "When",
        render: (row) => formatShortDate(row.followup_date),
      },
      {
        key: "mode",
        header: "Mode",
        hideOnMobile: true,
        render: (row) => row.mode ?? "—",
      },
      {
        key: "outcome",
        header: "Outcome",
        hideOnMobile: true,
        render: (row) =>
          row.outcome ? row.outcome.replace(/_/g, " ") : "—",
      },
      {
        key: "remarks",
        header: "Remarks",
        render: (row) => (
          <span className="line-clamp-2 max-w-[220px] text-sm">
            {row.remarks || "—"}
          </span>
        ),
      },
      ...(canActOnFollowUpsAndQuotes
        ? [
            {
              key: "actions",
              header: "Actions",
              render: (row: FollowUp) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditFu(row)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              ),
            } as Column<FollowUp>,
          ]
        : []),
    ],
    [canActOnFollowUpsAndQuotes, openEditFu],
  );

  const enquiryDocumentColumns: Column<EnquiryDocument>[] = useMemo(() => {
    const cols: Column<EnquiryDocument>[] = [
      {
        key: "document_number",
        header: "Number",
        render: (row) => row.document_number || "—",
      },
      {
        key: "document",
        header: "Document",
        render: (row) =>
          row.document?.fileUrl ? (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setPreviewDoc(row.document)}
                className="text-primary hover:underline font-medium text-sm text-left flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                {row.document.fileName || "Open link"}
              </button>
              {row.document.caption ? (
                <span className="text-xs text-muted-foreground italic">
                  {row.document.caption}
                </span>
              ) : null}
            </div>
          ) : (
            "—"
          ),
      },
    ];

    if (!canActOnFollowUpsAndQuotes) return cols;

    cols.push({
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="destructive"
            size="sm"
            className="h-8"
            disabled={quoteBusy}
            onClick={() => setDeleteDoc(row)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      ),
    });

    return cols;
  }, [canActOnFollowUpsAndQuotes, quoteBusy]);

  const loadingMain =
    !enquiryId || enquiryLoading || (enquiryFetching && !enquiry);

  return (
    <DashboardLayout
      title={enquiry?.name ?? "Enquiry"}
      subtitle={enquiry ? enquiry.city : "Lead details"}
    >
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/enquiries" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            All enquiries
          </Link>
        </Button>
      </div>

      {loadingMain ? (
        <p className="text-sm text-muted-foreground">Loading enquiry…</p>
      ) : enquiryError || !enquiry ? (
        <Card>
          <CardHeader>
            <CardTitle>Enquiry not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This enquiry may have been removed or you do not have access.
            </p>
            <Button asChild variant="outline">
              <Link href="/enquiries">Back to enquiries</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sticky Actions Header */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pb-4 pt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between -mx-4 px-4 sm:-mx-6 sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground truncate max-w-md">
                  {enquiry.name}
                </h1>
                <EnquiryStatusPill status={enquiry.enquiry_status} />
                {enquiry.enquiry_number && (
                  <span className="font-mono text-xs rounded-md bg-muted px-2 py-0.5 border border-border text-muted-foreground">
                    {enquiry.enquiry_number}
                  </span>
                )}
              </div>              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <span>{enquiry.city}</span>
                {enquiry.address && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-sm">{enquiry.address}</span>
                  </>
                )}
              </p>
              
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {contactTel ? (
                  <Button variant="secondary" size="sm" asChild className="h-7 gap-1 px-2.5 text-xs">
                    <a href={contactTel}>
                      <Phone className="h-3 w-3" />
                      Call
                    </a>
                  </Button>
                ) : null}
                {contactMail ? (
                  <Button variant="secondary" size="sm" asChild className="h-7 gap-1 px-2.5 text-xs">
                    <a href={contactMail}>
                      <Mail className="h-3 w-3" />
                      Email
                    </a>
                  </Button>
                ) : null}
                {contactWa ? (
                  <Button variant="secondary" size="sm" asChild className="h-7 gap-1 px-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <a href={contactWa} target="_blank" rel="noopener noreferrer">
                      <WhatsAppGlyph className="h-3 w-3" />
                      WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 md:self-end">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Pipeline status:</span>
                <Select
                  value={enquiry.enquiry_status}
                  onValueChange={(v) => void changePipelineStatus(v as EnquiryStatus)}
                  disabled={!canManage || leadIsTerminal || updatingLeadStatus}
                >
                  <SelectTrigger id="pipeline-status" className="h-9 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENQUIRY_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                {canManage && !leadIsTerminal ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditOpen(true)}
                      className="h-9 gap-1.5 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit enquiry
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSubmitConfirmOpen(true)}
                      disabled={updatingLeadStatus}
                      className="h-9 gap-1.5 text-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Submit lead
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCloseLeadOpen(true)}
                      disabled={updatingLeadStatus}
                      className="h-9 gap-1.5 text-xs border-destructive text-destructive hover:bg-destructive hover:text-white"
                    >
                      <CircleSlash className="h-3.5 w-3.5" />
                      Declined lead
                    </Button>
                  </>
                ) : null}

                {canDeleteEnquiry && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isDeletingEnquiry}
                    className="h-9 gap-1.5 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete enquiry
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Tabs value={currentTab} onValueChange={setTab} className="w-full mt-6">
            <TabsList className="grid h-auto w-full grid-cols-3 p-1 sm:h-9 sm:w-fit sm:max-w-md">
              <TabsTrigger value="details" className="gap-1.5 px-3 py-2 sm:py-1">
                <Info className="h-4 w-4 shrink-0" />
                Details
              </TabsTrigger>
              <TabsTrigger value="followups" className="gap-1.5 px-3 py-2 sm:py-1">
                <MessageSquare className="h-4 w-4 shrink-0" />
                Follow-ups
                <span className="text-muted-foreground text-xs font-normal">({followUps.length})</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5 px-3 py-2 sm:py-1">
                <FileText className="h-4 w-4 shrink-0" />
                Documents
                <span className="text-muted-foreground text-xs font-normal">({enquiryDocuments.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Client Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3.5">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Client Representative</p>
                      <p className="text-sm font-medium mt-0.5">{enquiry.client_representative || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Contact Number</p>
                      <p className="text-sm font-medium mt-0.5">{enquiry.client_contact_number || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Client Email</p>
                      <p className="text-sm font-medium mt-0.5">{enquiry.client_email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Address</p>
                      <p className="text-sm font-medium mt-0.5">{enquiry.address || "—"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Pipeline & Sales Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Enquiry Number</p>
                        <p className="text-sm font-mono mt-0.5">{enquiry.enquiry_number || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Expected Value</p>
                        <p className="text-sm font-semibold text-primary mt-0.5">
                          {enquiry.expected_value != null ? formatInr(enquiry.expected_value) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Next Follow-up</p>
                        <p className="text-sm font-medium mt-0.5">
                          {enquiry.next_followup_date ? formatShortDate(enquiry.next_followup_date) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Lead Source</p>
                        <p className="text-sm font-medium mt-0.5">{enquiry.source?.trim() || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
                        <p className="text-sm font-medium mt-0.5">
                          {enquiry.assigned_to && typeof enquiry.assigned_to === "object"
                            ? enquiry.assigned_to.name ?? enquiry.assigned_to.email
                            : enquiry.assigned_to
                              ? String(enquiry.assigned_to)
                              : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Created By</p>
                        <p className="text-sm font-medium mt-0.5">
                          {enquiry.created_by && typeof enquiry.created_by === "object"
                            ? enquiry.created_by.name ?? enquiry.created_by.email
                            : enquiry.created_by
                              ? String(enquiry.created_by)
                              : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Assigned Admin</p>
                        <p className="text-sm font-medium mt-0.5">
                          {enquiry.assigned_admin_to && typeof enquiry.assigned_admin_to === "object"
                            ? enquiry.assigned_admin_to.name ?? enquiry.assigned_admin_to.email
                            : enquiry.assigned_admin_to
                              ? String(enquiry.assigned_admin_to)
                              : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Created At</p>
                        <p className="text-sm font-medium mt-0.5">
                          {enquiry.created_at
                            ? new Date(enquiry.created_at).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Audit Configuration & Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Requested Audits</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(enquiry.requested_audit_types?.length ?? 0) === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          enquiry.requested_audit_types?.map((t) => (
                            <span
                              key={t}
                              className="inline-flex rounded-md border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium"
                            >
                              {t}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Notes</p>
                      <p className="whitespace-pre-wrap text-sm mt-1 bg-muted/20 p-3 rounded-lg border border-border/50">
                        {enquiry.notes?.trim() || "—"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Facility Conversion</p>
                        <p className="text-sm mt-0.5">
                          {enquiry.is_converted_to_facility ? (
                            <>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Converted</span>
                              {enquiry.converted_facility_id && typeof enquiry.converted_facility_id === "object" ? (
                                <span className="font-medium text-foreground">
                                  {" "}→ {enquiry.converted_facility_id.name}
                                </span>
                              ) : enquiry.converted_facility_id ? (
                                <span className="ml-1 font-mono text-xs text-foreground">
                                  {" "}→ {String(enquiry.converted_facility_id)}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            "Not converted"
                          )}
                        </p>
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground self-end space-y-0.5">
                        <p>Created: {formatShortDate(enquiry.created_at)}</p>
                        <p>Updated: {formatShortDate(enquiry.updated_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="followups" className="mt-4 space-y-4">
              {leadIsTerminal ? (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  This lead is submitted or closed — you cannot add or change
                  follow-ups here.
                </p>
              ) : null}
              {canActOnFollowUpsAndQuotes ? (
                <div className="flex justify-end">
                  <Button size="sm" onClick={openCreateFu}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add follow-up
                  </Button>
                </div>
              ) : null}
              <DataTable<FollowUp>
                columns={followUpColumns}
                data={followUps}
                loading={fuLoading}
                emptyMessage="No follow-ups yet"
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-4 space-y-4">
              {leadIsTerminal ? (
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  This lead is submitted or closed — you cannot add or change
                  documents here.
                </p>
              ) : null}
              {canActOnFollowUpsAndQuotes ? (
                <div className="flex justify-end">
                  <Button size="sm" onClick={openCreateQuote}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add document
                  </Button>
                </div>
              ) : null}
              <DataTable<EnquiryDocument>
                columns={enquiryDocumentColumns}
                data={enquiryDocuments}
                loading={qLoading}
                emptyMessage="No documents yet"
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog
        open={fuOpen}
        onOpenChange={(open) => {
          setFuOpen(open);
          if (!open) setFuEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {fuEditing ? "Edit follow-up" : "New follow-up"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fu-date">Follow-up date *</Label>
              <Input
                id="fu-date"
                type="date"
                value={fuDate}
                onChange={(e) => setFuDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={fuMode || "__"} onValueChange={(v) => setFuMode(v === "__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">—</SelectItem>
                  {FOLLOW_UP_MODE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={fuOutcome || "__"} onValueChange={(v) => setFuOutcome(v === "__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">—</SelectItem>
                  {FOLLOW_UP_OUTCOME_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fu-next">Next follow-up</Label>
              <Input
                id="fu-next"
                type="date"
                value={fuNext}
                onChange={(e) => setFuNext(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fu-remarks">Remarks</Label>
              <Textarea
                id="fu-remarks"
                value={fuRemarks}
                onChange={(e) => setFuRemarks(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFuOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitFollowUp()}
              disabled={
                !fuDate ||
                creatingFu ||
                updatingFu ||
                !canActOnFollowUpsAndQuotes
              }
            >
              {creatingFu || updatingFu ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qOpen} onOpenChange={setQOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Document number is generated automatically. Upload a PDF/image, or record a link.
            </div>

            <div className="space-y-2">
              <Label>File Upload (PDF or Image)</Label>
              {qFile ? (
                <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {qFile.type === "application/pdf" ? (
                        <FileText className="h-4 w-4 shrink-0 text-destructive" />
                      ) : (
                        <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                      )}
                      <span className="truncate text-sm font-medium">{qFile.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setQFile(null);
                        if (qFilePreview) {
                          URL.revokeObjectURL(qFilePreview);
                          setQFilePreview(null);
                        }
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {qFilePreview ? (
                    <div className="mt-2 overflow-hidden rounded-md border border-border bg-background flex justify-center items-center max-h-[160px] p-2">
                      <img
                        src={qFilePreview}
                        alt="Preview"
                        className="object-contain max-h-[140px] w-auto rounded-sm"
                      />
                    </div>
                  ) : qFile.type === "application/pdf" ? (
                    <div className="mt-2 p-4 rounded-md border border-border bg-background flex flex-col items-center justify-center gap-1.5">
                      <FileText className="h-10 w-10 text-destructive" />
                      <span className="text-xs text-muted-foreground font-medium">PDF Document</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`rounded-xl border border-dashed p-6 flex flex-col items-center justify-center gap-2 transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <label
                    htmlFor="enquiry_doc_file"
                    className="flex cursor-pointer flex-col items-center justify-center gap-1.5 text-center w-full h-full"
                  >
                    <Upload className={`h-6 w-6 transition-transform ${dragActive ? "scale-110 text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-semibold text-primary hover:underline">
                      Click to upload file
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      or drag and drop here
                    </span>
                    <span className="text-[9px] text-muted-foreground font-medium mt-1">
                      Supported: JPG, PNG, WEBP, PDF (Max 10MB)
                    </span>
                  </label>
                  <input
                    ref={fileInputRef}
                    id="enquiry_doc_file"
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setQFile(file);
                        if (file.type.startsWith("image/")) {
                          setQFilePreview(URL.createObjectURL(file));
                        } else {
                          setQFilePreview(null);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-doc">Or Document URL</Label>
              <Input
                id="q-doc"
                value={qDocUrl}
                onChange={(e) => setQDocUrl(e.target.value)}
                placeholder="https://…"
                disabled={!!qFile}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-caption">Caption</Label>
              <Input
                id="q-caption"
                value={qCaption}
                onChange={(e) => setQCaption(e.target.value)}
                placeholder="e.g. Approved Document copy"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitQuote()}
              disabled={
                (!qDocUrl.trim() && !qFile) ||
                creatingQ ||
                !canActOnFollowUpsAndQuotes
              }
            >
              {creatingQ ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDoc} onOpenChange={(v) => !v && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This document will be removed from the enquiry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={quoteBusy}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={quoteBusy}
              onClick={async () => {
                if (!deleteDoc) return;
                try {
                  await toastHandler({
                    action: () =>
                      deleteQuote({
                        enquiryId: enquiryId!,
                        enquiryDocumentId: deleteDoc._id,
                      }).unwrap(),
                    loading: "Deleting document…",
                    success: "Document deleted.",
                  });
                  setDeleteDoc(null);
                } catch {
                  /* toast */
                }
              }}
            >
              Delete document
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={closeLeadOpen} onOpenChange={setCloseLeadOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Pick an outcome. Follow-ups and quotations stay read-only after the
              lead is declined.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={updatingLeadStatus}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={updatingLeadStatus}
              onClick={() => void closeLeadAs("lost")}
            >
              Mark as lost
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={updatingLeadStatus}
              onClick={() => void closeLeadAs("dropped")}
            >
              Mark as dropped
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this lead? This will mark the lead as submitted and freeze edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={updatingLeadStatus}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={updatingLeadStatus}
              onClick={async () => {
                await submitLead();
                setSubmitConfirmOpen(false);
              }}
            >
              Confirm submit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this enquiry? This action cannot be undone and will delete all associated follow-ups and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={isDeletingEnquiry}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeletingEnquiry}
              onClick={handleDeleteEnquiry}
            >
              {isDeletingEnquiry ? "Deleting…" : "Delete enquiry"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!previewDoc}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
      >
        <DialogContent className="flex h-[90vh] max-w-6xl w-[95vw] flex-col overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-3 pr-6">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate pr-4 text-left text-base">
                  {previewDoc?.caption || previewDoc?.fileName || "Document Preview"}
                </DialogTitle>
                {previewDoc?.caption && (
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {previewDoc.fileName}
                  </p>
                )}
              </div>
              {previewDoc ? (
                <Button asChild size="sm" variant="secondary" className="shrink-0 gap-2">
                  <a href={toSameOriginFileManagementUrl(previewDoc.fileUrl)} download target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" />
                    Download
                  </a>
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/10 p-4">
            {previewDoc?.fileType === "image" ? (
              <img
                src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                alt={previewDoc.fileName || "Document"}
                className="max-h-full max-w-full rounded-md object-contain"
              />
            ) : previewDoc?.fileType === "pdf" ? (
              <iframe
                src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                className="h-full w-full rounded-md border-0 bg-white"
                title={previewDoc.fileName || "PDF Document"}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <FileText className="size-16 opacity-50" />
                <p>No preview available for this file type.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {user ? (
        <EditEnquiryForm
          open={editOpen}
          onOpenChange={setEditOpen}
          onComplete={() => {
            void refetchEnquiry();
          }}
          enquiryId={enquiryId ?? null}
        />
      ) : null}
    </DashboardLayout>
  );
}
