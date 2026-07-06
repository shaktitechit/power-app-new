"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { AuditStepSubmitBar } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-step-submit-bar";
import { UtilityOpenAuditButton } from "@/components/portal/shared/components/electrical-audit/utility-audit/utility-open-audit-button";
import {
  buildSafetyAuditPreviewSheetTabs,
  exportPreviewTabToCsv,
  isSafetyChecklistPreviewSection,
} from "@/components/portal/lib/electrical-audit/safety-audit-preview-sheet";
import { GoogleSheetGrid } from "@/components/portal/shared/components/google-sheet-grid";
import { useSafetyAuditPreviewCompleteness } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-safety-audit-preview-completeness";
import type { UtilityAuditPreviewSheetSection } from "@/components/portal/lib/electrical-audit/utility-audit-preview-sheet";
import { SAFETY_PREVIEW_AND_SUBMIT_STEP_ID } from "@/components/portal/lib/electrical-audit/safety-audit-workflow";
import { CheckCircle2, Download, FileSpreadsheet, X } from "lucide-react";
import type { ElectricalSafetyUtilityAccountWorkspaceModel } from "./use-electrical-safety-utility-account-workspace";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";
import { cn } from "@/components/portal/lib/utils";

interface SafetyPreviewModalProps {
  model: ElectricalSafetyUtilityAccountWorkspaceModel;
  utilityAccount: UtilityAccount;
  disabled?: boolean;
}

function formatTabRowCount(tab: {
  rowCount: number;
  sections: { rows: { length: number }; columns: { key: string }[] }[];
}) {
  if (tab.rowCount > 0) {
    return String(tab.rowCount);
  }

  const hasOnlyEmptyMessages = tab.sections.every(
    (section) =>
      section.rows.length === 1 && section.columns[0]?.key === "message",
  );
  return hasOnlyEmptyMessages ? "0" : String(tab.rowCount);
}

function isEmptyPreviewSection(section: UtilityAuditPreviewSheetSection) {
  return (
    section.rows.length === 1 && section.columns[0]?.key === "message"
  );
}

