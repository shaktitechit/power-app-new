"use client";

import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { REQUESTED_AUDIT_TYPE_OPTIONS } from "@/components/portal/lib/enquiryConstants";
import { formatInr } from "@/components/portal/lib/quotationConstants";
import type {
  RequestedAudit,
  RequestedAuditType,
} from "@/store/slices/enquiryApiSlice";

export type EnquiryRequestedAudit = {
  audit_type: RequestedAuditType;
  /** Kept as raw input text so partially typed amounts survive re-renders. */
  expected_value: string;
};

const AUDIT_TYPE_ORDER = REQUESTED_AUDIT_TYPE_OPTIONS.map((o) => o.value);

function isRequestedAuditType(value: unknown): value is RequestedAuditType {
  return AUDIT_TYPE_ORDER.includes(value as RequestedAuditType);
}

function sortByAuditOrder(
  rows: EnquiryRequestedAudit[],
): EnquiryRequestedAudit[] {
  return [...rows].sort(
    (a, b) =>
      AUDIT_TYPE_ORDER.indexOf(a.audit_type) -
      AUDIT_TYPE_ORDER.indexOf(b.audit_type),
  );
}

export function hydrateEnquiryRequestedAudits(enquiry?: {
  requested_audits?: RequestedAudit[];
  requested_audit_types?: RequestedAuditType[];
  expected_value?: number | null;
}): EnquiryRequestedAudit[] {
  const stored = (enquiry?.requested_audits ?? []).filter((row) =>
    isRequestedAuditType(row?.audit_type),
  );
  if (stored.length > 0) {
    return sortByAuditOrder(
      stored.map((row) => ({
        audit_type: row.audit_type,
        expected_value: row.expected_value != null ? String(row.expected_value) : "",
      })),
    );
  }

  // Enquiries created before the breakdown existed only have a single total,
  // so park it on the first audit to keep the enquiry's total intact.
  const legacyTotal = enquiry?.expected_value;
  return (enquiry?.requested_audit_types ?? [])
    .filter(isRequestedAuditType)
    .sort((a, b) => AUDIT_TYPE_ORDER.indexOf(a) - AUDIT_TYPE_ORDER.indexOf(b))
    .map((audit_type, index) => ({
      audit_type,
      expected_value:
        index === 0 && legacyTotal != null ? String(legacyTotal) : "",
    }));
}

/** Amount for one row, or `null` when the text is not a usable amount. */
export function parseRequestedAuditValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

export function requestedAuditsTotal(rows: EnquiryRequestedAudit[]): number {
  return rows.reduce(
    (total, row) => total + (parseRequestedAuditValue(row.expected_value) ?? 0),
    0,
  );
}

/** First row with an unusable amount, or `null` when every row is valid. */
export function findInvalidRequestedAudit(
  rows: EnquiryRequestedAudit[],
): EnquiryRequestedAudit | null {
  return (
    rows.find((row) => parseRequestedAuditValue(row.expected_value) === null) ??
    null
  );
}

export function sanitizeEnquiryRequestedAudits(
  rows: EnquiryRequestedAudit[],
): RequestedAudit[] {
  return sortByAuditOrder(rows).map((row) => ({
    audit_type: row.audit_type,
    expected_value: parseRequestedAuditValue(row.expected_value) ?? 0,
  }));
}

type Props = {
  value: EnquiryRequestedAudit[];
  onChange: (next: EnquiryRequestedAudit[]) => void;
  idPrefix: string;
  disabled?: boolean;
};

export function EnquiryRequestedAuditsFields({
  value,
  onChange,
  idPrefix,
  disabled = false,
}: Props) {
  const toggleAuditType = (auditType: RequestedAuditType) => {
    const isSelected = value.some((row) => row.audit_type === auditType);
    onChange(
      isSelected
        ? value.filter((row) => row.audit_type !== auditType)
        : sortByAuditOrder([
            ...value,
            { audit_type: auditType, expected_value: "" },
          ]),
    );
  };

  const updateExpectedValue = (
    auditType: RequestedAuditType,
    fieldValue: string,
  ) => {
    onChange(
      value.map((row) =>
        row.audit_type === auditType
          ? { ...row, expected_value: fieldValue }
          : row,
      ),
    );
  };

  const total = requestedAuditsTotal(value);

  return (
    <div className="space-y-3">
      <Label>Requested audit types</Label>

      <div className="space-y-2">
        {REQUESTED_AUDIT_TYPE_OPTIONS.map((option, index) => {
          const row = value.find((r) => r.audit_type === option.value);
          const valueId = `${idPrefix}-audit-ev-${index}`;

          return (
            <div
              key={option.value}
              className="flex flex-col gap-2 rounded-md border border-border px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(row)}
                  onChange={() => toggleAuditType(option.value)}
                  className="rounded border-input"
                  disabled={disabled}
                />
                <span>{option.label}</span>
              </label>

              {row ? (
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Label
                    htmlFor={valueId}
                    className="whitespace-nowrap text-xs text-muted-foreground"
                  >
                    Expected value
                  </Label>
                  <Input
                    id={valueId}
                    type="number"
                    min={0}
                    step="any"
                    value={row.expected_value}
                    onChange={(e) =>
                      updateExpectedValue(option.value, e.target.value)
                    }
                    placeholder="0"
                    disabled={disabled}
                    className="h-8 sm:w-40"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
        <span className="text-sm font-medium">Total expected value</span>
        <span className="text-sm font-semibold text-primary">
          {value.length > 0 ? formatInr(total) : "—"}
        </span>
      </div>
    </div>
  );
}
