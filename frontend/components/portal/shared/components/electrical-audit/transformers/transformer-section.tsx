"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
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
import { Plus, Save, Upload, X } from "lucide-react";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { toast } from "sonner";
import {
  canViewDocuments,
  type UserPermission,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { cnHideUtilityAuditEdits } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { UTILITY_AUDIT_STEP_IDS } from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { toastHandler } from "@/components/portal/lib/toast";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { AuditSectionSkeleton } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-skeleton";
import { useAppSelector } from "@/store/hooks";
import { useGetTransformerAuditRecordsQuery } from "@/store/slices/electrical-audit/transformerAuditRecordApiSlice";
import {
  useCreateTransformerMutation,
  useDeleteTransformerMutation,
  useGetTransformersQuery,
  useUpdateTransformerMutation,
  useUploadTransformerDocumentsMutation,
  type Transformer,
  type TransformerDocument,
} from "@/store/slices/electrical-audit/transformerApiSlice";
import { TransformerDisplayCard } from "./transformer-display-card";
import { TransformerFormModal } from "./transformer-form-modal";
import {
  buildTransformerPayload,
  createEmptyForm,
  transformerHasAudit,
  transformerToForm,
  getTransformerTabLabel,
  sortTransformersStable,
  type TransformerFormState,
} from "./transformer-utils";

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

interface TransformerSectionProps {
  utilityAccountId: string;
  facilityId: string;
  auditStepLocked?: boolean;
}

export function TransformerSection({
  utilityAccountId,
  facilityId,
  auditStepLocked = false,
}: TransformerSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetTransformersQuery({
    utility_account_id: utilityAccountId,
  });
  const { data: auditData, isLoading: isAuditLoading } =
    useGetTransformerAuditRecordsQuery({
      utility_account_id: utilityAccountId,
    });

  const [createTransformer, { isLoading: isCreating }] = useCreateTransformerMutation();
  const [updateTransformer, { isLoading: isUpdating }] = useUpdateTransformerMutation();
  const [deleteTransformer, { isLoading: isDeleting }] = useDeleteTransformerMutation();
  const [uploadTransformerDocuments, { isLoading: isUploadingDocs }] =
    useUploadTransformerDocumentsMutation();

  const transformers = useMemo(() => data?.data || [], [data]);
  const transformerAuditRecords = useMemo(() => auditData?.data || [], [auditData]);
  const sortedTransformers = useMemo(() => sortTransformersStable(transformers), [transformers]);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<TransformerFormState | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transformer | null>(null);
  const [uploadModalTransformerId, setUploadModalTransformerId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<TransformerDocument | null>(null);
  const [previewTransformerId, setPreviewTransformerId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const transformerTabs = useMemo(
    () =>
      sortedTransformers.map((t, index) => ({
        id: t._id,
        label: getTransformerTabLabel(t, index),
        completed: transformerHasAudit(t._id, transformerAuditRecords),
      })),
    [sortedTransformers, transformerAuditRecords],
  );

  const activeTransformer = useMemo(
    () => sortedTransformers.find((t) => t._id === activeTabId) ?? null,
    [sortedTransformers, activeTabId],
  );

  const activeHasAudit = useMemo(() => {
    if (!activeTransformer) return false;
    return transformerHasAudit(activeTransformer._id, transformerAuditRecords);
  }, [activeTransformer, transformerAuditRecords]);

  useEffect(() => {
    if (!transformerTabs.length) {
      setActiveTabId("");
      return;
    }
    if (!transformerTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(transformerTabs[0].id);
    }
  }, [transformerTabs, activeTabId]);

  const openCreateModal = () => {
    setModalForm(createEmptyForm());
    setFormModalOpen(true);
  };

  const openEditModal = (t: Transformer) => {
    setModalForm(transformerToForm(t));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setModalForm(null);
  };

  const handleModalFormChange = (
    updater: (prev: TransformerFormState) => TransformerFormState,
  ) => {
    setModalForm((prev) => (prev ? updater(prev) : prev));
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    if (!modalForm.transformer_tag.trim()) {
      toast.error("Transformer Tag is required");
      return;
    }

    const payload = buildTransformerPayload(
      modalForm,
      facilityId,
      utilityAccountId,
    );

    try {
      const result = await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createTransformer(payload).unwrap();
          }
          if (modalForm.id) {
            return updateTransformer({
              id: modalForm.id,
              ...payload,
            }).unwrap();
          }
          return Promise.reject(new Error("Transformer ID is missing."));
        },
        loading: modalForm.isNew ? "Creating transformer..." : "Updating transformer...",
        success: modalForm.isNew
          ? "Transformer created successfully"
          : "Transformer updated successfully",
      });
      if (modalForm.isNew && result?.data?._id) {
        setActiveTabId(result.data._id);
      } else if (modalForm.id) {
        setActiveTabId(modalForm.id);
      }
      closeFormModal();
    } catch (error) {
      console.error("Failed to save transformer:", error);
    }
  };

  const handleDelete = (t: Transformer) => {
    if (!canDeleteRecords) return;
    setDeleteTarget(t);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deleteTransformer(deleteTarget._id).unwrap(),
        loading: "Deleting transformer...",
        success: "Transformer deleted successfully",
      });
      if (activeTabId === deleteTarget._id) {
        const remaining = sortedTransformers.filter(
          (t) => t._id !== deleteTarget._id,
        );
        setActiveTabId(remaining[0]?._id ?? "");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete transformer:", error);
    }
  };

  const handleOpenUploadModal = (tId: string) => {
    setUploadModalTransformerId(tId);
    setUploadFiles([]);
  };

  const handleUploadDocs = async () => {
    if (!uploadModalTransformerId || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadTransformerDocuments({
            id: uploadModalTransformerId,
            documents: uploadFiles.map((item) => item.file),
            captions: uploadFiles.map((item) => item.caption.trim()),
          }).unwrap(),
        loading: "Uploading documents...",
        success: "Documents uploaded successfully",
      });
      setUploadModalTransformerId(null);
      setUploadFiles([]);
    } catch (err) {
      console.error("Failed to upload documents:", err);
    }
  };

  const handleOpenPreview = (
    doc: TransformerDocument,
    tId: string,
    index: number,
  ) => {
    if (!canViewDocumentsFlag) return;
    setPreviewDoc(doc);
    setPreviewTransformerId(tId);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!previewTransformerId || previewDocIndex === null || !previewDoc) return;
    const t = transformers.find((item) => item._id === previewTransformerId);
    if (!t) return;

    const existingDocuments = (t.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateTransformer({
            id: previewTransformerId,
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

  if (isLoading || isAuditLoading) {
    return <AuditSectionSkeleton />;
  }

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-foreground">Transformers</h3>
            <p className="text-sm text-muted-foreground">
              Switch between transformers using the tabs below. Audit opens in a modal;
              saved audits show as view-only cards with documents.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreateModal}
          className={cnHideUtilityAuditEdits(auditStepLocked)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Transformer
        </Button>
      </div>

      {sortedTransformers.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No transformers found. Click{" "}
          <span className="font-medium text-foreground">Create Transformer</span> to
          add one.
        </div>
      ) : (
        <div className="space-y-4">
          <CustomTabs
            tabs={transformerTabs}
            activeTab={activeTabId}
            onTabChange={setActiveTabId}
            className="rounded-lg border bg-muted/20"
          />

          {activeTransformer ? (
            <TransformerDisplayCard
              key={activeTransformer._id}
              transformer={activeTransformer}
              hasAudit={activeHasAudit}
              facilityId={facilityId}
              utilityAccountId={utilityAccountId}
              auditStepLocked={auditStepLocked}
              canDelete={canDeleteRecords}
              canViewDocuments={canViewDocumentsFlag}
              saving={saving}
              onEdit={() => openEditModal(activeTransformer)}
              onDelete={() => handleDelete(activeTransformer)}
              onUploadDocuments={() => handleOpenUploadModal(activeTransformer._id)}
              onPreviewDocument={handleOpenPreview}
            />
          ) : null}
        </div>
      )}

      <TransformerFormModal
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
            <AlertDialogTitle>Delete transformer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {deleteTarget?.transformer_tag
                  ? `Transformer ${deleteTarget.transformer_tag}`
                  : "this transformer"}
              </strong>{" "}
              and related audit data. This action cannot be undone.
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
        open={!!uploadModalTransformerId}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalTransformerId(null);
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
                document.getElementById("transformer-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="transformer-doc-file-input"
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
                      <Label htmlFor={`transformer-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`transformer-doc-caption-${item.id}`}
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
                setUploadModalTransformerId(null);
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
            setPreviewTransformerId(null);
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
                  <Label htmlFor="transformer-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="transformer-doc-preview-caption"
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
