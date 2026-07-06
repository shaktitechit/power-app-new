"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
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
import { CustomTabs } from "@/components/portal/ui/custom-tabs";
import { toastHandler } from "@/components/portal/lib/toast";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import {
  canViewDocuments,
  type UserPermission,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import {
  useCreateSolarGenerationRecordMutation,
  useDeleteSolarGenerationRecordMutation,
  useUpdateSolarGenerationRecordMutation,
  useUploadSolarGenerationRecordDocumentsMutation,
  type SolarGenerationRecord,
  type SolarGenerationRecordDocument,
} from "@/store/slices/electrical-audit/solarGenerationRecordApiSlice";
import type { UtilityBillingRecord } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import { useAppSelector } from "@/store/hooks";
import { ClipboardList, Save, Upload, X } from "lucide-react";
import { SolarGenerationRecordDisplayCard } from "./solar-generation-record-display-card";
import { SolarGenerationRecordFormModal } from "./solar-generation-record-form-modal";
import {
  buildMatchKey,
  buildSolarGenerationForms,
  buildSolarGenerationPayload,
  formatBillingPeriodLabel,
  type SolarGenerationFormState,
} from "./solar-generation-record-utils";

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

type Props = {
  facilityId: string;
  utilityAccountId: string;
  solarPlantId: string;
  auditStepLocked?: boolean;
  utilityBillingRecords: UtilityBillingRecord[];
  solarGenerationRecords: SolarGenerationRecord[];
};

export function SolarPlantBillingAuditsPanel({
  facilityId,
  utilityAccountId,
  solarPlantId,
  auditStepLocked = false,
  utilityBillingRecords,
  solarGenerationRecords,
}: Props) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const [createSolarGenerationRecord, { isLoading: isCreating }] =
    useCreateSolarGenerationRecordMutation();
  const [updateSolarGenerationRecord, { isLoading: isUpdating }] =
    useUpdateSolarGenerationRecordMutation();
  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle(updateSolarGenerationRecord);
  const [deleteSolarGenerationRecord, { isLoading: isDeleting }] =
    useDeleteSolarGenerationRecordMutation();
  const [uploadSolarGenerationRecordDocuments, { isLoading: isUploadingDocs }] =
    useUploadSolarGenerationRecordDocumentsMutation();

  const forms = useMemo(
    () =>
      buildSolarGenerationForms(
        utilityBillingRecords,
        solarGenerationRecords,
      ),
    [utilityBillingRecords, solarGenerationRecords],
  );

  const tabs = useMemo(
    () =>
      forms.map((form) => ({
        id: buildMatchKey(form),
        label: formatBillingPeriodLabel(
          form.billing_period_start,
          form.billing_period_end,
        ),
        completed: !form.isNew,
      })),
    [forms],
  );

  const [activeTabId, setActiveTabId] = useState<string>("");
  const [modalForm, setModalForm] = useState<SolarGenerationFormState | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SolarGenerationFormState | null>(
    null,
  );
  const [uploadModalRecordId, setUploadModalRecordId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<SolarGenerationRecordDocument | null>(
    null,
  );
  const [previewRecordId, setPreviewRecordId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  useEffect(() => {
    if (!tabs.length) {
      setActiveTabId("");
      return;
    }
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  const activeForm = useMemo(
    () => forms.find((form) => buildMatchKey(form) === activeTabId) ?? null,
    [forms, activeTabId],
  );

  const openAuditModal = (form: SolarGenerationFormState) => {
    setModalForm({ ...form, documents: [] });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalForm(null);
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    const payload = buildSolarGenerationPayload(
      modalForm,
      facilityId,
      utilityAccountId,
      solarPlantId,
    );

    try {
      await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createSolarGenerationRecord(payload).unwrap();
          }
          if (modalForm.id) {
            return updateSolarGenerationRecord({
              id: modalForm.id,
              ...payload,
            }).unwrap();
          }
          return Promise.reject(
            new Error("Solar generation record ID is missing."),
          );
        },
        loading: modalForm.isNew
          ? "Saving solar generation audit..."
          : "Updating solar generation audit...",
        success: modalForm.isNew
          ? "Solar generation audit saved"
          : "Solar generation audit updated",
      });
      closeModal();
    } catch (error) {
      console.error("Failed to save solar generation record:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deleteSolarGenerationRecord(deleteTarget.id!).unwrap(),
        loading: "Deleting solar generation audit...",
        success: "Solar generation audit deleted",
      });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete solar generation record:", error);
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
          uploadSolarGenerationRecordDocuments({
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
    doc: SolarGenerationRecordDocument,
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
    const record = solarGenerationRecords.find((r) => r._id === previewRecordId);
    if (!record) return;

    const existingDocuments = (record.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateSolarGenerationRecord({
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

  if (!forms.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        No utility billing records found. Add billing records first — generation
        audit tabs will appear here automatically by billing period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ClipboardList className="h-4 w-4 text-primary" />
        Generation audits by billing period
      </div>

      <CustomTabs
        tabs={tabs}
        activeTab={activeTabId}
        onTabChange={setActiveTabId}
        className="rounded-lg border bg-muted/20"
      />

      {activeForm ? (
        activeForm.isNew ? (
          <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No generation audit saved for{" "}
              <span className="font-medium text-foreground">
                {formatBillingPeriodLabel(
                  activeForm.billing_period_start,
                  activeForm.billing_period_end,
                )}
              </span>
              {activeForm.bill_no ? ` (Bill ${activeForm.bill_no})` : ""}.
            </p>
            <Button
              className="mt-4 bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={() => openAuditModal(activeForm)}
              disabled={saving || auditStepLocked}
            >
              Audit this period
            </Button>
          </div>
        ) : activeForm.id ? (
          <SolarGenerationRecordDisplayCard
            form={activeForm}
            recordId={activeForm.id}
            auditStepLocked={auditStepLocked}
            canDelete={canDeleteRecords}
            canViewDocuments={canViewDocumentsFlag}
            saving={saving}
            onEdit={() => openAuditModal(activeForm)}
            onDelete={() => {
              setDeleteTarget(activeForm);
              setDeleteDialogOpen(true);
            }}
            isCompleted={Boolean(activeForm.is_completed)}
            onToggleCompleteness={() =>
              void handleToggleCompleteness({
                _id: activeForm.id!,
                is_completed: activeForm.is_completed,
              })
            }
            togglingCompleteness={completenessTargetId === activeForm.id}
            onUploadDocuments={() => handleOpenUploadModal(activeForm.id!)}
            onPreviewDocument={handleOpenPreview}
          />
        ) : null
      ) : null}

      <SolarGenerationRecordFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
          else setModalOpen(true);
        }}
        form={modalForm}
        onFormChange={(updater) =>
          setModalForm((prev) => (prev ? updater(prev) : prev))
        }
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
            <AlertDialogTitle>Delete generation audit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the solar generation audit for{" "}
              <strong>
                {deleteTarget
                  ? formatBillingPeriodLabel(
                      deleteTarget.billing_period_start,
                      deleteTarget.billing_period_end,
                    )
                  : "this billing period"}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
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
                document.getElementById("solar-gen-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="solar-gen-doc-file-input"
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
                      <Label htmlFor={`solar-gen-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`solar-gen-doc-caption-${item.id}`}
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
                  <Label htmlFor="solar-gen-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="solar-gen-doc-preview-caption"
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
