export const DEFAULT_COMPANY_NAME = "Shakti Powers";
export const DEFAULT_COMPANY_LOGO = "/spspl-logo.jpeg";
export const DEFAULT_PRIMARY_COLOR = "#636ccb";
export const DEFAULT_SECONDARY_COLOR = "#6e8cfb";

export const THEME_PALETTES = [
  { id: "default", label: "Default", primary: DEFAULT_PRIMARY_COLOR, secondary: DEFAULT_SECONDARY_COLOR },
  { id: "ocean", label: "Ocean", primary: "#0284c7", secondary: "#38bdf8" },
  { id: "forest", label: "Forest", primary: "#15803d", secondary: "#4ade80" },
  { id: "sunset", label: "Sunset", primary: "#ea580c", secondary: "#fb923c" },
  { id: "rose", label: "Rose", primary: "#e11d48", secondary: "#fb7185" },
  { id: "violet", label: "Violet", primary: "#7c3aed", secondary: "#a78bfa" },
  { id: "gold", label: "Gold", primary: "#b45309", secondary: "#fbbf24" },
  { id: "slate", label: "Slate", primary: "#334155", secondary: "#94a3b8" },
] as const;

export type ThemePaletteId = (typeof THEME_PALETTES)[number]["id"];

export type CompanyBranding = {
  legal_name?: string;
  trade_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  theme_palette?: string;
  updated_at?: string;
};

function hexToRgb(hex: string) {
  const normalized = hex.trim().replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const match = full.match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  };
}

export function foregroundForHex(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
}

export function resolveCompanyColors(branding?: CompanyBranding | null) {
  const palette = THEME_PALETTES.find((item) => item.id === branding?.theme_palette);
  const primary = branding?.primary_color?.trim() || palette?.primary || DEFAULT_PRIMARY_COLOR;
  const secondary =
    branding?.secondary_color?.trim() || palette?.secondary || DEFAULT_SECONDARY_COLOR;
  return { primary, secondary };
}

export function companyDisplayName(branding?: CompanyBranding | null) {
  return branding?.trade_name?.trim() || branding?.legal_name?.trim() || DEFAULT_COMPANY_NAME;
}

export function companyLogoSrc(branding?: CompanyBranding | null) {
  if (!branding?.logo_url?.trim()) return DEFAULT_COMPANY_LOGO;
  const version = branding.updated_at ? `?v=${encodeURIComponent(branding.updated_at)}` : "";
  return `/api/v1/companies/branding/logo${version}`;
}

export function companyFaviconSrc(branding?: CompanyBranding | null) {
  if (!branding?.favicon_url?.trim()) {
    return branding?.logo_url?.trim() ? companyLogoSrc(branding) : DEFAULT_COMPANY_LOGO;
  }
  const version = branding.updated_at ? `?v=${encodeURIComponent(branding.updated_at)}` : "";
  return `/api/v1/companies/branding/favicon${version}`;
}
