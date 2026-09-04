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
  type Quotation,
  useSendQuotationEmailMutation,
} from "@/store/slices/quotationApiSlice";
import {
  buildQuotationPdfBlob,
  quotationPdfFilename,
} from "@/components/portal/lib/quotationPdf";
import { formatDisplayDate } from "@/components/portal/lib/quotationConstants";
import { toastHandler } from "@/components/portal/lib/toast";
import { toast } from "sonner";
import {
  SIGNATORY_APPROVAL_LOCKED_MESSAGE,
  isSignatoryApproved,
} from "@/components/portal/lib/signatoryApproval";

function defaultSubject(quotation: Quotation) {
  return `Quotation ${quotation.quotationRef}${quotation.subject ? ` — ${quotation.subject}` : ""}`;
}

function defaultBody(quotation: Quotation, senderName?: string, resend = false) {
  const name = quotation.customer?.kindAttn || quotation.customer?.name || "Sir / Madam";
  const validUntil = quotation.validUntil ? formatDisplayDate(quotation.validUntil) : "";
  const signatoryName = String(senderName || quotation.signatory?.name || "").trim();
  const signatoryDesignation = String(quotation.signatory?.designation || "").trim();
  const lines = [
    `Dear ${name},`,
    "",
    resend
      ? `Please find attached our quotation ${quotation.quotationRef}${quotation.subject ? ` for ${quotation.subject}` : ""} again for your reference.`
      : `Please find attached our quotation ${quotation.quotationRef}${quotation.subject ? ` for ${quotation.subject}` : ""}.`,
  ];
  if (validUntil) lines.push(`This quotation is valid until ${validUntil}.`);
  lines.push("", "We look forward to your confirmation.", "", "Regards,");
  if (signatoryName) lines.push(signatoryName);
  if (signatoryDesignation) lines.push(signatoryDesignation);
  return lines.join("\n");
}

function quotationSignatoryEmail(quotation: Quotation) {
  const userId = quotation.signatory?.userId;
  if (userId && typeof userId === "object") {
    return String(userId.email || "").trim().toLowerCase();
  }
  return "";
}

type SendEmailMode = "send" | "resend";

export function QuotationSendEmailPanel({
  quotation,
  open,
  onOpenChange,
  mode = "send",
}: {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: SendEmailMode;
}) {
  const isResend = mode === "resend";
  const { displayName, logoSrc, primaryColor } = useCompanyBranding();
  const { data: companyRes } = useGetDefaultCompanyQuery();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { data: sendersRes } = useGetGraphMailSendersQuery(undefined, { skip: !open });
  const [sendQuotationEmail, { isLoading: sending }] = useSendQuotationEmailMutation();
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
    setTo(quotation.customer?.email || "");
    setCc("");
    setSubject(isResend ? `Re: ${defaultSubject(quotation)}` : defaultSubject(quotation));
    setBody(defaultBody(quotation, quotation.signatory?.name, isResend));
    setPdfFile(null);
    setUploadedFile(null);

    let cancelled = false;
    const generate = async () => {
      setGeneratingPdf(true);
      try {
        const blob = await buildQuotationPdfBlob({
          quotation,
          company: companyRes?.data,
          logoSrc,
          brandName: displayName,
          primaryColor,
        });
        if (cancelled) return;
        const filename = quotationPdfFilename(quotation);
        setPdfFile(new File([blob], filename, { type: "application/pdf" }));
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error("Failed to generate quotation PDF.");
      } finally {
        if (!cancelled) setGeneratingPdf(false);
      }
    };
    void generate();
    return () => {
      cancelled = true;
    };
  }, [open, quotation, companyRes?.data, logoSrc, displayName, primaryColor, isResend]);

  useEffect(() => {
    if (!open) return;
    const senderEmails = new Set((sendersRes?.data ?? []).map((row) => row.email));
    const candidates = [
      quotationSignatoryEmail(quotation),
      currentUser?.email,
      sendersRes?.mailbox,
      companyRes?.data?.email,
      companyRes?.data?.billing_email,
      sendersRes?.data?.[0]?.email,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    const nextFrom =
      quotationSignatoryEmail(quotation) ||
      candidates.find((email) => senderEmails.has(email)) ||
      candidates[0] ||
      "";
    if (nextFrom) setFrom(nextFrom);
  }, [
    open,
    quotation,
    currentUser?.email,
    companyRes?.data?.email,
    companyRes?.data?.billing_email,
    sendersRes,
  ]);

  const handleSend = async () => {
    if (!isSignatoryApproved(quotation)) {
      toast.error(SIGNATORY_APPROVAL_LOCKED_MESSAGE);
      return;
    }
    if (!from.trim()) {
      toast.error("Enter a from email");
      return;
    }
    if (!to.trim()) {
      toast.error("Enter a recipient email");
      return;
    }
    if (!attachment) {
      toast.error("Quotation PDF is still loading");
      return;
    }
    await toastHandler({
      loading: isResend ? "Resending quotation email…" : "Sending quotation email…",
      success: isResend ? "Quotation email resent." : "Quotation emailed successfully.",
      action: () =>
        sendQuotationEmail({
          id: quotation._id,
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
          <SheetTitle>{isResend ? "Resend quotation email" : "Send quotation email"}</SheetTitle>
          <SheetDescription>
            {isResend
              ? `${quotation.quotationRef} will be attached as a PDF. Quotation status stays ${quotation.status.toLowerCase()}. The linked enquiry is marked as quoted.`
              : `${quotation.quotationRef} will be attached as a PDF and marked as sent after delivery. The linked enquiry is marked as quoted.`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="quotation-email-from">From</Label>
            <Input
              id="quotation-email-from"
              type="email"
              value={from}
              readOnly
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quotation-email-to">To</Label>
            <Input
              id="quotation-email-to"
              type="email"
              value={to}
              readOnly
              className="bg-muted/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quotation-email-cc">CC</Label>
            <Input
              id="quotation-email-cc"
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="Optional, comma-separated"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quotation-email-subject">Subject</Label>
            <Input
              id="quotation-email-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quotation-email-body">Message</Label>
            <Textarea
              id="quotation-email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-32"
            />
          </div>

          <EmailAttachmentField
            id="quotation-email-attachment"
            generatedFile={pdfFile}
            generatedFilename={quotationPdfFilename(quotation)}
            generating={generatingPdf}
            generatingLabel="Generating quotation PDF…"
            failureLabel="The quotation PDF could not be generated."
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

export function QuotationSendEmailButton({
  quotation,
  mode = "send",
}: {
  quotation: Quotation;
  mode?: SendEmailMode;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isResend = mode === "resend";
  const needsConfirm = quotation.status === "ACCEPTED";
  if (!isSignatoryApproved(quotation)) return null;

  const openComposer = () => setOpen(true);

  return (
    <>
      <Button
        size="sm"
        variant={isResend ? "outline" : "default"}
        onClick={() => (needsConfirm ? setConfirmOpen(true) : openComposer())}
      >
        {isResend ? (
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <Send className="mr-1.5 h-3.5 w-3.5" />
        )}
        {isResend ? "Resend email" : "Send email"}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend this accepted quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              {quotation.quotationRef} is already accepted. The customer will receive the PDF
              again. Status will stay accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={openComposer}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <QuotationSendEmailPanel
        quotation={quotation}
        open={open}
        onOpenChange={setOpen}
        mode={mode}
      />
    </>
  );
}
