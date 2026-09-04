import type { Company } from "@/store/slices/companyApiSlice";
import type { Quotation, QuotationTerm } from "@/store/slices/quotationApiSlice";
import { DEFAULT_PRIMARY_COLOR } from "@/components/portal/lib/companyBranding";
import {
  COMPACT_HEADER_H,
  CONTENT_W,
  LETTERHEAD_TAGLINE,
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
  lighten,
  loadLogo,
  measureFooterHeight,
  type JsPdfDoc,
  type Rgb,
} from "@/components/portal/lib/letterheadPdf";

import {
  ELECTRONIC_QUOTATION_NOTE,
  isElectronicSignatory,
  signatoryDisplayName,
  signatoryPhone,
} from "@/components/portal/lib/signatoryDesignation";

export { LETTERHEAD_TAGLINE };

export type QuotationPdfInput = {
  quotation: Quotation;
  company?: Company | null;
  logoSrc?: string;
  brandName?: string;
  primaryColor?: string;
};

function formatPdfMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatPdfQty(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

type PdfInlineStyle = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
};

type PdfRun = { text: string; style: PdfInlineStyle };

type PdfBlock = {
  kind: "p" | "li";
  ordered?: boolean;
  index?: number;
  depth: number;
  runs: PdfRun[];
};

const DEFAULT_PDF_STYLE: PdfInlineStyle = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
};

function inheritPdfStyle(base: PdfInlineStyle, tag: string): PdfInlineStyle {
  const next = { ...base };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italic = true;
  if (tag === "u") next.underline = true;
  if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;
  return next;
}

function samePdfStyle(a: PdfInlineStyle, b: PdfInlineStyle) {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strike === b.strike
  );
}

function pdfFontStyle(style: PdfInlineStyle): "normal" | "bold" | "italic" | "bolditalic" {
  if (style.bold && style.italic) return "bolditalic";
  if (style.bold) return "bold";
  if (style.italic) return "italic";
  return "normal";
}

function applyPdfRunStyle(doc: JsPdfDoc, style: PdfInlineStyle, fontSize: number) {
  doc.setFont("helvetica", pdfFontStyle(style));
  doc.setFontSize(fontSize);
}

function normalizePdfRuns(runs: PdfRun[]): PdfRun[] {
  const merged: PdfRun[] = [];
  for (const run of runs) {
    const text = run.text.replace(/\u00a0/g, " ");
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last && last.text !== "\n" && text !== "\n" && samePdfStyle(last.style, run.style)) {
      last.text += text;
    } else {
      merged.push({ text, style: { ...run.style } });
    }
  }
  if (merged[0]) merged[0].text = merged[0].text.replace(/^\s+/, "");
  const tail = merged[merged.length - 1];
  if (tail) tail.text = tail.text.replace(/\s+$/, "");
  return merged.filter((run) => run.text.length > 0);
}

function collectPdfRuns(node: Node, style: PdfInlineStyle, into: PdfRun[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const collapsed = (node.textContent || "").replace(/\u00a0/g, " ").replace(/[ \t\r\n]+/g, " ");
    if (collapsed) into.push({ text: collapsed, style: { ...style } });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === "br") {
    into.push({ text: "\n", style: { ...style } });
    return;
  }
  if (tag === "ul" || tag === "ol") return;
  const nextStyle = inheritPdfStyle(style, tag);
  el.childNodes.forEach((child) => collectPdfRuns(child, nextStyle, into));
}

