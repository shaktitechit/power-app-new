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

  // Chunk documents into pages: 4 images per page, 1 PDF per page
  const pages: { type: "images" | "pdf"; items: DocumentReportItem[] }[] = [];
  let currentImages: DocumentReportItem[] = [];

  documents.forEach((doc) => {
    if (isPdf(doc)) {
      if (currentImages.length > 0) {
        pages.push({ type: "images", items: currentImages });
        currentImages = [];
      }
      pages.push({ type: "pdf", items: [doc] });
    } else {
      currentImages.push(doc);
      if (currentImages.length === 4) {
        pages.push({ type: "images", items: currentImages });
        currentImages = [];
      }
    }
  });

  if (currentImages.length > 0) {
    pages.push({ type: "images", items: currentImages });
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDoc = () => {
    const getAbsoluteUrl = (url: string) => {
      if (!url) return "";
      const resolved = toSameOriginFileManagementUrl(url);
      if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
        return resolved;
      }
      const origin = window.location.origin.replace(/\/$/, "");
      const path = resolved.startsWith("/") ? resolved : `/${resolved}`;
      return `${origin}${path}`;
    };

    let htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt;
      margin: 1.0in 1.0in 1.0in 1.0in;
    }
    div.Section1 {
      page: Section1;
      font-family: 'Calibri', 'Arial', sans-serif;
    }
    h1 {
      font-size: 20pt;
      color: #1e3a8a;
      text-align: center;
      margin-bottom: 20pt;
    }
    h2 {
      font-size: 14pt;
      color: #1e3a8a;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 5pt;
    }
    h4 {
      font-size: 10pt;
      color: #111827;
      margin: 5pt 0 2pt 0;
    }
    p.caption {
      font-size: 9pt;
      font-style: italic;
      color: #4b5563;
      border-left: 2px solid #3b82f6;
      padding-left: 8pt;
      margin-top: 4pt;
    }
    p.meta {
      font-size: 8pt;
      color: #3b82f6;
      font-weight: bold;
      margin: 0;
    }
    .page-break {
      page-break-before: always;
      clear: both;
      mso-special-character: page-break;
    }
    .image-container {
      text-align: center;
      margin: 10pt 0;
    }
    .image-container img {
      max-width: 100%;
      height: auto;
      border: 1px solid #e5e7eb;
    }
    table.grid {
      width: 100%;
      border-collapse: collapse;
    }
    table.grid td {
      width: 50%;
      padding: 8pt;
      vertical-align: top;
    }
    .grid-item {
      border: 1px solid #e5e7eb;
      padding: 8pt;
      background-color: #f9fafb;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <h1>${title}</h1>
    <p style="text-align: center; font-size: 10pt; color: #6b7280; margin-bottom: 30pt;">
      Generated on ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}
    </p>
