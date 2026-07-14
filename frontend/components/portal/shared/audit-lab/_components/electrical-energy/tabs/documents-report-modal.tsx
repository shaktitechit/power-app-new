"use client";

import { useRef } from "react";
import { Button } from "@/components/portal/ui/button";
import { Badge } from "@/components/portal/ui/badge";
import {
  FileText,
  Download,
  X,
  FolderOpen,
  Layers,
  Calendar,
  Image as ImageIcon,
  FileDown,
} from "lucide-react";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import type { DocumentPreviewItem } from "./document-preview-modal";

export interface DocumentReportItem extends DocumentPreviewItem {
  accountLabel: string;
  accountNumber: string;
  sectionName: string;
  entityName: string;
}

interface DocumentsReportModalProps {
  open: boolean;
  onClose: () => void;
  documents: DocumentReportItem[];
  title?: string;
}

export function DocumentsReportModal({
  open,
  onClose,
  documents,
  title = "Documents Report",
}: DocumentsReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const isPdf = (doc: DocumentReportItem) =>
    doc.fileType.toLowerCase().includes("pdf") || doc.fileName.toLowerCase().endsWith(".pdf");

  // Group by account → section
  const grouped: Record<string, { label: string; sections: Record<string, DocumentReportItem[]> }> = {};
  documents.forEach((doc) => {
    const accKey = doc.accountNumber || "unspecified";
    if (!grouped[accKey]) {
      grouped[accKey] = { label: doc.accountLabel || "Utility Account", sections: {} };
    }
    if (!grouped[accKey].sections[doc.sectionName]) {
      grouped[accKey].sections[doc.sectionName] = [];
    }
    grouped[accKey].sections[doc.sectionName].push(doc);
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground print:bg-white">
      {/* ── Header (hidden on print) ── */}
      <header className="print:hidden flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileDown className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">
              {documents.length} document(s) across {Object.keys(grouped).length} account(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px]">
            {documents.length} files
          </Badge>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90"
            onClick={handlePrint}
          >
            <Download className="h-3.5 w-3.5" />
            Download / Print
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Document Body ── */}
      <main
        ref={printRef}
        className="flex-1 overflow-y-auto p-6 sm:p-10 print:p-4 space-y-10"
      >
        {/* Report Title */}
        <div className="text-center border-b border-border pb-6 print:pb-4">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated on {new Date().toLocaleDateString(undefined, { dateStyle: "long" })}
            {" · "}{documents.length} document(s) listed
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No documents to display.
          </div>
        ) : (
          Object.entries(grouped).map(([accNum, accGroup]) => (
            <section key={accNum} className="space-y-8 print:break-inside-avoid">
              {/* Account heading */}
              <div className="flex items-center gap-2 border-b-2 border-primary/30 pb-3">
                <Layers className="h-4 w-4 text-primary shrink-0" />
                <h2 className="text-base font-extrabold text-foreground">{accGroup.label}</h2>
                <Badge variant="outline" className="text-[10px] font-mono ml-auto">
                  {Object.values(accGroup.sections).flat().length} file(s)
                </Badge>
              </div>

              {Object.entries(accGroup.sections).map(([sectionName, items]) => (
                <div key={sectionName} className="space-y-4 pl-3">
                  {/* Section heading */}
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {sectionName}
                      <span className="ml-2 font-normal normal-case tracking-normal">
                        ({items.length})
                      </span>
                    </h3>
                  </div>

                  {/* Document rows — one per document */}
                  <div className="space-y-6">
                    {items.map((doc, idx) => {
                      const proxiedUrl = toSameOriginFileManagementUrl(doc.fileUrl);
                      const isImage = !isPdf(doc);

                      return (
                        <div
                          key={idx}
                          className="flex gap-5 border border-border/60 rounded-xl p-4 bg-muted/10 print:break-inside-avoid"
                        >
                          {/* Thumbnail / PDF icon */}
                          <div className="shrink-0 w-32 h-24 rounded-lg overflow-hidden border border-border/50 bg-muted/30 flex items-center justify-center">
                            {isImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={proxiedUrl}
                                alt={doc.fileName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 w-full h-full bg-gradient-to-br from-red-50/80 to-orange-50/60 dark:from-red-950/30 dark:to-orange-950/20">
                                <FileText className="h-8 w-8 text-red-500/70" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/60">
                                  PDF
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">
                                  {doc.fileName}
                                </p>
                                <p className="text-[11px] text-primary font-semibold">
                                  {doc.entityName}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-[9px] uppercase font-mono shrink-0"
                              >
                                {isPdf(doc) ? "PDF" : "IMAGE"}
                              </Badge>
                            </div>

                            {/* Caption */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                Caption
                              </span>
                              <p className="text-xs italic text-foreground leading-relaxed border-l-2 border-primary/30 pl-2">
                                {doc.caption || (
                                  <span className="text-muted-foreground/40 not-italic">
                                    No caption provided.
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Upload date + URL */}
                            <div className="flex items-center justify-between gap-2 pt-1">
                              {doc.uploadedAt && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                              <a
                                href={proxiedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-primary underline underline-offset-2 truncate max-w-[200px] print:hidden"
                              >
                                Open file ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))
        )}

        {/* Footer */}
        <div className="border-t border-border pt-6 text-center text-[10px] text-muted-foreground">
          Audit Lab — Documents Report · {new Date().toLocaleString()}
        </div>
      </main>

      {/* Print styles injected globally */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0 { position: absolute !important; }
          .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
          header.print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
