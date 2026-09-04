import type {
  EnquiryStatus,
  RequestedAuditType,
} from "@/store/slices/enquiryApiSlice";

export const ENQUIRY_STATUS_OPTIONS: { value: EnquiryStatus; label: string }[] =
  [
    { value: "new", label: "New" },
    { value: "assigned", label: "Assigned" },
    { value: "follow_up", label: "Follow-up" },
    { value: "eoi_sent", label: "EOI Sent" },
    { value: "quoted", label: "Quoted" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
    { value: "dropped", label: "Dropped" },
  ];

export const ENQUIRY_PIPELINE_STEPS = [
  { key: "new", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "follow_up", label: "Follow-up" },
  { key: "eoi_sent", label: "EOI Sent" },
  { key: "quoted", label: "Quoted" },
  { key: "decision", label: "Decision" },
] as const;

const LEGACY_STATUS_MAP: Record<string, EnquiryStatus> = {
  contacted: "assigned",
  in_discussion: "follow_up",
  eoq_uploaded: "eoi_sent",
  negotiation: "quoted",
};

const STATUS_FILTER_ALIASES: Record<string, string[]> = {
  assigned: ["assigned", "contacted"],
  follow_up: ["follow_up", "in_discussion"],
  eoi_sent: ["eoi_sent", "eoq_uploaded"],
  quoted: ["quoted", "negotiation"],
};

export const TERMINAL_ENQUIRY_STATUSES = new Set<EnquiryStatus>([
  "won",
  "lost",
  "dropped",
]);

export const REQUESTED_AUDIT_TYPE_OPTIONS: {
  value: RequestedAuditType;
  label: string;
}[] = [
  { value: "Electrical Energy Audit", label: "Electrical Energy Audit" },
  { value: "Electrical Safety Audit", label: "Electrical Safety Audit" },
  { value: "Thermal Audit", label: "Thermal Audit" },
  {
    value: "Lightning Arrester Audit",
    label: "Lightning Arrester Audit",
  },
];

export function pipelineStatusValue(status: string): EnquiryStatus {
  return (LEGACY_STATUS_MAP[status] ?? status) as EnquiryStatus;
}

export function enquiryStatusLabel(status: string): string {
  const canonical = pipelineStatusValue(status);
  return (
    ENQUIRY_STATUS_OPTIONS.find((o) => o.value === canonical)?.label ??
    status.replace(/_/g, " ")
  );
}

export function enquiryStatusMatchesFilter(
  rowStatus: string | undefined,
  filterStatus: string,
): boolean {
  if (!filterStatus || filterStatus === "all") return true;
  const aliases = STATUS_FILTER_ALIASES[filterStatus] ?? [filterStatus];
  return aliases.includes(rowStatus ?? "");
}

export function pipelineStepIndex(status: string): number {
  const canonical = pipelineStatusValue(status);
  if (TERMINAL_ENQUIRY_STATUSES.has(canonical)) return 5;
  const map: Record<string, number> = {
    new: 0,
    assigned: 1,
    follow_up: 2,
    eoi_sent: 3,
    quoted: 4,
  };
  return map[canonical] ?? 0;
}

export function decisionStatusLabel(status: string): string {
  const canonical = pipelineStatusValue(status);
  if (canonical === "won") return "Won";
  if (canonical === "lost") return "Lost";
  if (canonical === "dropped") return "Dropped";
  return "Decision";
}

export type QuotationStatus =
  | "draft"
  | "pending_approval"
  | "sent"
  | "viewed"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "expired";

export const QUOTATION_STATUS_OPTIONS: {
  value: QuotationStatus;
  label: string;
}[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "sent", label: "Sent to client" },
  { value: "viewed", label: "Viewed" },
  { value: "revision_requested", label: "Revision requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

export function quotationStatusLabel(status: string): string {
  return (
    QUOTATION_STATUS_OPTIONS.find((o) => o.value === status)?.label ??
    status.replace(/_/g, " ")
  );
}

export const FOLLOW_UP_MODE_OPTIONS = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

/** `<input type="datetime-local">` value (local wall time) → ISO instant. */
export function datetimeLocalToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** ISO instant → `<input type="datetime-local">` value in the viewer's zone. */
export function isoToDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export const FOLLOW_UP_OUTCOME_OPTIONS = [
  { value: "no_response", label: "No response" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "callback_later", label: "Callback later" },
  { value: "meeting_scheduled", label: "Meeting scheduled" },
] as const;