`;

    pages.forEach((page, pageIdx) => {
      if (pageIdx > 0) {
        htmlContent += `<br clear="all" class="page-break" style="page-break-before: always;" />`;
      }

      if (page.type === "pdf") {
        const doc = page.items[0];
        htmlContent += `
          <div style="margin-bottom: 20pt;">
            <p style="font-size: 8pt; color: #9ca3af; text-transform: uppercase; margin: 0;">${doc.sectionName} — ${doc.entityName}</p>
            <h2>${doc.fileName}</h2>
            <p class="meta">${doc.accountLabel}</p>
            <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 20pt; text-align: center; margin: 15pt 0;">
              <p style="font-size: 12pt; color: #ef4444; font-weight: bold; margin: 0;">[PDF Document Reference]</p>
              <p style="font-size: 9pt; color: #4b5563; margin-top: 5pt;">PDF files cannot be directly embedded. Please refer to: ${doc.fileName}</p>
            </div>
            <p class="caption"><strong>Caption:</strong> ${doc.caption || "No caption provided."}</p>
            ${doc.uploadedAt ? `<p style="font-size: 8pt; color: #9ca3af;">File Date: ${new Date(doc.uploadedAt).toLocaleDateString()}</p>` : ""}
          </div>
        `;
      } else {
        htmlContent += `
          <div style="margin-bottom: 20pt;">
            <p style="font-size: 8pt; color: #9ca3af; text-transform: uppercase; margin-bottom: 10pt;">Images Gallery Sheet - Page ${pageIdx + 1}</p>
            <table class="grid">
        `;

        for (let i = 0; i < page.items.length; i += 2) {
          htmlContent += `<tr>`;
          for (let j = 0; j < 2; j++) {
            const doc = page.items[i + j];
            if (doc) {
              const proxiedUrl = getAbsoluteUrl(doc.fileUrl);
              htmlContent += `
                <td>
                  <div class="grid-item">
                    <div class="image-container">
                      <img src="${proxiedUrl}" alt="${doc.fileName}" style="max-height: 120pt;" />
                    </div>
                    <h4>${doc.fileName}</h4>
                    <p class="meta" style="font-size: 7.5pt;">${doc.sectionName} · ${doc.entityName}</p>
                    <p class="caption" style="font-size: 7.5pt; margin-top: 3pt;">${doc.caption || "No caption provided."}</p>
                  </div>
                </td>
              `;
            } else {
              htmlContent += `<td></td>`;
            }
          }
          htmlContent += `</tr>`;
        }

        htmlContent += `
            </table>
          </div>
        `;
      }
    });

    htmlContent += `
  </div>
