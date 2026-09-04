import type { Company } from "@/store/slices/companyApiSlice";
import type { Enquiry } from "@/store/slices/enquiryApiSlice";
import { DEFAULT_PRIMARY_COLOR } from "@/components/portal/lib/companyBranding";
import {
  buildEnquiryExportRows,
  type EnquiryExportColumnDef,
} from "@/components/portal/lib/enquiryExport";
import {
  COMPACT_HEADER_BOTTOM,
  LANDSCAPE_PAGE_LAYOUT,
  MUTED,
  NAVY,
  PORTRAIT_PAGE_LAYOUT,
  RULE,
  buildCompanyLetterhead,
  drawCompactHeader,
  drawFooter,
  drawFullLetterhead,
  formatPdfDate,
  hexToRgb,
  lighten,
  loadLogo,
  measureFooterHeight,
  type JsPdfDoc,
  type PdfPageLayout,
} from "@/components/portal/lib/letterheadPdf";

export type EnquiryListPdfOrientation = "portrait" | "landscape";

export type EnquiryListPdfInput = {
  rows: Enquiry[];
  columns: EnquiryExportColumnDef[];
  company?: Company | null;
  logoSrc?: string;
  brandName?: string;
  primaryColor?: string;
  orientation: EnquiryListPdfOrientation;
};

function layoutForOrientation(orientation: EnquiryListPdfOrientation): PdfPageLayout {
  return orientation === "landscape" ? LANDSCAPE_PAGE_LAYOUT : PORTRAIT_PAGE_LAYOUT;
}

function buildEqualColumnStyles(columnCount: number, contentW: number) {
  if (columnCount <= 0) return {};
  const cellWidth = contentW / columnCount;
  return Object.fromEntries(
    Array.from({ length: columnCount }, (_, index) => [
      index,
      { cellWidth },
    ]),
  );
}

export function enquiryListPdfFilename(orientation: EnquiryListPdfOrientation) {
  const stamp = new Date().toISOString().split("T")[0];
  return `enquiries_${orientation}_${stamp}.pdf`;
}

export async function buildEnquiryListPdfBlob(
  input: EnquiryListPdfInput,
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const layout = layoutForOrientation(input.orientation);
  const primary = hexToRgb(input.primaryColor || DEFAULT_PRIMARY_COLOR);
  const headerBg = lighten(primary, 0.82);
  const letterhead = buildCompanyLetterhead(input.company, null, input.brandName);
  const logo = await loadLogo(input.logoSrc);
  const exportedOn = formatPdfDate(new Date().toISOString());
  const compactSubtitle = `ENQUIRIES EXPORT    ${exportedOn}    ${input.rows.length} records`;

  const pdf = new jsPDF({
    orientation: input.orientation,
    unit: "mm",
    format: "a4",
  });
  const doc = pdf as unknown as JsPdfDoc;
  const footerH = measureFooterHeight(doc, letterhead, layout);
  const tableBottomMargin = footerH + 3;
  const tableMargins = {
    left: layout.marginX,
    right: layout.marginX,
    top: COMPACT_HEADER_BOTTOM,
    bottom: tableBottomMargin,
  };

  let y = drawFullLetterhead(doc, letterhead, logo, primary, layout);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primary);
  doc.text("ENQUIRIES EXPORT", layout.pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `Exported on ${exportedOn}  •  ${input.rows.length} record${input.rows.length === 1 ? "" : "s"}`,
    layout.pageW / 2,
    y,
    { align: "center" },
  );
  y += 6;

  const exportRows = buildEnquiryExportRows(input.rows, input.columns);
  const head = [input.columns.map((column) => column.label)];
  const body = exportRows.map((row) =>
    input.columns.map((column) => row[column.key] ?? "—"),
  );
  const columnStyles = buildEqualColumnStyles(input.columns.length, layout.contentW);
  const fontSize = input.orientation === "landscape" ? 7 : 6.5;

  autoTable(pdf, {
    startY: y,
    tableWidth: layout.contentW,
    margin: tableMargins,
    head,
    body,
    showHead: "everyPage",
    styles: {
      font: "helvetica",
      fontSize,
      cellPadding: 1.6,
      overflow: "linebreak",
      valign: "top",
      lineColor: RULE,
      lineWidth: 0.2,
      textColor: NAVY,
    },
    headStyles: {
      fillColor: headerBg,
      textColor: NAVY,
      fontStyle: "bold",
      valign: "middle",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setPage(data.pageNumber);
        drawCompactHeader(doc, letterhead, compactSubtitle, logo, primary, layout);
      }
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, letterhead, page, totalPages, primary, footerH, layout);
  }

  return doc.output("blob");
}