export function SafetyPreviewModal({
  model,
  utilityAccount,
  disabled = false,
}: SafetyPreviewModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedRowsBySection, setSelectedRowsBySection] = useState<
    Record<string, number[]>
  >({});

  const { bulkUpdateRecordCompleteness, isSavingRecord } =
    useSafetyAuditPreviewCompleteness();

  const auditor = utilityAccount.auditor_id as any;
  const auditorName =
    typeof auditor === "object" && auditor ? auditor.name : undefined;

  const {
    tabs,
    recordCompletionContext,
    auditStepLocked,
    canFinalSubmit,
    facilityAuditLocked,
    finalSubmitMissingItems,
    finalAuditLocked,
  } = model;

  const auditSections = tabs.filter((tab) => tab.id !== "details");

  const previewSheetTabs = useMemo(
    () =>
      buildSafetyAuditPreviewSheetTabs(
        auditSections.map((section) => section.id),
        recordCompletionContext,
      ),
    [auditSections, recordCompletionContext],
  );

  const activePreviewTab =
    previewSheetTabs.find((tab) => tab.stepId === selectedStepId) ??
    previewSheetTabs[0] ??
    null;

  useEffect(() => {
    if (!previewSheetTabs.length) return;

    const hasSelectedTab = previewSheetTabs.some(
      (tab) => tab.stepId === selectedStepId,
    );
    if (!hasSelectedTab) {
      setSelectedStepId(previewSheetTabs[0].stepId);
    }
  }, [previewSheetTabs, selectedStepId]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleExportActiveTab = () => {
    if (!activePreviewTab) return;

    const safeLabel = activePreviewTab.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    exportPreviewTabToCsv(
      activePreviewTab,
      `safety-audit-${utilityAccount.account_number}-${safeLabel}`,
    );
  };

  const handleSectionRowSelect = (sectionId: string, rowIndex: number) => {
    setSelectedRowsBySection((prev) => {
      const current = prev[sectionId] ?? [];
      const updated = current.includes(rowIndex)
        ? current.filter((i) => i !== rowIndex)
        : [...current, rowIndex];
      return {
        ...prev,
        [sectionId]: updated,
      };
    });
  };

  const handleSectionSelectAll = (section: UtilityAuditPreviewSheetSection) => {
    if (isEmptyPreviewSection(section)) return;
    const sectionId = section.id;
    const totalRows = section.rows.length;
    setSelectedRowsBySection((prev) => {
      const current = prev[sectionId] ?? [];
      const updated =
        current.length === totalRows
          ? []
          : Array.from({ length: totalRows }, (_, i) => i);
      return {
        ...prev,
        [sectionId]: updated,
      };
    });
  };

  const handleBulkToggle = async (
    section: UtilityAuditPreviewSheetSection,
    targetCompletedState: boolean,
  ) => {
    const selectedIndices = selectedRowsBySection[section.id] ?? [];
    if (selectedIndices.length === 0) return;

    const recordsToUpdate = selectedIndices
      .map((idx) => section.recordMeta?.[idx])
      .filter((meta): meta is NonNullable<typeof meta> => !!meta)
      .map((meta) => ({
        id: meta.id,
        isCompleted: meta.isCompleted,
      }));

    if (recordsToUpdate.length === 0) return;

    const success = await bulkUpdateRecordCompleteness(
      section.id,
      recordsToUpdate,
      targetCompletedState,
    );

    if (success) {
      setSelectedRowsBySection((prev) => ({
        ...prev,
        [section.id]: [],
      }));
    }
  };

  return (
    <>
      <Button
        size="sm"
        className="flex items-center gap-2"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <CheckCircle2 className="h-4 w-4" />
        Preview and Submit
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
          <header className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold flex items-center flex-wrap gap-2">
                  <span>Audit Preview — {utilityAccount.account_number}</span>
                  {auditorName ? (
                    <span className="text-xs font-normal px-2 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                      Auditor: {auditorName}
                    </span>
                  ) : null}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Review safety audit records and checklist items with column
                  headers. Select record rows to mark them completed or pending.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
              {previewSheetTabs.map((tab) => (
                <button
                  key={tab.stepId}
                  type="button"
                  onClick={() => setSelectedStepId(tab.stepId)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                    activePreviewTab?.stepId === tab.stepId
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                    ({formatTabRowCount(tab)})
                  </span>
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={!activePreviewTab}
              onClick={handleExportActiveTab}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
            {previewSheetTabs.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                No included audit sections to preview yet.
              </div>
            ) : activePreviewTab ? (
              activePreviewTab.sections.map((section) => {
                const selectedIndices = selectedRowsBySection[section.id] ?? [];
                const sectionIsEmpty = isEmptyPreviewSection(section);

                return (
                  <section
                    key={section.id}
                    className={cn(
                      "flex shrink-0 flex-col",
                      isSafetyChecklistPreviewSection(section.id)
                        ? "min-h-[200px]"
                        : "min-h-[160px]",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">
                          {section.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {sectionIsEmpty
                            ? "No rows"
                            : isSafetyChecklistPreviewSection(section.id)
                              ? `${section.rows.length} checklist item${section.rows.length === 1 ? "" : "s"}`
                              : `${section.rows.length} record${section.rows.length === 1 ? "" : "s"}`}
                        </span>
                      </div>
                      {section.supportsCompletenessToggle && !sectionIsEmpty ? (
                        <div className="flex items-center gap-2">
                          {selectedIndices.length > 0 ? (
                            <>
                              <span className="text-xs font-medium text-muted-foreground mr-1">
                                {selectedIndices.length} selected
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                disabled={
                                  auditStepLocked ||
                                  isSavingRecord(section.id, "")
                                }
                                onClick={() =>
                                  void handleBulkToggle(section, true)
                                }
                              >
                                Mark Completed
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 border-amber-600/30 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                disabled={
                                  auditStepLocked ||
                                  isSavingRecord(section.id, "")
                                }
                                onClick={() =>
                                  void handleBulkToggle(section, false)
                                }
                              >
                                Mark Pending
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Select rows to bulk update status
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                    <GoogleSheetGrid
                      fillHeight={!isSafetyChecklistPreviewSection(section.id)}
                      columns={section.columns}
                      rows={section.rows}
                      emptyMessage={`No records in ${section.title}.`}
                      className="min-h-[160px]"
                      selectedRowIndices={selectedIndices}
                      isMultiSelect={
                        section.supportsCompletenessToggle && !sectionIsEmpty
                      }
                      onSelectAll={() => handleSectionSelectAll(section)}
                      onRowSelect={
                        section.supportsCompletenessToggle && !sectionIsEmpty
                          ? (rowIndex) =>
                              handleSectionRowSelect(section.id, rowIndex)
                          : undefined
                      }
                    />
                  </section>
                );
              })
            ) : null}
          </main>

          <footer className="shrink-0 border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
            {finalAuditLocked ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  This utility audit has been submitted. Open it again to mark
                  all included records as pending and continue editing.
                </p>
                <UtilityOpenAuditButton
                  utilityAccountId={utilityAccount._id}
                  accountNumber={utilityAccount.account_number}
                  disabled={facilityAuditLocked}
                  onOpened={() => setOpen(false)}
                />
              </div>
            ) : (
              <>
                <AuditStepSubmitBar
                  utilityAccountId={utilityAccount._id}
                  stepId={SAFETY_PREVIEW_AND_SUBMIT_STEP_ID}
                  stepLabel="Electrical safety audit (final)"
                  utilityAccount={utilityAccount}
                  globalAuditLocked={auditStepLocked}
                  disabled={!canFinalSubmit || facilityAuditLocked}
                />
                {!canFinalSubmit ? (
                  <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <p className="font-medium">
                      Final submit is blocked until all required sections are
                      completed.
                    </p>
                    <p className="mt-1">
                      Missing: {finalSubmitMissingItems.join(", ")}.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </footer>
        </div>
      ) : null}
    </>
  );
}
