import type { Company, CompanyBranchOffice } from "@/store/slices/companyApiSlice";
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_COMPANY_LOGO,
} from "@/components/portal/lib/companyBranding";

export const LETTERHEAD_TAGLINE = "";

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN_X = 12;
export const TOP_BAR_H = 3.2;
export const MIN_FOOTER_H = 22;
export const FOOTER_LINE_H = 2.6;
export const COMPACT_HEADER_H = 20;
export const CONTENT_W = PAGE_W - MARGIN_X * 2;
/** Y where table body may start on continuation pages (below compact header). */
export const COMPACT_HEADER_BOTTOM = TOP_BAR_H + COMPACT_HEADER_H + 4;

export type PdfPageLayout = {
  pageW: number;
  pageH: number;
  marginX: number;
  contentW: number;
};

export const PORTRAIT_PAGE_LAYOUT: PdfPageLayout = {
  pageW: PAGE_W,
  pageH: PAGE_H,
  marginX: MARGIN_X,
  contentW: CONTENT_W,
};

export const LANDSCAPE_PAGE_LAYOUT: PdfPageLayout = {
  pageW: PAGE_H,
  pageH: PAGE_W,
  marginX: MARGIN_X,
  contentW: PAGE_H - MARGIN_X * 2,
};

function resolveLayout(layout?: PdfPageLayout): PdfPageLayout {
  return layout ?? PORTRAIT_PAGE_LAYOUT;
}

export const NAVY: [number, number, number] = [18, 40, 78];
export const MUTED: [number, number, number] = [70, 78, 90];
export const RULE: [number, number, number] = [186, 192, 204];

export type Rgb = [number, number, number];

export type LogoImage = {
  dataUrl: string;
  width: number;
  height: number;
};

export type OfficeLine = {
  label: string;
  address: string;
  gstin: string;
  city: string;
  state: string;
};

export type Letterhead = {
  brandName: string;
  tagline: string;
  offices: OfficeLine[];
  phone: string;
  mobile: string;
  emails: string;
  website: string;
  gstinLine: string;
  footerLines: string[];
  citiesLine: string;
};

export type CompanySnapshot = {
  name?: string;
  address?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  gstin?: string;
};

export type JsPdfDoc = {
  lastAutoTable?: { finalY: number };
  setPage: (n: number) => void;
  addPage: () => void;
  setFont: (name: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setFillColor: (r: number, g: number, b: number) => void;
  setLineWidth: (w: number) => void;
  getTextWidth: (text: string) => number;
  splitTextToSize: (text: string, width: number) => string[];
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  addImage: (
    data: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
  output: (type: "blob") => Blob;
  getNumberOfPages: () => number;
};

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.trim().replace("#", "");
  const full =
    normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized;
  const match = full.match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return [99, 108, 203];
  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16),
  ];
}

export function lighten(rgb: Rgb, amount = 0.88): Rgb {
  return rgb.map((channel) => Math.round(channel + (255 - channel) * amount)) as Rgb;
}

export function joinParts(...parts: Array<string | undefined | null>) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(", ");
}

