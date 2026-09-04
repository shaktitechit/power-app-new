import type { EoiStatus, ExpressionOfInterest } from "@/store/slices/eoiApiSlice";

export const EOI_STATUS_OPTIONS: { value: EoiStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const DEFAULT_EOI_SALUTATION = "Dear Sir,";
export const DEFAULT_EOI_CLOSE = "Thanking you.\nYours faithfully,";
export const DEFAULT_EOI_COMPANY = "Shakti Power Solutions Pvt. Ltd.";

export function eoiStatusLabel(status: string): string {
  return (
    EOI_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status.replace(/_/g, " ")
  );
}

export function eoiEnquiryId(eoi: ExpressionOfInterest): string | undefined {
  const enquiry = eoi.enquiryId;
  if (!enquiry) return undefined;
  if (typeof enquiry === "string") return enquiry;
  return enquiry._id;
}

export function eoiEnquiryLabel(eoi: ExpressionOfInterest): string {
  const enquiry = eoi.enquiryId;
  if (enquiry && typeof enquiry === "object") {
    return enquiry.enquiry_number || enquiry.name || "—";
  }
  return "—";
}

export function eoiRecipientLabel(eoi: ExpressionOfInterest): string {
  return eoi.recipient?.organization?.trim() || "—";
}

function auditAssignment(enquiry?: {
  name?: string;
  city?: string;
  requested_audit_types?: string[];
}) {
  const types = Array.isArray(enquiry?.requested_audit_types)
    ? enquiry.requested_audit_types.filter(Boolean)
    : [];
  const assignment = types.length ? types.join(", ") : "Energy Audit";
  const location = String(enquiry?.city || enquiry?.name || "").trim();
  return { assignment, location };
}

export function defaultEoiSubject(enquiry?: {
  name?: string;
  city?: string;
  requested_audit_types?: string[];
}) {
  const { assignment, location } = auditAssignment(enquiry);
  if (location) {
    return `Submission of Expression of Interest (EOI) for Conducting ${assignment} at ${location}`;
  }
  return `Submission of Expression of Interest (EOI) for Conducting ${assignment}`;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function eoiBodyForEditor(body?: string) {
  const value = String(body || "").trim();
  if (!value) return "";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function defaultEoiBody(
  enquiry?: {
    name?: string;
    city?: string;
    requested_audit_types?: string[];
  },
  companyName = DEFAULT_EOI_COMPANY,
) {
  const { assignment, location } = auditAssignment(enquiry);
  const place = location ? ` at ${location}` : "";
  return [
    `With reference to our telephonic discussion, please find attached our Expression of Interest (EOI) along with the required documents for conducting the ${escapeHtml(assignment)}${escapeHtml(place)}.`,
    `${escapeHtml(companyName)} possesses the necessary technical expertise, qualified manpower, audit instruments, and relevant experience to successfully undertake the assignment.`,
    "We request you to kindly review the enclosed documents and let us know if any additional information or clarification is required.",
  ]
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
}

export const EOI_STATUS_TRANSITIONS: Record<EoiStatus, EoiStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "DRAFT"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["DRAFT", "CANCELLED"],
  EXPIRED: ["DRAFT", "CANCELLED"],
  CANCELLED: ["DRAFT"],
};

export function canEditEoi(
  status: EoiStatus,
  doc?: Pick<ExpressionOfInterest, "signatoryApproval"> | null,
) {
  if (status === "ACCEPTED" || status === "REJECTED" || status === "CANCELLED") {
    return false;
  }
  return String(doc?.signatoryApproval?.status || "").toUpperCase() !== "APPROVED";
}

export function canSendEoiEmail(status: EoiStatus) {
  return status === "DRAFT" || status === "SENT" || status === "ACCEPTED";
}