</body>
</html>
`;

    const blob = new Blob(["\ufeff" + htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="print-modal-root" className="fixed inset-0 z-50 flex flex-col bg-neutral-100 dark:bg-neutral-950 text-foreground print:bg-white">
      {/* ── Word-style Ribbon / Toolbar ── */}
      <header className="print:hidden flex shrink-0 items-center justify-between border-b border-border bg-white dark:bg-zinc-900 shadow-sm px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <FileDown className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold tracking-tight text-neutral-800 dark:text-neutral-100">
              {title}.docx
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono">
              Word Document Preview · {pages.length} pages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
            A4 Print Layout
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-zinc-700 dark:hover:bg-zinc-800"
            onClick={handleDownloadDoc}
          >
            <FileText className="h-3.5 w-3.5" />
            Download Word Doc
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium"
            onClick={handlePrint}
          >
            <Download className="h-3.5 w-3.5" />
            Print / Save PDF
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-neutral-200 dark:hover:bg-zinc-800"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Document Page Workspace ── */}
      <main
        ref={printRef}
        className="flex-1 overflow-y-auto bg-neutral-200/60 dark:bg-neutral-900 p-6 sm:p-10 print:p-0 print:bg-white flex flex-col items-center gap-8 print:gap-0"
      >
        {documents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm bg-white dark:bg-zinc-950 p-8 rounded-lg shadow-sm border border-border">
            No documents to display.
          </div>
        ) : (
          pages.map((page, idx) => {
            if (page.type === "pdf") {
              const doc = page.items[0];
              const proxiedUrl = toSameOriginFileManagementUrl(doc.fileUrl);

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-zinc-950 w-[794px] max-w-full aspect-[1/1.414] min-h-[1123px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] border border-neutral-300/70 dark:border-neutral-800 p-12 sm:p-16 flex flex-col justify-between relative print:shadow-none print:border-none print:p-0 print:w-full print:h-full print:min-h-0 print:aspect-auto print:my-0"
                  style={{ pageBreakAfter: "always" }}
                >
                  {/* Word Page Header */}
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-900 pb-3 mb-6">
                    <div>{doc.sectionName} — {doc.entityName}</div>
                    <div>Account: {doc.accountNumber}</div>
                  </div>

                  {/* Page Content */}
                  <div className="flex-1 flex flex-col justify-center items-center min-h-0 py-4">
                    {/* Styled Frame for the PDF */}
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden bg-neutral-50 dark:bg-zinc-900/50 rounded-lg border border-neutral-200/50 dark:border-neutral-800/80 p-4 max-h-[520px]">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <FileText className="h-16 w-16 text-red-500/80" />
                        <span className="text-xs font-bold uppercase tracking-widest text-red-500/70">
                          PDF Document
                        </span>
                      </div>
                    </div>

                    {/* Metadata details */}
                    <div className="w-full mt-8 space-y-4 text-left">
                      <div>
                        <h3 className="text-base font-extrabold text-neutral-800 dark:text-neutral-100 truncate">
                          {doc.fileName}
                        </h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                          {doc.accountLabel}
                        </p>
                      </div>

                      <div className="border-t border-neutral-100 dark:border-neutral-900" />

                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                          Description / Caption
                        </span>
                        <p className="text-xs italic text-neutral-600 dark:text-neutral-300 leading-relaxed border-l-2 border-blue-500/60 pl-3">
                          {doc.caption || "No caption provided."}
                        </p>
                      </div>

                      {doc.uploadedAt && (
                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono pt-2">
                          File Date: {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Word Page Footer */}
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-900 pt-3 mt-6">
                    <div>Confidential - Energy Audit Lab Report</div>
                    <div>Page {idx + 1} of {pages.length}</div>
                  </div>
                </div>
              );
            } else {
              // Render 4 images per page in a 2x2 grid
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-zinc-950 w-[794px] max-w-full aspect-[1/1.414] min-h-[1123px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] border border-neutral-300/70 dark:border-neutral-800 p-12 sm:p-16 flex flex-col justify-between relative print:shadow-none print:border-none print:p-0 print:w-full print:h-full print:min-h-0 print:aspect-auto print:my-0"
                  style={{ pageBreakAfter: "always" }}
                >
                  {/* Word Page Header */}
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-900 pb-3 mb-6">
                    <div>Images Gallery Sheet</div>
                    <div>Page {idx + 1} of {pages.length}</div>
                  </div>

                  {/* Page Content: 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-6 flex-1 min-h-0 py-4">
                    {page.items.map((doc, docIdx) => {
                      const proxiedUrl = toSameOriginFileManagementUrl(doc.fileUrl);
                      return (
                        <div
                          key={docIdx}
                          className="relative w-full h-[380px] rounded-xl overflow-hidden border border-neutral-200/60 dark:border-zinc-800/80 shadow-sm group"
                        >
                          {/* Full Size Image */}
                          <img
                            src={proxiedUrl}
                            alt={doc.fileName}
                            className="w-full h-full object-cover"
                          />

                          {/* Bottom Gradient Overlay with Metadata */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-5 text-left">
                            <div className="space-y-1">
                              <h4 className="text-sm font-extrabold text-white truncate drop-shadow-sm" title={doc.fileName}>
                                {doc.fileName}
                              </h4>
                              <p className="text-[10px] text-blue-300 font-bold tracking-wide uppercase drop-shadow-sm">
                                {doc.sectionName} · {doc.entityName}
                              </p>
                              {doc.caption && (
                                <p className="text-[10.5px] italic text-neutral-200 line-clamp-2 leading-relaxed mt-1 opacity-90 drop-shadow-sm">
                                  {doc.caption}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Word Page Footer */}
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 dark:text-neutral-500 border-t border-neutral-100 dark:border-neutral-900 pt-3 mt-6">
                    <div>Confidential - Energy Audit Lab Report</div>
                    <div>Page {idx + 1} of {pages.length}</div>
                  </div>
                </div>
              );
            }
          })
        )}
      </main>

      {/* Print styles injected globally */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-modal-root,
          #print-modal-root * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #print-modal-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
          }
          header.print\\:hidden {
            display: none !important;
          }
          main {
            background: white !important;
            padding: 0 !important;
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Ensure images and pictures render on print */
          img {
            display: block !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