export function stripWebsite(value?: string) {
  return String(value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .trim();
}

export function formatPdfDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatPdfDateTime(value?: string | Date | null) {
  if (!value) return formatPdfDate(new Date().toISOString());
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  return `${dd}-${mm}-${yyyy} ${strTime}`;
}

function officeAddress(office: Partial<CompanyBranchOffice>) {
  const cityState = joinParts(
    office.city,
    office.state && office.pincode ? `${office.state}-${office.pincode}` : office.state,
    !office.state && office.pincode ? office.pincode : "",
    office.country,
  );
  return joinParts(office.address, cityState);
}

export function buildCompanyLetterhead(
  company?: Company | null,
  snapshot?: CompanySnapshot | null,
  brandName?: string,
): Letterhead {
  const displayBrand =
    company?.legal_name?.trim() ||
    brandName?.trim() ||
    company?.trade_name?.trim() ||
    snapshot?.name?.trim() ||
    DEFAULT_COMPANY_NAME;

  const branches = Array.isArray(company?.branch_offices) ? company.branch_offices : [];
  const offices: OfficeLine[] = branches
    .map((office) => ({
      label: office.is_head_office
        ? "Head Office"
        : office.name?.trim() || office.city?.trim() || "Office",
      address: officeAddress(office),
      gstin: office.gstin?.trim() || "",
      city: office.city?.trim() || "",
      state: office.state?.trim() || "",
      head: Boolean(office.is_head_office),
    }))
    .filter((office) => office.address)
    .sort((a, b) => Number(b.head) - Number(a.head))
    .map(({ head: _head, ...office }) => office);

  if (offices.length === 0) {
    const fallbackAddress =
      snapshot?.address?.trim() ||
      officeAddress({
        address: company?.address,
        city: company?.city,
        state: company?.state,
        pincode: company?.pincode,
        country: company?.country,
      });
    if (fallbackAddress) {
      offices.push({
        label: "Head Office",
        address: fallbackAddress,
        gstin: snapshot?.gstin?.trim() || company?.gstin?.trim() || "",
        city: company?.city?.trim() || "",
        state: company?.state?.trim() || "",
      });
    }
  }

  const gstinBits = offices
    .filter((office) => office.gstin)
    .map((office) => {
      const place = (office.state || office.label).toUpperCase();
      return `${place} ${office.gstin}`;
    });
  const gstinLine = gstinBits.length
    ? `GSTIN : ${gstinBits.join(". ")}`
    : snapshot?.gstin || company?.gstin
      ? `GSTIN : ${snapshot?.gstin || company?.gstin}`
      : "";

  const emails = [company?.email, company?.billing_email, snapshot?.email]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(", ");

  const website = stripWebsite(company?.website || snapshot?.website);
  const phone = company?.phone?.trim() || snapshot?.phone?.trim() || "";
  const mobile = snapshot?.mobile?.trim() || "";

  const footerLines = [
    ...offices.map((office) => `${office.label}: ${office.address}`),
    [phone && `Phone : ${phone}`, mobile && `Mob. : ${mobile}`].filter(Boolean).join("   "),
    [emails && `Email : ${emails}`, website && `Website : ${website}`]
      .filter(Boolean)
      .join("   "),
    company?.invoice_footer_note?.trim() || "",
  ].filter(Boolean);

  const cities = [...new Set(offices.map((office) => office.city).filter(Boolean))];

  return {
    brandName: displayBrand,
    tagline: company?.tagline?.trim() || LETTERHEAD_TAGLINE,
    offices,
    phone,
    mobile,
    emails,
    website,
    gstinLine,
    footerLines,
    citiesLine: cities.join("  ||  "),
  };
}

async function loadSingleImageSource(url: string): Promise<LogoImage | null> {
  if (!url || typeof url !== "string") return null;
  try {
    if (url.startsWith("data:image")) {
      return new Promise<LogoImage | null>((resolve) => {
        const image = new Image();
        image.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, image.naturalWidth);
            canvas.height = Math.max(1, image.naturalHeight);
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);
            ctx.drawImage(image, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            resolve({ dataUrl, width: canvas.width, height: canvas.height });
          } catch {
            resolve(null);
          }
        };
        image.onerror = () => resolve(null);
        image.src = url;
      });
    }

    const cleanUrl = url.replace(/^http:\/\/localhost:5000/, "");

    // 1. Try fetch first
    const res = await fetch(cleanUrl, { credentials: "include", cache: "no-store" }).catch(() => null);
    if (res && res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const logoImg = await new Promise<LogoImage | null>((resolve) => {
          const image = new Image();
          image.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = Math.max(1, image.naturalWidth);
              canvas.height = Math.max(1, image.naturalHeight);
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve(null);
              ctx.drawImage(image, 0, 0);
              const mime = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";
              const dataUrl = canvas.toDataURL(mime);
              resolve({ dataUrl, width: canvas.width, height: canvas.height });
            } catch {
              resolve(null);
            }
          };
          image.onerror = () => resolve(null);
          image.src = objectUrl;
        });
        if (logoImg) return logoImg;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }

    // 2. Fallback: try loading directly via HTMLImageElement
    return new Promise<LogoImage | null>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, image.naturalWidth);
          canvas.height = Math.max(1, image.naturalHeight);
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(image, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg");
          resolve({ dataUrl, width: canvas.width, height: canvas.height });
        } catch {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = cleanUrl;
    });
  } catch {
    return null;
  }
}

export async function loadLogo(src?: string): Promise<LogoImage | null> {
  const targetSrc = src && src.trim() ? src.trim() : DEFAULT_COMPANY_LOGO;
  let logo = await loadSingleImageSource(targetSrc);
  if (!logo && targetSrc !== DEFAULT_COMPANY_LOGO) {
    logo = await loadSingleImageSource(DEFAULT_COMPANY_LOGO);
  }
  return logo;
}

function logoBox(logo: LogoImage | null, maxW: number, maxH: number) {
  if (!logo || !logo.width || !logo.height) return { w: 0, h: 0 };
  const ratio = logo.width / logo.height;
  let h = maxH;
  let w = h * ratio;
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  return { w, h };
}

function contactLine(letterhead: Letterhead) {
  return [
    letterhead.phone && `Phone No : ${letterhead.phone}`,
    letterhead.mobile && `Mob. : ${letterhead.mobile}`,
    letterhead.emails && `Email Id : ${letterhead.emails}`,
    letterhead.website && `Website : ${letterhead.website}`,
  ]
    .filter(Boolean)
    .join("   ");
}

export function drawTopBar(doc: JsPdfDoc, primary: Rgb, layout?: PdfPageLayout) {
  const L = resolveLayout(layout);
  doc.setFillColor(...primary);
  doc.rect(0, 0, L.pageW, TOP_BAR_H, "F");
}

export function measureFooterHeight(
  doc: JsPdfDoc,
  letterhead: Letterhead,
  layout?: PdfPageLayout,
) {
  const L = resolveLayout(layout);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  const wrapW = L.contentW - 8;
  let lines = 0;
  for (const line of letterhead.footerLines) {
    lines += Math.max(1, doc.splitTextToSize(line, wrapW).length);
  }
  if (letterhead.citiesLine) {
    doc.setFont("helvetica", "bold");
    lines += Math.max(1, doc.splitTextToSize(letterhead.citiesLine, wrapW - 24).length);
  }
  return Math.max(MIN_FOOTER_H, 4 + lines * FOOTER_LINE_H + 7);
}

