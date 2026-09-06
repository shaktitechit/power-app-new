"use client";

import React, { useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Button } from "@/components/portal/ui/button";
import { Download, Printer, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfBlob: Blob | null;
  title: string;
  filename: string;
  isLoading?: boolean;
}

export function PdfPreviewModal({
  open,
  onClose,
  pdfBlob,
  title,
  filename,
  isLoading = false,
}: PdfPreviewModalProps) {
  const pdfUrl = useMemo(() => {
    if (!pdfBlob) return null;
    return URL.createObjectURL(pdfBlob);
  }, [pdfBlob]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("PDF report downloaded successfully.");
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("Please allow popups to print the PDF report.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent fullscreen className="p-4 sm:p-6 flex flex-col gap-0 overflow-hidden bg-background">
        <DialogHeader className="pb-3 border-b shrink-0 flex flex-row items-center justify-between gap-4 pr-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Official Company Letterhead PDF Document Preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!pdfUrl || isLoading}
              className="gap-1.5 text-xs h-8"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!pdfUrl || isLoading}
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full h-full min-h-0 bg-slate-900/10 rounded-xl overflow-hidden mt-3 border flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium">Generating Letterhead PDF Document...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none"
              title={title}
            />
          ) : (
            <div className="text-center p-8 text-xs text-muted-foreground">
              No PDF document preview available.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
