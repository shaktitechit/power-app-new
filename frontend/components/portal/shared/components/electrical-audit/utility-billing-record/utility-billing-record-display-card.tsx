"use client";

import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { cnHideUtilityAuditEdits, isUtilityAuditRecordEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { AuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-record-completeness-toggle";
import type {
  UtilityBillingRecord,
  UtilityBillingRecordDocument,
} from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import { FileText, ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import {
  formatDisplayValue,
  recordToForm,
  toDateInput,
} from "./utility-billing-record-utils";

function DisplayField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-[11px] leading-tight text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-medium text-foreground">
        {formatDisplayValue(value)}
      </p>
    </div>
  );
}

type Props = {
  record: UtilityBillingRecord;
  auditStepLocked?: boolean;
  canDelete?: boolean;
  saving?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCompleteness?: () => void;
  togglingCompleteness?: boolean;
  onUploadDocuments: () => void;
  onPreviewDocument: (
    doc: UtilityBillingRecordDocument,
    recordId: string,
    index: number,
  ) => void;
};

export function UtilityBillingRecordDisplayCard({
  record,
  auditStepLocked = false,
  canDelete = false,
  saving = false,
  onEdit,
  onDelete,
  onToggleCompleteness,
  togglingCompleteness = false,
  onUploadDocuments,
  onPreviewDocument,
}: Props) {
  const form = recordToForm(record);
  const docs: UtilityBillingRecordDocument[] = record.documents ?? [];
  const recordEditsLocked = isUtilityAuditRecordEditsLocked(
    auditStepLocked,
    record.is_completed,
  );

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-4">
      <Card className="min-w-0 overflow-hidden lg:col-span-3">
        <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <CardTitle className="min-w-0 shrink-0 text-base text-balance">
            {form.bill_no?.trim() || "Billing Record"}
            {form.billing_period_start || form.billing_period_end ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {toDateInput(form.billing_period_start)}
                {form.billing_period_end
                  ? ` → ${toDateInput(form.billing_period_end)}`
                  : ""}
              </span>
            ) : null}
          </CardTitle>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <AuditRecordCompletenessToggle
              isCompleted={Boolean(record.is_completed)}
              auditStepLocked={auditStepLocked}
              saving={togglingCompleteness || saving}
              onToggle={() => onToggleCompleteness?.()}
            />
            <div
              className={cnHideUtilityAuditEdits(
                recordEditsLocked,
                "flex flex-wrap items-center gap-2",
              )}
            >
            <Button onClick={onEdit} size="sm" disabled={saving}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {canDelete ? (
              <Button
                variant="destructive"
                onClick={onDelete}
                size="sm"
                disabled={saving}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-3 gap-x-3 gap-y-3 pb-4 pt-0">
          <DisplayField
            label="Billing Period Start"
            value={toDateInput(form.billing_period_start)}
          />
          <DisplayField
            label="Billing Period End"
            value={toDateInput(form.billing_period_end)}
          />
          <DisplayField label="Billing Days" value={form.billing_days} />
          <DisplayField label="Bill No" value={form.bill_no} />
          <DisplayField label="MDI (kVA)" value={form.mdi_kVA} />
          <DisplayField label="Units (kWh)" value={form.units_kWh} />
          <DisplayField label="Units (kVAh)" value={form.units_kVAh} />
          <DisplayField label="PF" value={form.pf} />
          <DisplayField
            label="Fixed Charges (Min. Charges) (₹)"
            value={form.fixed_charges_rs}
          />
          <DisplayField label="Demand Charges (₹)" value={form.demand_charges_rs} />
          <DisplayField label="Energy Charges (₹)" value={form.energy_charges_rs} />
          <DisplayField
            label="Taxes and Rent (Duty) (₹)"
            value={form.taxes_and_rent_rs}
          />
          <DisplayField label="Other Charges (₹)" value={form.other_charges_rs} />
          <DisplayField
            label="Other Charges Remark"
            value={form.other_charges_remark}
          />
          <DisplayField label="Penalty (₹)" value={form.penalty_rs} />
          <DisplayField label="Rebate / Subsidy (₹)" value={form.rebate_subsidy_rs} />
          <DisplayField
            label="Monthly Electricity Bill (₹)"
            value={form.monthly_electricity_bill_rs}
          />
          <DisplayField
            label="Unit Consumption / Day (kVAh)"
            value={form.unit_consumption_per_day_kVAh}
          />
          <DisplayField
            label="Average Per Unit Cost (₹)"
            value={form.average_per_unit_cost_rs}
          />
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden lg:col-span-1">
        <CardHeader className="flex flex-col gap-2 space-y-0 pb-2">
          <CardTitle className="truncate text-base font-semibold">
            Documents
          </CardTitle>
          {!recordEditsLocked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0 gap-2"
              onClick={onUploadDocuments}
            >
              <Upload className="h-4 w-4 shrink-0" />
              Upload
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="min-w-0 space-y-3 pt-2">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No documents yet.</p>
              {!recordEditsLocked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={onUploadDocuments}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid min-w-0 gap-2">
              {docs.map((doc, docIdx) => {
                const isImage = doc.fileType === "image";
                return (
                  <div
                    key={docIdx}
                    className="flex min-w-0 items-start gap-2 rounded-lg border p-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {isImage ? (
                        <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewDocument(doc, record._id, docIdx)
                          }
                          title={doc.fileName || `Document ${docIdx + 1}`}
                          className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                        >
                          {doc.fileName || `Document ${docIdx + 1}`}
                        </button>
                        {doc.caption ? (
                          <p
                            className="truncate text-xs text-muted-foreground"
                            title={doc.caption}
                          >
                            {doc.caption}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
