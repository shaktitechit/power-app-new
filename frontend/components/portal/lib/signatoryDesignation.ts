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

export const DEFAULT_SIGNATORY_DESIGNATION = "Authorized Signatory";

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
