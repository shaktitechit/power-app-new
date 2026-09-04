"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCw, Send } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/portal/ui/alert-dialog";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/portal/ui/sheet";
import { useCompanyBranding } from "@/components/portal/shared/components/company-branding-provider";
import { EmailAttachmentField } from "@/components/portal/shared/components/email-attachment-field";
import { useGetDefaultCompanyQuery } from "@/store/slices/companyApiSlice";
import { useAppSelector } from "@/store/hooks";
import { useGetGraphMailSendersQuery } from "@/store/slices/messageApiSlice";
import {
  type ExpressionOfInterest,
  useSendEoiEmailMutation,
} from "@/store/slices/eoiApiSlice";
import { buildEoiPdfBlob, eoiPdfFilename } from "@/components/portal/lib/eoiPdf";
import { toastHandler } from "@/components/portal/lib/toast";
import { toast } from "sonner";

function defaultSubject(eoi: ExpressionOfInterest) {
  return `Expression of Interest ${eoi.eoiRef}${eoi.subject ? ` — ${eoi.subject}` : ""}`;
}

function defaultBody(eoi: ExpressionOfInterest, senderName?: string, resend = false) {
  const name = eoi.recipient?.designation || eoi.recipient?.organization || "Sir / Madam";
  const signatoryName = String(senderName || eoi.signatory?.name || "").trim();
  const signatoryDesignation = String(eoi.signatory?.designation || "").trim();
  const lines = [
    `Dear ${name},`,
    "",
    resend
      ? `Please find attached our Expression of Interest ${eoi.eoiRef}${eoi.subject ? ` regarding ${eoi.subject}` : ""} again for your reference.`
      : `Please find attached our Expression of Interest ${eoi.eoiRef}${eoi.subject ? ` regarding ${eoi.subject}` : ""}.`,
    "",
    "We look forward to your confirmation.",
    "",
    "Regards,",
  ];
  if (signatoryName) lines.push(signatoryName);
  if (signatoryDesignation) lines.push(signatoryDesignation);
  return lines.join("\n");
}

function eoiSignatoryEmail(eoi: ExpressionOfInterest) {
  const userId = eoi.signatory?.userId;
  if (userId && typeof userId === "object") {
    return String(userId.email || "").trim().toLowerCase();
  }
  return "";
}

type SendEmailMode = "send" | "resend";