export function drawFooter(
  doc: JsPdfDoc,
  letterhead: Letterhead,
  page: number,
  totalPages: number,
  primary: Rgb,
  footerH: number,
  layout?: PdfPageLayout,
  generatedByInfo?: string,
) {
  const L = resolveLayout(layout);
  const top = L.pageH - footerH;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.45);
  doc.line(L.marginX, top, L.pageW - L.marginX, top);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(...MUTED);
  const wrapW = L.contentW - 8;
  let y = top + 3.6;
  for (const line of letterhead.footerLines) {
    const wrapped = doc.splitTextToSize(line, wrapW);
    if (y + wrapped.length * FOOTER_LINE_H > L.pageH - 7) break;
    doc.text(wrapped, L.pageW / 2, y, { align: "center" });
    y += wrapped.length * FOOTER_LINE_H;
  }
  if (letterhead.citiesLine && y < L.pageH - 6.4) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    const cityLines = doc.splitTextToSize(letterhead.citiesLine, wrapW - 24);
    doc.text(cityLines, L.pageW / 2, y + 1.1, { align: "center" });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  if (generatedByInfo) {
    doc.text(generatedByInfo, L.marginX, L.pageH - 4.5, { align: "left" });
  }
  doc.text(`Page ${page} of ${totalPages}`, L.pageW - L.marginX, L.pageH - 4.5, {
    align: "right",
  });
}

export function drawCompactHeader(
  doc: JsPdfDoc,
  letterhead: Letterhead,
  subtitle: string,
  logo: LogoImage | null,
  primary: Rgb,
  layout?: PdfPageLayout,
) {
  const L = resolveLayout(layout);
  drawTopBar(doc, primary, L);
  const logoSize = logoBox(logo, 16, 12);
  const y = TOP_BAR_H + 3.2;
  if (logo && logoSize.w) {
    doc.addImage(logo.dataUrl, "PNG", L.marginX, y, logoSize.w, logoSize.h);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(letterhead.brandName, L.pageW / 2, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, L.pageW / 2, y + 10, { align: "center" });
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.line(
    L.marginX,
    COMPACT_HEADER_H + TOP_BAR_H - 1.2,
    L.pageW - L.marginX,
    COMPACT_HEADER_H + TOP_BAR_H - 1.2,
  );
}

export function drawFullLetterhead(
  doc: JsPdfDoc,
  letterhead: Letterhead,
  logo: LogoImage | null,
  primary: Rgb,
  layout?: PdfPageLayout,
) {
  const L = resolveLayout(layout);
  drawTopBar(doc, primary, L);
  const logoSize = logoBox(logo, 28, 20);
  const headerTop = TOP_BAR_H + 4;
  if (logo && logoSize.w) {
    doc.addImage(logo.dataUrl, "PNG", L.marginX, headerTop, logoSize.w, logoSize.h);
  }

  doc.setFont("helvetica", "bold");
  let nameSize = 13.5;
  const brand = letterhead.brandName.toUpperCase();
  doc.setFontSize(nameSize);
  while (doc.getTextWidth(brand) > L.contentW - 40 && nameSize > 9) {
    nameSize -= 0.4;
    doc.setFontSize(nameSize);
  }
  doc.setTextColor(...NAVY);
  doc.text(brand, L.pageW / 2, headerTop + 7, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.4);
  doc.setTextColor(...MUTED);
  const tagLines = doc.splitTextToSize(letterhead.tagline, L.contentW - 40);
  doc.text(tagLines, L.pageW / 2, headerTop + 12.2, { align: "center" });

  let y = Math.max(headerTop + logoSize.h, headerTop + 16) + 3.4;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.45);
  doc.line(L.marginX, y, L.pageW - L.marginX, y);
  y += 4.4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(40, 46, 58);

  for (const office of letterhead.offices) {
    const label = `${office.label}: `;
    doc.setFont("helvetica", "bold");
    doc.text(label, L.marginX, y);
    const labelW = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(office.address, L.contentW - labelW);
    wrapped.forEach((line) => {
      doc.text(line, L.marginX + labelW, y);
      y += 3.15;
    });
    if (!wrapped.length) y += 3.15;
  }

  const contacts = contactLine(letterhead);
  if (contacts) {
    const contactLines = doc.splitTextToSize(contacts, L.contentW);
    doc.text(contactLines, L.marginX, y);
    y += contactLines.length * 3.15;
  }
  if (letterhead.gstinLine) {
    doc.setFont("helvetica", "bold");
    const gstLines = doc.splitTextToSize(letterhead.gstinLine, L.contentW);
    doc.text(gstLines, L.marginX, y);
    y += gstLines.length * 3.15;
  }

  y += 1.2;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.45);
  doc.line(L.marginX, y, L.pageW - L.marginX, y);
  return y + 5;
}