function htmlToPdfBlocks(html: string): PdfBlock[] {
  if (!html?.trim() || typeof DOMParser === "undefined") return [];
  const parsed = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = parsed.body.firstElementChild;
  if (!root) return [];

  const blocks: PdfBlock[] = [];
  type ListState = { ordered: boolean; index: number; depth: number };

  function pushBlock(kind: PdfBlock["kind"], runs: PdfRun[], list?: ListState) {
    const normalized = normalizePdfRuns(runs);
    if (!normalized.length) return;
    if (kind === "li" && list) {
      blocks.push({
        kind: "li",
        ordered: list.ordered,
        index: list.index,
        depth: list.depth,
        runs: normalized,
      });
      return;
    }
    blocks.push({ kind: "p", depth: list?.depth ?? 0, runs: normalized });
  }

  function visit(node: Node, style: PdfInlineStyle, list?: ListState) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      if (node.nodeType === Node.TEXT_NODE) {
        const runs: PdfRun[] = [];
        collectPdfRuns(node, style, runs);
        pushBlock("p", runs, list);
      }
      return;
    }

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const nextStyle = inheritPdfStyle(style, tag);

    if (tag === "ul" || tag === "ol") {
      const nextList: ListState = {
        ordered: tag === "ol",
        index: 0,
        depth: (list?.depth ?? 0) + 1,
      };
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName.toLowerCase() === "li") {
          nextList.index += 1;
          visit(child, nextStyle, { ...nextList });
        }
      });
      return;
    }

    if (tag === "li") {
      const ctx = list ?? { ordered: false, index: 1, depth: 1 };
      let first = true;
      const emit = (runs: PdfRun[]) => {
        if (first) {
          pushBlock("li", runs, ctx);
          first = false;
        } else {
          pushBlock("p", runs, ctx);
        }
      };
      let buffer: PdfRun[] = [];
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childTag = (child as Element).tagName.toLowerCase();
          if (childTag === "ul" || childTag === "ol") {
            if (buffer.length) emit(buffer);
            buffer = [];
            first = false;
            visit(child, nextStyle, ctx);
            return;
          }
          if (childTag === "p" || childTag === "div" || /^h[1-6]$/.test(childTag)) {
            if (buffer.length) emit(buffer);
            buffer = [];
            const runs: PdfRun[] = [];
            collectPdfRuns(child, nextStyle, runs);
            emit(runs);
            return;
          }
        }
        collectPdfRuns(child, nextStyle, buffer);
      });
      if (buffer.length) emit(buffer);
      return;
    }

    if (tag === "p" || tag === "div" || /^h[1-6]$/.test(tag)) {
      const runs: PdfRun[] = [];
      const nested: Element[] = [];
      el.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childTag = (child as Element).tagName.toLowerCase();
          if (childTag === "ul" || childTag === "ol") {
            nested.push(child as Element);
            return;
          }
        }
        collectPdfRuns(child, nextStyle, runs);
      });
      pushBlock(list ? "li" : "p", runs, list);
      nested.forEach((child) => visit(child, nextStyle, list));
      return;
    }

    if (tag === "br") {
      pushBlock("p", [{ text: "\n", style: { ...style } }], list);
      return;
    }

    el.childNodes.forEach((child) => visit(child, nextStyle, list));
  }

  let buffer: PdfRun[] = [];
  root.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase();
      if (
        tag === "ul" ||
        tag === "ol" ||
        tag === "p" ||
        tag === "div" ||
        tag === "li" ||
        /^h[1-6]$/.test(tag)
      ) {
        if (buffer.length) pushBlock("p", buffer);
        buffer = [];
        visit(child, DEFAULT_PDF_STYLE);
        return;
      }
      if (tag === "br") {
        if (buffer.length) pushBlock("p", buffer);
        buffer = [];
        return;
      }
    }
    collectPdfRuns(child, DEFAULT_PDF_STYLE, buffer);
  });
  if (buffer.length) pushBlock("p", buffer);

  return blocks;
}

