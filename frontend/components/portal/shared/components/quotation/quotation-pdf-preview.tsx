"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { toast } from "sonner";
import { useCompanyBranding } from "@/components/portal/shared/components/company-branding-provider";
import { useGetDefaultCompanyQuery } from "@/store/slices/companyApiSlice";
import type { Quotation } from "@/store/slices/quotationApiSlice";
import {
  buildQuotationPdfBlob,
  quotationPdfFilename,
} from "@/components/portal/lib/quotationPdf";

function triggerPdfDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

function useQuotationPdf(quotation: Quotation) {
  const { displayName, logoSrc, primaryColor } = useCompanyBranding();
  const { data: companyRes } = useGetDefaultCompanyQuery();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const generateUrl = async () => {
    setGenerating(true);
    try {
      const blob = await buildQuotationPdfBlob({
        quotation,
        company: companyRes?.data,
        logoSrc,
        brandName: displayName,
        primaryColor,
      });
      const nextUrl = URL.createObjectURL(blob);
      setPdfUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      return nextUrl;
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate quotation PDF.");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const preview = async () => {
    const url = pdfUrl ?? (await generateUrl());
    if (url) setOpen(true);
  };

  const download = async () => {
    const url = pdfUrl ?? (await generateUrl());
    if (url) triggerPdfDownload(url, quotationPdfFilename(quotation));
  };

  return { generating, open, setOpen, pdfUrl, preview, download };
}

function QuotationPdfDialog({
  quotation,
  open,
  onOpenChange,
  pdfUrl,
  onDownload,
}: {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string | null;
  onDownload: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95dvh] w-[min(100%-1rem,56rem)] max-w-5xl flex-col gap-3 overflow-hidden p-4 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Quotation PDF — {quotation.quotationRef}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-muted/30">
          {pdfUrl ? (
            <iframe
              title={`${quotation.quotationRef} PDF preview`}
              src={pdfUrl}
              className="h-[min(72dvh,44rem)] w-full bg-white"
            />
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Letterhead uses the company logo, brand name, and office addresses.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              disabled={!pdfUrl}
              onClick={() => pdfUrl && window.open(pdfUrl, "_blank", "noopener,noreferrer")}
            >
              Open in new tab
            </Button>
            <Button onClick={onDownload} disabled={!pdfUrl}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuotationPdfPreviewButton({ quotation }: { quotation: Quotation }) {
  const pdf = useQuotationPdf(quotation);

  return (
    <>
      <Button variant="outline" size="sm" onClick={pdf.preview} disabled={pdf.generating}>
        {pdf.generating ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="mr-1.5 h-3.5 w-3.5" />
        )}
        Preview PDF
      </Button>
      <QuotationPdfDialog
        quotation={quotation}
        open={pdf.open}
        onOpenChange={pdf.setOpen}
        pdfUrl={pdf.pdfUrl}
        onDownload={pdf.download}
      />
    </>
  );
}

export function QuotationPdfListActions({ quotation }: { quotation: Quotation }) {
  const pdf = useQuotationPdf(quotation);

  return (
    <>
      <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={pdf.preview}
          disabled={pdf.generating}
        >
          {pdf.generating ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="mr-1 h-3.5 w-3.5" />
          )}
          View PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={pdf.download}
          disabled={pdf.generating}
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          Download PDF
        </Button>
      </div>
      <QuotationPdfDialog
        quotation={quotation}
        open={pdf.open}
        onOpenChange={pdf.setOpen}
        pdfUrl={pdf.pdfUrl}
        onDownload={pdf.download}
      />
    </>
  );
}
