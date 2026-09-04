/**
 * Default designation printed under the authorized signatory on quotations and
 * expressions of interest. Mirrors the backend fallback map so the PDF matches
 * whatever the API would have stored on its own.
 */
const ROLE_DESIGNATION: Record<string, string> = {
  super_admin: "Director",
  admin: "Admin",
  manager: "Manager",
};

export const SIGNATORY_ROLES = ["super_admin", "admin", "manager"] as const;

export function isEligibleSignatoryRole(role?: string | null): boolean {
  if (!role || role === "auditor") return false;
  return (SIGNATORY_ROLES as readonly string[]).includes(role);
}

export const DEFAULT_SIGNATORY_DESIGNATION = "Authorized Signatory";

export const ELECTRONIC_SIGNATORY_LABEL = "Electronically generated — no signature required";
export const ELECTRONIC_QUOTATION_NOTE =
  "This is an electronically generated quotation and does not require a signature.";
export const ELECTRONIC_EOI_NOTE =
  "This is an electronically generated expression of interest and does not require a signature.";

export function isElectronicSignatory(signatory?: { electronic?: boolean } | null) {
  return Boolean(signatory?.electronic);
}

export function signatoryDisplayName(
  signatory?: {
    name?: string;
    userId?: string | { name?: string } | null;
  } | null,
) {
  const stored = String(signatory?.name || "").trim();
  const userId = signatory?.userId;
  const populated =
    userId && typeof userId === "object" ? String(userId.name || "").trim() : "";
  if (stored && stored.toLowerCase() !== "electronically generated") return stored;
  return populated || stored || "Authorized Signatory";
}

export function signatoryPhone(
  signatory?: {
    phone?: string;
    userId?: string | { phone?: string } | null;
  } | null,
  fallback = "",
) {
  const stored = String(signatory?.phone || "").trim();
  if (stored) return stored;
  const userId = signatory?.userId;
  if (userId && typeof userId === "object") {
    const fromUser = String(userId.phone || "").trim();
    if (fromUser) return fromUser;
  }
  return String(fallback || "").trim();
}

export function signatoryDesignationForRole(role?: string | null) {
  if (!role) return "";
  return ROLE_DESIGNATION[role] || "";
}

/** True when the value is only a role default, so it is safe to auto-replace. */
export function isDefaultSignatoryDesignation(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === DEFAULT_SIGNATORY_DESIGNATION) return true;
  return Object.values(ROLE_DESIGNATION).includes(trimmed);
}