function wrapPdfRuns(doc: JsPdfDoc, runs: PdfRun[], maxWidth: number, fontSize: number): PdfRun[][] {
  const lines: PdfRun[][] = [[]];
  let lineWidth = 0;

  const startLine = () => {
    lines.push([]);
    lineWidth = 0;
  };

  const measure = (text: string, style: PdfInlineStyle) => {
    applyPdfRunStyle(doc, style, fontSize);
    return doc.getTextWidth(text);
  };

  const tokens: PdfRun[] = [];
  for (const run of runs) {
    for (const piece of run.text.split(/(\n)/)) {
      if (piece === "\n") {
        tokens.push({ text: "\n", style: run.style });
        continue;
      }
      for (const part of piece.split(/(\s+)/)) {
        if (part) tokens.push({ text: part, style: run.style });
      }
    }
  }

  const pushHardSplit = (token: PdfRun) => {
    let rest = token.text;
    while (rest) {
      let lo = 1;
      let hi = rest.length;
      let fit = 1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (measure(rest.slice(0, mid), token.style) <= maxWidth) {
          fit = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      lines[lines.length - 1].push({ text: rest.slice(0, fit), style: token.style });
      lineWidth = measure(rest.slice(0, fit), token.style);
      rest = rest.slice(fit);
      if (rest) startLine();
    }
  };

  for (const token of tokens) {
    if (token.text === "\n") {
      startLine();
      continue;
    }
    const isSpace = /^\s+$/.test(token.text);
    const width = measure(token.text, token.style);
    const line = lines[lines.length - 1];
    if (isSpace && line.length === 0) continue;
    if (lineWidth + width > maxWidth && line.length > 0) {
      startLine();
      if (isSpace) continue;
    }
    if (measure(token.text, token.style) > maxWidth && lines[lines.length - 1].length === 0) {
      pushHardSplit(token);
      continue;
    }
    lines[lines.length - 1].push(token);
    lineWidth += width;
  }

  return lines.filter((line) => line.some((run) => run.text.replace(/\s/g, "").length || run.text === " "));
}

function drawStyledPdfLine(
  doc: JsPdfDoc,
  runs: PdfRun[],
  x: number,
  y: number,
  fontSize: number,
  color: Rgb,
) {
  doc.setTextColor(...color);
  let cursor = x;
  for (const run of runs) {
    applyPdfRunStyle(doc, run.style, fontSize);
    doc.text(run.text, cursor, y);
    const width = doc.getTextWidth(run.text);
    if (run.style.underline || run.style.strike) {
      doc.setDrawColor(...color);
      doc.setLineWidth(0.15);
      if (run.style.underline) doc.line(cursor, y + 0.45, cursor + width, y + 0.45);
      if (run.style.strike) doc.line(cursor, y - 1.05, cursor + width, y - 1.05);
    }
    cursor += width;
  }
}

export function drawRichHtml(
  doc: JsPdfDoc,
  html: string,
  opts: {
    x: number;
    y: number;
    maxWidth: number;
    fontSize?: number;
    lineHeight?: number;
    color?: Rgb;
    ensureSpace: (needed: number, currentY: number) => number;
  },
) {
  const fontSize = opts.fontSize ?? 8;
  const lineHeight = opts.lineHeight ?? 3.5;
  const color = opts.color ?? ([40, 46, 58] as Rgb);
  const blocks = htmlToPdfBlocks(html);
  let y = opts.y;
  let firstLine = true;

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    const indent = Math.max(0, block.depth) * 3.6;
    const blockX = opts.x + indent;
    const prefix =
      block.kind === "li" ? (block.ordered ? `${block.index}. ` : "•  ") : "";
    applyPdfRunStyle(doc, DEFAULT_PDF_STYLE, fontSize);
    const prefixW = prefix ? doc.getTextWidth(prefix) : 0;
    const textWidth = Math.max(18, opts.maxWidth - indent - prefixW);
    const lines = wrapPdfRuns(doc, block.runs, textWidth, fontSize);
    const drawLines = lines.length ? lines : [[] as PdfRun[]];

    for (let i = 0; i < drawLines.length; i += 1) {
      if (!firstLine) y = opts.ensureSpace(lineHeight + 1, y);
      firstLine = false;
      if (i === 0 && prefix) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        doc.text(prefix, blockX, y);
      }
      drawStyledPdfLine(doc, drawLines[i], blockX + prefixW, y, fontSize, color);
      y += lineHeight;
    }
    if (blockIndex < blocks.length - 1) y += 0.6;
  }

  return y;
}

function withMsPrefix(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return /^m\/s\.?\s/i.test(trimmed) ? trimmed : `M/s. ${trimmed}`;
}

function groupTerms(terms: QuotationTerm[]) {
  const groups: { title: string; lines: QuotationTerm[] }[] = [];
  for (const term of terms) {
    const last = groups[groups.length - 1];
    if (last && last.title === term.title) last.lines.push(term);
    else groups.push({ title: term.title, lines: [term] });
  }
  return groups;
}

