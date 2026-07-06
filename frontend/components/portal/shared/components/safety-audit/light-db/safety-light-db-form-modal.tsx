"use client";

import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Save, X } from "lucide-react";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { Textarea } from "@/components/portal/ui/textarea";
import { cn } from "@/components/portal/lib/utils";
import type { ChecklistRow, SafetyLightDbFormState } from "./light-db-section";

const frozenFieldClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

function nativeSelectClassForm(disabled: boolean) {
  return cn(
    "flex h-10 w-full rounded-md border px-3 py-2 text-sm",
    disabled
      ? frozenFieldClass
      : "border-input bg-background text-foreground",
  );
}

function nativeSelectClassTable(disabled: boolean) {
  return cn(
    "h-8 w-full rounded-md border px-2 py-1 text-xs",
    disabled ? frozenFieldClass : "border-input bg-background text-foreground",
  );
}

const COMPLIANCE_OPTIONS = [
  { value: "", label: "—" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "na", label: "N/A" },
  { value: "partial", label: "Partial" },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "—" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
  { value: "approved", label: "Approved" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: SafetyLightDbFormState | null;
  onFormChange: (
    updater: (prev: SafetyLightDbFormState) => SafetyLightDbFormState,
  ) => void;
  onSave: () => void;
  saving?: boolean;
};

export function SafetyLightDbFormModal({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  saving = false,
}: Props) {
  if (!form) return null;

  const updateRow = (rowKey: string, patch: Partial<ChecklistRow>) => {
    onFormChange((prev) => ({
      ...prev,
      items: prev.items.map((r) =>
        r.localKey === rowKey ? { ...r, ...patch } : r,
      ),
    }));
  };

  const inputClass =
    "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {form.isNew ? "Add Light DB Safety Audit" : "Edit Light DB Safety Audit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>LDB name</Label>
              <Input
                className={inputClass}
                value={form.ldb_name}
                onChange={(e) =>
                  onFormChange((f) => ({ ...f, ldb_name: e.target.value }))
                }
                placeholder="LDB name"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                className={inputClass}
                value={form.location}
                onChange={(e) =>
                  onFormChange((f) => ({ ...f, location: e.target.value }))
                }
                placeholder="Building / floor / room"
              />
            </div>
            <div>
              <Label>Audit date</Label>
              <Input
                className={inputClass}
                type="date"
                value={form.audit_date}
                onChange={(e) =>
                  onFormChange((f) => ({ ...f, audit_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className={nativeSelectClassForm(false)}
                value={form.status || "draft"}
                onChange={(e) =>
                  onFormChange((f) => ({
                    ...f,
                    status: e.target.value as SafetyLightDbFormState["status"],
                  }))
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-2">
              <Label>Checklist</Label>
            </div>
            <div className="relative max-h-[350px] min-h-0 overflow-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-border bg-muted/95 text-left text-xs text-muted-foreground shadow-sm backdrop-blur">
                    <th className="p-2">#</th>
                    <th className="p-2">Activity / observation</th>
                    <th className="p-2">Requirement</th>
                    <th className="p-2 w-28">Compliance</th>
                    <th className="p-2">Remarks</th>
                    <th className="p-2">Recommendations</th>
                    <th className="p-2 w-28">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((row) => (
                    <tr key={row.localKey} className="border-b last:border-0">
                      <td className="p-1 align-top text-muted-foreground">{row.sr_no}</td>
                      <td className="p-1">
                        <Textarea
                          className={frozenFieldClass}
                          rows={2}
                          value={row.activity_description}
                          readOnly
                        />
                      </td>
                      <td className="p-1">
                        <Textarea
                          className={frozenFieldClass}
                          rows={2}
                          value={row.requirement}
                          readOnly
                        />
                      </td>
                      <td className="p-1">
                        <select
                          className={nativeSelectClassTable(false)}
                          value={row.compliance || ""}
                          onChange={(e) =>
                            updateRow(row.localKey, {
                              compliance: e.target.value as ChecklistRow["compliance"],
                            })
                          }
                        >
                          {COMPLIANCE_OPTIONS.map((o) => (
                            <option key={o.value || "compliance-empty"} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <Textarea
                          className={inputClass}
                          rows={2}
                          value={row.remarks}
                          onChange={(e) =>
                            updateRow(row.localKey, { remarks: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-1">
                        <Textarea
                          className={inputClass}
                          rows={2}
                          value={row.recommendations}
                          onChange={(e) =>
                            updateRow(row.localKey, {
                              recommendations: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="p-1">
                        <select
                          className={nativeSelectClassTable(false)}
                          value={row.severity || ""}
                          onChange={(e) =>
                            updateRow(row.localKey, {
                              severity: e.target.value as ChecklistRow["severity"],
                            })
                          }
                        >
                          {SEVERITY_OPTIONS.map((o) => (
                            <option key={o.value || "severity-empty"} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : form.isNew ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
