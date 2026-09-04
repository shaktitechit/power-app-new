import type { Company } from "@/store/slices/companyApiSlice";
import type { ExpressionOfInterest } from "@/store/slices/eoiApiSlice";
import { DEFAULT_PRIMARY_COLOR } from "@/components/portal/lib/companyBranding";
import { eoiBodyForEditor } from "@/components/portal/lib/eoiConstants";
import { drawRichHtml } from "@/components/portal/lib/quotationPdf";
import {
  COMPACT_HEADER_H,
  CONTENT_W,
  MARGIN_X,
  MUTED,
  NAVY,
  PAGE_H,
  PAGE_W,
  RULE,
  TOP_BAR_H,
  buildCompanyLetterhead,
  drawCompactHeader,
  drawFooter,
  drawFullLetterhead,
  formatPdfDate,
  hexToRgb,
  loadLogo,
  measureFooterHeight,
  type JsPdfDoc,
} from "@/components/portal/lib/letterheadPdf";

export type EoiPdfInput = {
  eoi: ExpressionOfInterest;
  company?: Company | null;
  logoSrc?: string;
  brandName?: string;
  primaryColor?: string;
};

function wrapLines(doc: JsPdfDoc, text: string, width: number) {
  return doc.splitTextToSize(text.replace(/\n/g, " "), width);
}

export function eoiPdfFilename(eoi: ExpressionOfInterest) {
  const ref = String(eoi.eoiRef || "expression-of-interest")
    .replace(/[^a-z0-9_\-]+/gi, "_")
    .replace(/_+/g, "_");
  return `${ref}.pdf`;
}

export async function buildEoiPdfBlob(input: EoiPdfInput): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");

  const eoi = input.eoi;
  const primary = hexToRgb(input.primaryColor || DEFAULT_PRIMARY_COLOR);
  const letterhead = buildCompanyLetterhead(
    input.company,
    eoi.company,
    input.brandName,
  );
  const logo = await loadLogo(input.logoSrc);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const doc = pdf as unknown as JsPdfDoc;
  const compactTop = TOP_BAR_H + COMPACT_HEADER_H;
  const footerH = measureFooterHeight(doc, letterhead);
  const compactSubtitle = `EOI  ${eoi.eoiRef}    Date : ${formatPdfDate(eoi.eoiDate)}`;

  let y = drawFullLetterhead(doc, letterhead, logo, primary);

  const ensureSpace = (needed: number) => {
    if (y + needed <= PAGE_H - footerH - 2) return;
    doc.addPage();
    drawCompactHeader(doc, letterhead, compactSubtitle, logo, primary);
    y = compactTop + 6;
  };

  const writeWrapped = (
    text: string,
    {
      font = "normal" as "normal" | "bold" | "italic",
      size = 10,
      color = NAVY,
      width = CONTENT_W,
      lineH = 4.6,
      gap = 0,
    } = {},
  ) => {
    const lines = wrapLines(doc, text, width);
    if (!lines.length) return;
    ensureSpace(lines.length * lineH + gap);
    doc.setFont("helvetica", font);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(lines, MARGIN_X, y);
    y += lines.length * lineH + gap;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primary);
  ensureSpace(8);
  doc.text("EXPRESSION OF INTEREST", PAGE_W / 2, y, { align: "center" });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  ensureSpace(6);
  doc.text(`Ref. : ${eoi.eoiRef}`, MARGIN_X, y);
  doc.text(`Date : ${formatPdfDate(eoi.eoiDate)}`, PAGE_W - MARGIN_X, y, {
    align: "right",
  });
  y += 8;

  const recipient = eoi.recipient;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  ensureSpace(6);
  doc.text("To,", MARGIN_X, y);
  y += 5.2;

  if (recipient?.designation) {
    writeWrapped(recipient.designation, { font: "bold", size: 10, lineH: 4.4 });
  }
  if (recipient?.organization) {
    writeWrapped(recipient.organization, { font: "bold", size: 10, lineH: 4.4 });
  }
  if (recipient?.address) {
    writeWrapped(recipient.address, {
      font: "normal",
      size: 9.5,
      color: [40, 46, 58],
      lineH: 4.2,
    });
  }
  if (recipient?.email || recipient?.phone) {
    writeWrapped(
      [recipient.email && `Email : ${recipient.email}`, recipient.phone && `Phone : ${recipient.phone}`]
        .filter(Boolean)
        .join("    "),
      { font: "normal", size: 9, color: MUTED, lineH: 4.2 },
    );
  }
  y += 3;

  if (eoi.subject) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    const label = "Subject :  ";
    const labelW = doc.getTextWidth(label);
    const subjectLines = wrapLines(doc, eoi.subject, CONTENT_W - labelW);
    ensureSpace(subjectLines.length * 4.4 + 4);
    doc.text(label, MARGIN_X, y);
    doc.text(subjectLines, MARGIN_X + labelW, y);
    y += subjectLines.length * 4.4 + 5;
  }

  writeWrapped(eoi.salutation?.trim() || "Dear Sir,", {
    font: "bold",
    size: 10,
    gap: 3,
  });

  const bodyHtml = eoiBodyForEditor(eoi.body);
  if (bodyHtml) {
    const ensureSpaceAt = (needed: number, currentY: number) => {
      if (currentY + needed <= PAGE_H - footerH - 2) return currentY;
      doc.addPage();
      drawCompactHeader(doc, letterhead, compactSubtitle, logo, primary);
      y = compactTop + 6;
      return y;
    };
    y = drawRichHtml(doc, bodyHtml, {
      x: MARGIN_X,
      y,
      maxWidth: CONTENT_W,
      fontSize: 10,
      lineHeight: 4.6,
      color: [40, 46, 58],
      ensureSpace: ensureSpaceAt,
    });
    y += 3.2;
  }

  y += 2;
  const closeLines = String(
    eoi.complimentaryClose || "Thanking you.\nYours faithfully,",
  )
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of closeLines) {
    writeWrapped(line, { font: "normal", size: 10, lineH: 4.4, gap: 0.6 });
  }

  const signatory = eoi.signatory;
  const companyName = signatory?.companyName || letterhead.brandName;
  const companyLines = wrapLines(doc, companyName, 92);
  const designation = String(signatory?.designation || "").trim();
  const signatoryLabel = String(signatory?.label || "Authorized Signatory").trim();
  const signatoryLines = [designation, signatoryLabel]
    .filter(Boolean)
    .filter(
      (line, index, all) =>
        all.findIndex((other) => other.toLowerCase() === line.toLowerCase()) === index,
    );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const designationLines = signatoryLines.flatMap((line) =>
    wrapLines(doc, line, 92),
  );
  const signH = 24 + companyLines.length * 4.2 + designationLines.length * 4;
  ensureSpace(signH + 8);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("For and on behalf of:", MARGIN_X, y);
  y += 5;
  doc.setFontSize(10);
  doc.text(companyLines, MARGIN_X, y);
  y += companyLines.length * 4.2 + 14;

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y, MARGIN_X + 62, y);
  y += 5.2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(signatory?.name || "Authorized Signatory", MARGIN_X, y);
  y += 4.4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  for (const line of designationLines) {
    doc.text(line, MARGIN_X, y);
    y += 4;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, letterhead, page, totalPages, primary, footerH);
  }

  return doc.output("blob");
}