export function EoiSendEmailPanel({
  eoi,
  open,
  onOpenChange,
  mode = "send",
}: {
  eoi: ExpressionOfInterest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: SendEmailMode;
}) {
  const isResend = mode === "resend";
  const { displayName, logoSrc, primaryColor } = useCompanyBranding();
  const { data: companyRes } = useGetDefaultCompanyQuery();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { data: sendersRes } = useGetGraphMailSendersQuery(undefined, { skip: !open });
  const tenantSenders = sendersRes?.data ?? [];
  const [sendEoiEmail, { isLoading: sending }] = useSendEoiEmailMutation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const attachment = uploadedFile ?? pdfFile;

  useEffect(() => {
    if (!open) return;
    setTo(eoi.recipient?.email || "");
    setCc("");
    setSubject(isResend ? `Re: ${defaultSubject(eoi)}` : defaultSubject(eoi));
    setBody(defaultBody(eoi, eoi.signatory?.name, isResend));
    setPdfFile(null);
    setUploadedFile(null);

    let cancelled = false;
    const generate = async () => {
      setGeneratingPdf(true);
      try {
        const blob = await buildEoiPdfBlob({
          eoi,
          company: companyRes?.data,
          logoSrc,
          brandName: displayName,
          primaryColor,
        });
        if (cancelled) return;
        const filename = eoiPdfFilename(eoi);
        setPdfFile(new File([blob], filename, { type: "application/pdf" }));
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("Failed to generate EOI PDF.");
      } finally {
        if (!cancelled) setGeneratingPdf(false);
      }
    };
    void generate();
    return () => {
      cancelled = true;
    };
  }, [open, eoi, companyRes?.data, logoSrc, displayName, primaryColor, isResend]);

  useEffect(() => {
    if (!open) return;
    const senderEmails = new Set((sendersRes?.data ?? []).map((row) => row.email));
    const candidates = [
      eoiSignatoryEmail(eoi),
      currentUser?.email,
      sendersRes?.mailbox,
      companyRes?.data?.email,
      companyRes?.data?.billing_email,
      sendersRes?.data?.[0]?.email,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    const nextFrom =
      eoiSignatoryEmail(eoi) ||
      candidates.find((email) => senderEmails.has(email)) ||
      candidates[0] ||
      "";
    if (nextFrom) setFrom(nextFrom);
  }, [
    open,
    eoi,
    currentUser?.email,
    companyRes?.data?.email,
    companyRes?.data?.billing_email,
    sendersRes,
  ]);

  const handleSend = async () => {
    if (!from.trim()) {
      toast.error("Enter a from email");
      return;
    }
    if (!to.trim()) {
      toast.error("Enter a recipient email");
      return;
    }
    if (!attachment) {
      toast.error("EOI PDF is still loading");
      return;
    }
    await toastHandler({
      loading: isResend ? "Resending EOI email…" : "Sending EOI email…",
      success: isResend ? "EOI email resent." : "EOI emailed successfully.",
      action: () =>
        sendEoiEmail({
          id: eoi._id,
          from: from.trim(),
          to: to.trim(),
          cc: cc.trim() || undefined,
          subject: subject.trim(),
          body: body.trim(),
          attachment,
        }).unwrap(),
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>{isResend ? "Resend EOI email" : "Send EOI email"}</SheetTitle>
          <SheetDescription>
            {isResend
              ? `${eoi.eoiRef} will be attached as a PDF. EOI status stays ${eoi.status.toLowerCase()}. The linked enquiry is marked as EOI sent.`
              : `${eoi.eoiRef} will be attached as a PDF and marked as sent after delivery. The linked enquiry is marked as EOI sent.`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="eoi-email-from">From</Label>
            <Input
              id="eoi-email-from"
              type="email"
              list="eoi-email-from-options"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              placeholder="Any mailbox in your Microsoft tenant"
            />
            <datalist id="eoi-email-from-options">
              {tenantSenders.map((sender) => (
                <option key={sender.email} value={sender.email}>
                  {sender.name}
                </option>
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eoi-email-to">To</Label>
            <Input
              id="eoi-email-to"
              type="email"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eoi-email-cc">CC</Label>
            <Input
              id="eoi-email-cc"
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="Optional, comma-separated"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eoi-email-subject">Subject</Label>
            <Input
              id="eoi-email-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eoi-email-body">Message</Label>
            <Textarea
              id="eoi-email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-32"
            />
          </div>

          <EmailAttachmentField
            id="eoi-email-attachment"
            generatedFile={pdfFile}
            generatedFilename={eoiPdfFilename(eoi)}
            generating={generatingPdf}
            generatingLabel="Generating EOI PDF…"
            failureLabel="The EOI PDF could not be generated."
            uploadedFile={uploadedFile}
            onUploadedFileChange={setUploadedFile}
          />
        </div>

        <SheetFooter className="border-t border-border p-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !attachment || (generatingPdf && !uploadedFile)}
          >
            {sending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : isResend ? (
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isResend ? "Resend email" : "Send email"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function EoiSendEmailButton({
  eoi,
  mode = "send",
}: {
  eoi: ExpressionOfInterest;
  mode?: SendEmailMode;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isResend = mode === "resend";
  const needsConfirm = eoi.status === "ACCEPTED";

  const openComposer = () => setOpen(true);

  return (
    <>
      <Button
        size="sm"
        variant={isResend ? "outline" : "default"}
        className="h-8"
        onClick={() => (needsConfirm ? setConfirmOpen(true) : openComposer())}
      >
        {isResend ? (
          <RotateCw className="mr-1 h-3.5 w-3.5" />
        ) : (
          <Send className="mr-1 h-3.5 w-3.5" />
        )}
        {isResend ? "Resend" : "Send email"}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend this accepted EOI?</AlertDialogTitle>
            <AlertDialogDescription>
              {eoi.eoiRef} is already accepted. The recipient will receive the PDF again.
              Status will stay accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={openComposer}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EoiSendEmailPanel eoi={eoi} open={open} onOpenChange={setOpen} mode={mode} />
    </>
  );
}
