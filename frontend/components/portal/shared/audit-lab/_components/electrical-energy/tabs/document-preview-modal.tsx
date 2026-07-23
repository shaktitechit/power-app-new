"use client";

import { Button } from "@/components/portal/ui/button";
import { Badge } from "@/components/portal/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import {
  FileText,
  Download,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";

export interface DocumentPreviewItem {
  fileName: string;
  fileUrl: string;
  fileType: "image" | "pdf" | string;
  caption?: string;
  uploadedAt?: string | Date;
  entityName?: string;
  sectionName?: string;
  accountLabel?: string;
}

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  document: DocumentPreviewItem | null;
}

export function DocumentPreviewModal({ open, onClose, document: doc }: DocumentPreviewModalProps) {
  if (!open || !doc) return null;

  const isPdf =
    doc.fileType.toLowerCase().includes("pdf") || doc.fileName.toLowerCase().endsWith(".pdf");

  const proxiedUrl = toSameOriginFileManagementUrl(doc.fileUrl);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = proxiedUrl;
    a.download = doc.fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-7xl sm:!max-w-7xl w-[95vw] !max-h-[92vh] h-[92vh] flex flex-col p-0 !overflow-hidden border border-border/80 shadow-2xl rounded-xl gap-0 bg-background">

        {/* ── Header ── */}
        <DialogHeader className="px-5 py-3 border-b border-border/50 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {isPdf ? (
                <FileText className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
              )}
              <DialogTitle className="text-xs font-bold text-foreground truncate max-w-[60vw]">
                {doc.fileName}
              </DialogTitle>
              <Badge
                variant="outline"
                className="text-[9px] uppercase font-mono tracking-widest bg-background/50 border-border/40 shrink-0"
              >
                {isPdf ? "PDF" : "IMAGE"}
              </Badge>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1.5 px-2.5"
                asChild
                title="Open in new tab"
              >
                <a href={proxiedUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-[11px] gap-1.5 px-2.5 bg-primary hover:bg-primary/90"
                onClick={handleDownload}
                title="Download file"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── File viewer ── */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-neutral-950/20 overflow-hidden p-3">
          {isPdf ? (
            <iframe
              src={proxiedUrl}
              style={{ width: "100%", height: "100%", minHeight: 0 }}
              className="border-none rounded-md bg-white"
              title={`PDF Preview: ${doc.fileName}`}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={proxiedUrl}
              alt={doc.fileName}
              className="max-w-full max-h-full object-contain rounded-md shadow-xl border border-border/30"
            />
          )}
        </div>

        {/* ── Caption ── */}
        {doc.caption && (
          <div className="px-5 py-2.5 border-t border-border/50 shrink-0">
            <p className="text-sm text-muted-foreground text-center italic">{doc.caption}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
