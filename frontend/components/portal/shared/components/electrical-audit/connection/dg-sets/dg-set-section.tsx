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
import { useGetDGAuditRecordsQuery } from "@/store/slices/electrical-audit/dgAuditRecordApiSlice";
import {
  useCreateDGSetMutation,
  useDeleteDGSetMutation,
  useGetDGSetsQuery,
  useUpdateDGSetMutation,
  useUploadDGSetDocumentsMutation,
  type DGSet,
  type DGSetDocument,
} from "@/store/slices/electrical-audit/dgSetApiSlice";
import { DGSetDisplayCard } from "./dg-set-display-card";
import { DGSetFormModal } from "./dg-set-form-modal";
import {
  buildDGSetPayload,
  createEmptyForm,
  dgSetHasAudit,
  dgSetToForm,
  getDGSetTabLabel,
  sortDGSetsStable,
  type DGSetFormState,
} from "./dg-set-utils";

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

interface DGSetSectionProps {
  utilityAccountId: string;
  facilityId: string;
  auditStepLocked?: boolean;
}

export function DGSetSection({
  utilityAccountId,
  facilityId,
  auditStepLocked = false,
}: DGSetSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetDGSetsQuery({
    utility_account_id: utilityAccountId,
  });
  const { data: dgAuditData, isLoading: isAuditLoading } =
    useGetDGAuditRecordsQuery({
      utility_account_id: utilityAccountId,
    });

  const [createDGSet, { isLoading: isCreating }] = useCreateDGSetMutation();
  const [updateDGSet, { isLoading: isUpdating }] = useUpdateDGSetMutation();
  const [deleteDGSet, { isLoading: isDeleting }] = useDeleteDGSetMutation();
  const [uploadDGSetDocuments, { isLoading: isUploadingDocs }] =
    useUploadDGSetDocumentsMutation();

  const dgSets = useMemo(() => data?.data || [], [data]);
  const dgAuditRecords = useMemo(() => dgAuditData?.data || [], [dgAuditData]);
  const sortedDgSets = useMemo(() => sortDGSetsStable(dgSets), [dgSets]);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<DGSetFormState | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DGSet | null>(null);
  const [uploadModalDgSetId, setUploadModalDgSetId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DGSetDocument | null>(null);
  const [previewDgSetId, setPreviewDgSetId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const dgSetTabs = useMemo(
    () =>
      sortedDgSets.map((dgSet, index) => ({
        id: dgSet._id,
        label: getDGSetTabLabel(dgSet, index),
        completed: dgSetHasAudit(dgSet._id, dgAuditRecords),
      })),
    [sortedDgSets, dgAuditRecords],
  );

  const activeDgSet = useMemo(
    () => sortedDgSets.find((dgSet) => dgSet._id === activeTabId) ?? null,
    [sortedDgSets, activeTabId],
  );

  const activeHasAudit = useMemo(() => {
    if (!activeDgSet) return false;
    return dgSetHasAudit(activeDgSet._id, dgAuditRecords);
  }, [activeDgSet, dgAuditRecords]);

  useEffect(() => {
    if (!dgSetTabs.length) {
      setActiveTabId("");
      return;
    }
    if (!dgSetTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(dgSetTabs[0].id);
    }
  }, [dgSetTabs, activeTabId]);

  const openCreateModal = () => {
    setModalForm(createEmptyForm());
    setFormModalOpen(true);
  };

  const openEditModal = (dgSet: DGSet) => {
    setModalForm(dgSetToForm(dgSet));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setModalForm(null);
  };

  const handleModalFormChange = (
    updater: (prev: DGSetFormState) => DGSetFormState,
  ) => {
    setModalForm((prev) => (prev ? updater(prev) : prev));
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    if (!modalForm.dg_number.trim()) {
      toast.error("DG Number is required");
      return;
    }

    const payload = buildDGSetPayload(
      modalForm,
      facilityId,
      utilityAccountId,
    );

    try {
      const result = await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createDGSet(payload).unwrap();
          }
          if (modalForm.id) {
            return updateDGSet({
              id: modalForm.id,
              ...payload,
            }).unwrap();
          }
          return Promise.reject(new Error("DG Set ID is missing."));
        },
        loading: modalForm.isNew ? "Creating DG set..." : "Updating DG set...",
        success: modalForm.isNew
          ? "DG set created successfully"
          : "DG set updated successfully",
      });
      if (modalForm.isNew && result?.data?._id) {
        setActiveTabId(result.data._id);
      } else if (modalForm.id) {
        setActiveTabId(modalForm.id);
      }
      closeFormModal();
    } catch (error) {
      console.error("Failed to save DG set:", error);
    }
  };

  const handleDelete = (dgSet: DGSet) => {
    if (!canDeleteRecords) return;
    setDeleteTarget(dgSet);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deleteDGSet(deleteTarget._id).unwrap(),
        loading: "Deleting DG set...",
        success: "DG set deleted successfully",
      });
      if (activeTabId === deleteTarget._id) {
        const remaining = sortedDgSets.filter(
          (dgSet) => dgSet._id !== deleteTarget._id,
        );
        setActiveTabId(remaining[0]?._id ?? "");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete DG set:", error);
    }
  };

  const handleOpenUploadModal = (dgSetId: string) => {
    setUploadModalDgSetId(dgSetId);
    setUploadFiles([]);
  };

  const handleUploadDocs = async () => {
    if (!uploadModalDgSetId || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadDGSetDocuments({
            id: uploadModalDgSetId,
            documents: uploadFiles.map((item) => item.file),
            captions: uploadFiles.map((item) => item.caption.trim()),
          }).unwrap(),
        loading: "Uploading documents...",
        success: "Documents uploaded successfully",
      });
      setUploadModalDgSetId(null);
      setUploadFiles([]);
    } catch (err) {
      console.error("Failed to upload documents:", err);
    }
  };

  const handleOpenPreview = (
    doc: DGSetDocument,
    dgSetId: string,
    index: number,
  ) => {
    if (!canViewDocumentsFlag) return;
    setPreviewDoc(doc);
    setPreviewDgSetId(dgSetId);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!previewDgSetId || previewDocIndex === null || !previewDoc) return;
    const dgSet = dgSets.find((item) => item._id === previewDgSetId);
    if (!dgSet) return;

    const existingDocuments = (dgSet.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateDGSet({
            id: previewDgSetId,
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
            <h3 className="text-lg font-medium text-foreground">DG Sets</h3>
            <p className="text-sm text-muted-foreground">
              Switch between DG sets using the tabs below. Audit opens in a modal;
              saved audits show as view-only cards with documents.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreateModal}
          className={cnHideUtilityAuditEdits(auditStepLocked)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create DG Set
        </Button>
      </div>

      {sortedDgSets.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No DG sets found. Click{" "}
          <span className="font-medium text-foreground">Create DG Set</span> to
          add one.
        </div>
      ) : (
        <div className="space-y-4">
          <CustomTabs
            tabs={dgSetTabs}
            activeTab={activeTabId}
            onTabChange={setActiveTabId}
            className="rounded-lg border bg-muted/20"
          />

          {activeDgSet ? (
            <DGSetDisplayCard
              key={activeDgSet._id}
              dgSet={activeDgSet}
              hasAudit={activeHasAudit}
              facilityId={facilityId}
              utilityAccountId={utilityAccountId}
              auditStepLocked={auditStepLocked}
              canDelete={canDeleteRecords}
              canViewDocuments={canViewDocumentsFlag}
              saving={saving}
              onEdit={() => openEditModal(activeDgSet)}
              onDelete={() => handleDelete(activeDgSet)}
              onUploadDocuments={() => handleOpenUploadModal(activeDgSet._id)}
              onPreviewDocument={handleOpenPreview}
            />
          ) : null}
        </div>
      )}

      <DGSetFormModal
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
            <AlertDialogTitle>Delete DG set?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {deleteTarget?.dg_number
                  ? `DG Set ${deleteTarget.dg_number}`
                  : "this DG set"}
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
        open={!!uploadModalDgSetId}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalDgSetId(null);
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
                document.getElementById("dg-set-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="dg-set-doc-file-input"
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
                      <Label htmlFor={`dg-set-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`dg-set-doc-caption-${item.id}`}
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
                setUploadModalDgSetId(null);
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
            setPreviewDgSetId(null);
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
                  <Label htmlFor="dg-set-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="dg-set-doc-preview-caption"
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