function kv(
  doc: JsPdfDoc,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW = 22,
  maxW = 96,
) {
  if (!value) return y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${label}`, x, y);
  doc.setTextColor(...NAVY);
  const wrapped = doc.splitTextToSize(value, maxW - labelW);
  doc.text(wrapped, x + labelW, y);
  return y + Math.max(1, wrapped.length) * 4.1;
}

export function quotationPdfFilename(quotation: Quotation) {
  const ref = String(quotation.quotationRef || "quotation")
    .replace(/[^a-z0-9_\-]+/gi, "_")
    .replace(/_+/g, "_");
  return `${ref}.pdf`;
}

export async function buildQuotationPdfBlob(input: QuotationPdfInput): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const quotation = input.quotation;
  const primary = hexToRgb(input.primaryColor || DEFAULT_PRIMARY_COLOR);
  const headerBg = lighten(primary, 0.82);
  const letterhead = buildCompanyLetterhead(
    input.company,
    quotation.company,
    input.brandName,
  );
  const logo = await loadLogo(input.logoSrc);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const doc = pdf as unknown as JsPdfDoc;
  const compactTop = TOP_BAR_H + COMPACT_HEADER_H;
  const footerH = measureFooterHeight(doc, letterhead);
  const compactSubtitle = `QUOTATION  ${quotation.quotationRef}    Date : ${formatPdfDate(quotation.quotationDate)}`;

  const startBodyY = drawFullLetterhead(doc, letterhead, logo, primary);
  let y = startBodyY;

  const ensureSpaceAt = (needed: number, currentY: number) => {
    if (currentY + needed <= PAGE_H - footerH - 2) return currentY;
    doc.addPage();
    drawCompactHeader(doc, letterhead, compactSubtitle, logo, primary);
    return compactTop + 6;
  };

  const ensureSpace = (needed: number) => {
    y = ensureSpaceAt(needed, y);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...primary);
  doc.text("QUOTATION", PAGE_W / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(`Ref. : ${quotation.quotationRef}`, MARGIN_X, y);
  doc.text(`Date. : ${formatPdfDate(quotation.quotationDate)}`, PAGE_W - MARGIN_X, y, {
    align: "right",
  });
  y += 5;
  if (quotation.validUntil) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Valid until : ${formatPdfDate(quotation.validUntil)}`, PAGE_W - MARGIN_X, y, {
      align: "right",
    });
    y += 5;
  }
  y += 1.5;

  const customer = quotation.customer;
  const leftX = MARGIN_X;
  let leftY = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  const customerName = withMsPrefix(customer?.name || "");
  const nameLines = doc.splitTextToSize(customerName, 110);
  doc.text(nameLines, leftX, leftY);
  leftY += nameLines.length * 4.3;

  if (customer?.address) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const addressLines = doc.splitTextToSize(customer.address, 110);
    doc.text(addressLines, leftX, leftY);
    leftY += addressLines.length * 4;
  }

  leftY = kv(doc, "GSTIN", customer?.gstin || "", leftX, leftY + 1.2, 22, 110);
  leftY = kv(doc, "Tel.", customer?.phone || "", leftX, leftY, 22, 110);
  leftY = kv(doc, "Cell", customer?.mobile || "", leftX, leftY, 22, 110);
  leftY = kv(doc, "E-mail", customer?.email || "", leftX, leftY, 22, 110);
  leftY = kv(doc, "Kind Attn", customer?.kindAttn || "", leftX, leftY, 22, 110);

  y = leftY + 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text("Sub.", MARGIN_X, y);
  doc.setFont("helvetica", "bold");
  const subjectLines = doc.splitTextToSize(`:  ${quotation.subject || ""}`, CONTENT_W - 16);
  doc.text(subjectLines, MARGIN_X + 16, y);
  y += subjectLines.length * 4.2 + 3;

  doc.setFont("helvetica", "bold");
  doc.text("Dear Sir / Madam,", MARGIN_X, y);
  y += 5.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 46, 58);
  const intro = quotation.reference?.trim()
    ? `As per your Letter No: ${quotation.reference.trim()} regarding ${quotation.subject}. Please find below offer for the same.`
    : `Please find below our offer for ${quotation.subject}.`;
  const introLines = doc.splitTextToSize(intro, CONTENT_W);
  doc.text(introLines, MARGIN_X, y);
  y += introLines.length * 4.2 + 3;

  const items = quotation.items ?? [];
  autoTable(pdf, {
    startY: y,
    margin: { left: MARGIN_X, right: MARGIN_X, top: compactTop + 4, bottom: footerH + 2 },
    head: [["Sr. No.", "Description of Goods", "HSN/SAC", "Qty", "Unit", "Rate", "Total Amount"]],
    body: items.map((item) => [
      String(item.srNo ?? ""),
      item.description || "",
      item.hsnSac || "—",
      formatPdfQty(item.quantity),
      item.unit || "Nos",
      formatPdfMoney(item.rate),
      formatPdfMoney(item.amount),
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.6,
      textColor: NAVY,
      lineColor: RULE,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 62 },
      2: { cellWidth: 24, halign: "center" },
      3: { cellWidth: 16, halign: "right" },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 24, halign: "right" },
      6: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawCompactHeader(doc, letterhead, compactSubtitle, logo, primary);
      }
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 4;

  const financials = quotation.financials;
  const gstRate = financials?.gstRate ?? 18;
  const totalRows: [string, string][] = [
    ["Sub Total", formatPdfMoney(financials?.subtotal)],
  ];
  if (Number(financials?.cgst) > 0) {
    totalRows.push([`CGST (${gstRate / 2}%)`, formatPdfMoney(financials?.cgst)]);
  }
  if (Number(financials?.sgst) > 0) {
    totalRows.push([`SGST (${gstRate / 2}%)`, formatPdfMoney(financials?.sgst)]);
  }
  if (Number(financials?.igst) > 0) {
    totalRows.push([`IGST (${gstRate}%)`, formatPdfMoney(financials?.igst)]);
  }
  totalRows.push(["Total GST", formatPdfMoney(financials?.totalGst)]);
  totalRows.push([
    "Grand Total",
    formatPdfMoney(financials?.roundedGrandTotal ?? financials?.grandTotal),
  ]);

  ensureSpace(totalRows.length * 6 + 14);

  const totalsW = 78;
  const totalsX = PAGE_W - MARGIN_X - totalsW;
  autoTable(pdf, {
    startY: y,
    margin: { left: totalsX, right: MARGIN_X, top: compactTop + 4, bottom: footerH + 2 },
    body: totalRows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 },
      textColor: NAVY,
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 36, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === totalRows.length - 1) {
        data.cell.styles.fillColor = primary;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      } else if (data.row.index % 2 === 0) {
        data.cell.styles.fillColor = headerBg;
      }
    },
  });

  y = (doc.lastAutoTable?.finalY || y) + 6;
  ensureSpace(12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  const words = `Total Amount in words : ${financials?.amountInWords || "—"}`;
  const wordLines = doc.splitTextToSize(words, CONTENT_W);
  doc.text(wordLines, MARGIN_X, y);
  y += wordLines.length * 4.2 + 4;

  const termGroups = groupTerms(quotation.termsAndConditions ?? []);
  if (termGroups.length) {
    for (const group of termGroups) {
      ensureSpace(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...primary);
      doc.text(group.title || "Terms & Conditions", MARGIN_X, y);
      y += 5.5;
      doc.setDrawColor(...primary);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_X, y - 3.4, MARGIN_X + 42, y - 3.4);

      group.lines.forEach((term, index) => {
        const numberLabel = `${term.termNo || index + 1}.  `;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(40, 46, 58);
        const numberW = doc.getTextWidth(numberLabel);
        ensureSpace(3.5 + 2);
        const termTop = y;
        doc.text(numberLabel, MARGIN_X, termTop);
        const contentBottom = drawRichHtml(doc, term.content || "", {
          x: MARGIN_X + numberW,
          y: termTop,
          maxWidth: CONTENT_W - numberW,
          fontSize: 8,
          lineHeight: 3.5,
          color: [40, 46, 58],
          ensureSpace: ensureSpaceAt,
        });
        y = (contentBottom === termTop ? termTop + 3.5 : contentBottom) + 2.2;
      });
      y += 1.5;
    }
  }

  const bank = quotation.bankDetails;
  const bankRows: [string, string][] = [
    ["Beneficiary Name", bank?.beneficiaryName || ""],
    ["Account No.", bank?.accountNo || ""],
    ["Bank Name", bank?.bankName || ""],
    ["Branch", bank?.branch || ""],
    ["IFSC Code", bank?.ifscCode || ""],
    ["SWIFT Code", bank?.swiftCode || ""],
    ["MICR Code", bank?.micrCode || ""],
  ].filter(([, value]) => value) as [string, string][];

  ensureSpace(10 + bankRows.length * 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primary);
  doc.text("BANK DETAILS", MARGIN_X, y);
  y += 5.4;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y - 3.4, MARGIN_X + 36, y - 3.4);

  for (const [label, value] of bankRows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.setFontSize(7.8);
    doc.text(label, MARGIN_X, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NAVY);
    const wrapped = doc.splitTextToSize(value, CONTENT_W - 42);
    doc.text(wrapped, MARGIN_X + 40, y);
    y += Math.max(1, wrapped.length) * 3.4 + 1.2;
  }

  const acceptEnabled = quotation.orderAcceptance?.enabled !== false;
  const colGap = 8;
  const colW = (CONTENT_W - colGap) / 2;
  const leftCol = MARGIN_X;
  const rightCol = MARGIN_X + colW + colGap;
  const signatory = quotation.signatory;
  const electronic = isElectronicSignatory(signatory);
  const acceptName = withMsPrefix(
    quotation.orderAcceptance?.companyName ||
      quotation.orderAcceptance?.customerName ||
      customer?.name ||
      "",
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const acceptNameLines = acceptEnabled
    ? doc.splitTextToSize(acceptName, colW - 10)
    : [];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  const signCompanyLines = doc.splitTextToSize(
    signatory?.companyName || letterhead.brandName,
    colW - 4,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const signName = signatoryDisplayName(signatory);
  const signNameLines = doc.splitTextToSize(signName, colW - 4);
  const signDesignationLines = doc.splitTextToSize(
    signatory?.designation || "Authorized Signatory",
    colW - 4,
  );
  const phone = signatoryPhone(signatory, letterhead.phone);
  const signPhoneLines = phone ? doc.splitTextToSize(`Tel. ${phone}`, colW - 4) : [];
  const electronicNoteLines = electronic
    ? doc.splitTextToSize(ELECTRONIC_QUOTATION_NOTE, colW - 4)
    : [];
  const acceptH = acceptEnabled ? 18 + acceptNameLines.length * 4 : 0;
  const signH = electronic
    ? 6 +
      signCompanyLines.length * 4.2 +
      6 +
      electronicNoteLines.length * 3.8 +
      4 +
      signNameLines.length * 4.2 +
      signDesignationLines.length * 3.6 +
      signPhoneLines.length * 3.6 +
      4.6
    : 6 +
      signCompanyLines.length * 4.2 +
      22 +
      (signNameLines.length - 1) * 4.2 +
      (signDesignationLines.length - 1) * 3.6 +
      signPhoneLines.length * 3.6;
  const blockH = Math.max(40, acceptH, signH);

  y += 6;
  ensureSpace(blockH + 4);
  const blockTop = y;

  if (acceptEnabled) {
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.35);
    doc.rect(rightCol, blockTop, colW, blockH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...primary);
    doc.text("Order Acceptance", rightCol + 4, blockTop + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(acceptNameLines, rightCol + 4, blockTop + 12);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("(Name / Company Seal)", rightCol + 4, blockTop + blockH - 4);
  }

  const signX = leftCol;
  let signY = blockTop + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("For and on behalf of:", signX, signY);
  signY += 5;
  doc.setFontSize(9.5);
  doc.text(signCompanyLines, signX, signY);
  signY += signCompanyLines.length * 4.2;

  if (electronic) {
    signY += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(electronicNoteLines, signX, signY);
    signY += electronicNoteLines.length * 3.8 + 3;
  } else {
    signY += 12;
    doc.setDrawColor(...RULE);
    doc.line(signX, signY, signX + colW - 4, signY);
    signY += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(signNameLines, signX, signY);
  signY += signNameLines.length * 4.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(signDesignationLines, signX, signY);
  signY += signDesignationLines.length * 3.6;
  if (signPhoneLines.length) {
    doc.text(signPhoneLines, signX, signY);
    signY += signPhoneLines.length * 3.6;
  }
  signY += 0.6;
  doc.text(signatory?.companyName || letterhead.brandName, signX, signY);

  y = blockTop + blockH + 4;

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(doc, letterhead, page, totalPages, primary, footerH);
  }

  return doc.output("blob");
}
