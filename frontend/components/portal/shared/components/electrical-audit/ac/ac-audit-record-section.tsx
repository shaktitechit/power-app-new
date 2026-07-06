"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { CustomTabs } from "@/components/portal/ui/custom-tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/portal/ui/alert-dialog";
import {
  Download,
  FileSpreadsheet,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";
import {
  canViewDocuments,
  type UserPermission,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { cnHideUtilityAuditEdits, isUtilityAuditSheetEditsLocked } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import {
  acAuditFormToExcelPrefill,
  downloadACAuditExcelTemplate,
  parseACAuditExcel,
} from "@/components/portal/lib/electrical-audit/ac-audit-record-excel";
import { toastHandler } from "@/components/portal/lib/toast";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { AuditSectionSkeleton } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-skeleton";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { AuditRecordsEmptyState } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-records-empty-state";
import { useAppSelector } from "@/store/hooks";
import {
  useCreateACAuditRecordMutation,
  useDeleteACAuditRecordMutation,
  useGetACAuditRecordsQuery,
  useUpdateACAuditRecordMutation,
  useUploadACAuditRecordDocumentsMutation,
  type ACAuditRecord,
  type ACAuditDocument,
} from "@/store/slices/electrical-audit/acAuditRecordApiSlice";
import { toast } from "sonner";
import { ACAuditRecordDisplayCard } from "./ac-audit-record-display-card";
import { ACAuditRecordFormModal } from "./ac-audit-record-form-modal";
import {
  applyACAuditExcelParsed,
  auditToForm,
  buildACAuditPayload,
  createEmptyForm,
  getACAuditTabLabel,
  sortACAuditRecordsStable,
  type ACAuditFormState,
} from "./ac-audit-record-utils";

type PendingUploadFile = {
  id: string;
  file: File;
  caption: string;
};

function newPendingUploadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface ACAuditRecordSectionProps {
  facilityId: string;
  utilityAccountId: string;
  auditStepLocked?: boolean;
}

export function ACAuditRecordSection({
  facilityId,
  utilityAccountId,
  auditStepLocked = false,
}: ACAuditRecordSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetACAuditRecordsQuery({
    utility_account_id: utilityAccountId,
  });

  const [createACAuditRecord, { isLoading: isCreating }] =
    useCreateACAuditRecordMutation();
  const [updateACAuditRecord, { isLoading: isUpdating }] =
    useUpdateACAuditRecordMutation();
  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle(updateACAuditRecord);
  const [deleteACAuditRecord, { isLoading: isDeleting }] =
    useDeleteACAuditRecordMutation();
  const [uploadACAuditRecordDocuments, { isLoading: isUploadingDocs }] =
    useUploadACAuditRecordDocumentsMutation();

  const records = useMemo(() => data?.data || [], [data]);
  const sortedRecords = useMemo(
    () => sortACAuditRecordsStable(records),
    [records],
  );
  const sheetEditsLocked = isUtilityAuditSheetEditsLocked(
    auditStepLocked,
    sortedRecords,
  );

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<ACAuditFormState | null>(null);
  const [activeAcTabId, setActiveAcTabId] = useState<string>("");
  const [excelImporting, setExcelImporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ACAuditRecord | null>(null);
  const [uploadModalRecordId, setUploadModalRecordId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<ACAuditDocument | null>(null);
  const [previewRecordId, setPreviewRecordId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const acTabs = useMemo(
    () =>
      sortedRecords.map((record, index) => ({
        id: record._id,
        label: getACAuditTabLabel(record, index),
      })),
    [sortedRecords],
  );

  const activeRecordIndex = useMemo(
    () => sortedRecords.findIndex((record) => record._id === activeAcTabId),
    [sortedRecords, activeAcTabId],
  );

  const activeRecord = useMemo(
    () =>
      activeRecordIndex >= 0 ? sortedRecords[activeRecordIndex] : null,
    [sortedRecords, activeRecordIndex],
  );

  useEffect(() => {
    if (!acTabs.length) {
      setActiveAcTabId("");
      return;
    }
    if (!acTabs.some((tab) => tab.id === activeAcTabId)) {
      setActiveAcTabId(acTabs[0].id);
    }
  }, [acTabs, activeAcTabId]);

  const openCreateModal = () => {
    setModalForm(createEmptyForm());
    setFormModalOpen(true);
  };

  const openEditModal = (record: ACAuditRecord) => {
    setModalForm(auditToForm(record));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setModalForm(null);
  };

  const handleModalFormChange = (
    updater: (prev: ACAuditFormState) => ACAuditFormState,
  ) => {
    setModalForm((prev) => (prev ? updater(prev) : prev));
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    if (!modalForm.unit_id.trim()) {
      toast.error("Unit ID is required.");
      return;
    }

    const payload = buildACAuditPayload(
      modalForm,
      facilityId,
      utilityAccountId,
    );

    try {
      const result = await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createACAuditRecord(payload).unwrap();
          }
          if (modalForm.id) {
            return updateACAuditRecord({
              id: modalForm.id,
              ...payload,
            }).unwrap();
          }
          return Promise.reject(new Error("AC audit record ID is missing."));
        },
        loading: modalForm.isNew
          ? "Creating AC audit record..."
          : "Updating AC audit record...",
        success: modalForm.isNew
          ? "AC audit record created successfully"
          : "AC audit record updated successfully",
      });
      if (modalForm.isNew && result?.data?._id) {
        setActiveAcTabId(result.data._id);
      } else if (modalForm.id) {
        setActiveAcTabId(modalForm.id);
      }
      closeFormModal();
    } catch (error) {
      console.error("Failed to save AC audit record:", error);
    }
  };

  const handleDelete = (record: ACAuditRecord) => {
    if (!canDeleteRecords) return;
    setDeleteTarget(record);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deleteACAuditRecord(deleteTarget._id).unwrap(),
        loading: "Deleting AC audit record...",
        success: "AC audit record deleted successfully",
      });
      if (activeAcTabId === deleteTarget._id) {
        const remaining = sortedRecords.filter(
          (record) => record._id !== deleteTarget._id,
        );
        setActiveAcTabId(remaining[0]?._id ?? "");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete AC audit record:", error);
    }
  };

  const handleDownloadACAuditExcel = () => {
    const source =
      modalForm ??
      (sortedRecords[0]
        ? auditToForm(sortedRecords[0])
        : createEmptyForm());
    downloadACAuditExcelTemplate(
      acAuditFormToExcelPrefill({ ...source } as Record<string, unknown>),
    );
  };

  const handleACAuditExcelImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast.error("Please choose an Excel file (.xlsx or .xls).");
      return;
    }

    setExcelImporting(true);
    try {
      const parsed = await parseACAuditExcel(file);
      if (!Object.keys(parsed).length) {
        toast.error(
          "No recognized fields found. Use the downloaded template (3 sheets).",
        );
        return;
      }

      const base = modalForm ?? createEmptyForm();
      setModalForm(applyACAuditExcelParsed(base, parsed));
      setFormModalOpen(true);
      toast.success("AC audit form updated from Excel.");
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not read that Excel file.",
      );
    } finally {
      setExcelImporting(false);
    }
  };

  const handleOpenUploadModal = (recordId: string) => {
    setUploadModalRecordId(recordId);
    setUploadFiles([]);
  };

  const handleUploadDocs = async () => {
    if (!uploadModalRecordId || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadACAuditRecordDocuments({
            id: uploadModalRecordId,
            documents: uploadFiles.map((item) => item.file),
            captions: uploadFiles.map((item) => item.caption.trim()),
          }).unwrap(),
        loading: "Uploading documents...",
        success: "Documents uploaded successfully",
      });
      setUploadModalRecordId(null);
      setUploadFiles([]);
    } catch (err) {
      console.error("Failed to upload documents:", err);
    }
  };

  const handleOpenPreview = (
    doc: ACAuditDocument,
    recordId: string,
    idx: number,
  ) => {
    if (!canViewDocumentsFlag) return;
    setPreviewDoc(doc);
    setPreviewRecordId(recordId);
    setPreviewDocIndex(idx);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!previewRecordId || previewDocIndex === null || !previewDoc) return;
    const record = records.find((r) => r._id === previewRecordId);
    if (!record) return;

    const existingDocuments = (record.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateACAuditRecord({
            id: previewRecordId,
            existing_documents: existingDocuments,
          }).unwrap(),
        loading: "Saving caption...",
        success: "Caption updated",
      });
      setPreviewDoc((prev) =>
        prev ? { ...prev, caption: editCaptionValue } : prev,
      );
    } catch (err) {
      console.error("Failed to save caption:", err);
    }
  };

  const saving = isCreating || isUpdating || isDeleting || isUploadingDocs;

  if (isLoading) {
    return <AuditSectionSkeleton />;
  }

  return (
    <div className="relative space-y-4">

      <div className="relative space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-foreground">
              AC Audit Records
            </h3>
            <p className="text-sm text-muted-foreground">
              Switch between AC audits using the tabs below. Use Add or Edit to
              open the form in a modal. Upload documents from the documents
              panel.
            </p>
          </div>

          <div
            className={cnHideUtilityAuditEdits(
              sheetEditsLocked,
              "flex flex-wrap items-center gap-2",
            )}
          >
            <input
              id="ac-audit-excel-import"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={handleACAuditExcelImport}
              disabled={excelImporting}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCreateModal}
              className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add AC Audit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadACAuditExcel}
            >
              <Download className="mr-2 h-4 w-4" />
              Excel template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={excelImporting}
              onClick={() =>
                document.getElementById("ac-audit-excel-import")?.click()
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {excelImporting ? "Reading…" : "Import Excel"}
            </Button>
          </div>
        </div>

        {sortedRecords.length === 0 ? (
          <AuditRecordsEmptyState />
        ) : (
          <div className="space-y-4">
            <CustomTabs
              tabs={acTabs}
              activeTab={activeAcTabId}
              onTabChange={setActiveAcTabId}
              className="rounded-lg border bg-muted/20"
            />

            {activeRecord && activeRecordIndex >= 0 ? (
              <ACAuditRecordDisplayCard
                key={activeRecord._id}
                record={activeRecord}
                tabLabel={getACAuditTabLabel(activeRecord, activeRecordIndex)}
                auditStepLocked={auditStepLocked}
                canDelete={canDeleteRecords}
                canViewDocuments={canViewDocumentsFlag}
                saving={saving}
                onEdit={() => openEditModal(activeRecord)}
                onDelete={() => handleDelete(activeRecord)}
                onToggleCompleteness={() =>
                  void handleToggleCompleteness(activeRecord)
                }
                togglingCompleteness={completenessTargetId === activeRecord._id}
                onUploadDocuments={() => handleOpenUploadModal(activeRecord._id)}
                onPreviewDocument={handleOpenPreview}
              />
            ) : null}
          </div>
        )}
      </div>

      <ACAuditRecordFormModal
        open={formModalOpen}
        onOpenChange={(open) => {
          if (!open) closeFormModal();
          else setFormModalOpen(true);
        }}
        form={modalForm}
        onFormChange={handleModalFormChange}
        onSave={handleSaveModal}
        saving={isCreating || isUpdating}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AC audit record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will permanently delete this AC
              audit record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!uploadModalRecordId}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalRecordId(null);
            setUploadFiles([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-muted/50"
              onClick={() =>
                document.getElementById("ac-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="ac-doc-file-input"
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setUploadFiles((prev) => [
                    ...prev,
                    ...files.map((file) => ({
                      id: newPendingUploadId(),
                      file,
                      caption: "",
                    })),
                  ]);
                  e.target.value = "";
                }}
              />
            </div>
            {uploadFiles.length > 0 ? (
              <ul className="space-y-3">
                {uploadFiles.map((item) => (
                  <li
                    key={item.id}
                    className="space-y-2 rounded-md border border-border bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {item.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadFiles((prev) =>
                            prev.filter((entry) => entry.id !== item.id),
                          )
                        }
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`ac-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`ac-doc-caption-${item.id}`}
                        value={item.caption}
                        onChange={(e) =>
                          setUploadFiles((prev) =>
                            prev.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, caption: e.target.value }
                                : entry,
                            ),
                          )
                        }
                        placeholder="Add a caption for this document…"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUploadModalRecordId(null);
                setUploadFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUploadDocs}
              disabled={uploadFiles.length === 0 || isUploadingDocs}
            >
              {isUploadingDocs ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewDoc}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDoc(null);
            setPreviewRecordId(null);
            setPreviewDocIndex(null);
            setEditCaptionValue("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.fileName || "Document"}</DialogTitle>
          </DialogHeader>
          {previewDoc ? (
            <div className="space-y-4">
              {previewDoc.fileType === "image" ? (
                <img
                  src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                  alt={previewDoc.fileName || "Document"}
                  className="max-h-[60vh] w-full rounded-md object-contain"
                />
              ) : (
                <iframe
                  src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                  title={previewDoc.fileName || "Document"}
                  className="h-[60vh] w-full rounded-md border"
                />
              )}
              {!auditStepLocked ? (
                <div className="space-y-2">
                  <Label htmlFor="ac-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ac-doc-preview-caption"
                      value={editCaptionValue}
                      onChange={(e) => setEditCaptionValue(e.target.value)}
                      placeholder="Document caption"
                    />
                    <Button type="button" onClick={handleSaveCaption}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
