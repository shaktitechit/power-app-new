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
import { useGetPumpAuditRecordsQuery } from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";
import {
  useCreatePumpMutation,
  useDeletePumpMutation,
  useGetPumpsQuery,
  useUpdatePumpMutation,
  useUploadPumpDocumentsMutation,
  type Pump,
  type PumpDocument,
} from "@/store/slices/electrical-audit/pumpApiSlice";
import { PumpDisplayCard } from "./pump-display-card";
import { PumpFormModal } from "./pump-form-modal";
import {
  buildPumpPayload,
  createEmptyForm,
  pumpHasAudit,
  pumpToForm,
  getPumpTabLabel,
  sortPumpsStable,
  pumpAuditCompleted,
  type PumpFormState,
} from "./pump-utils";

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

interface PumpSectionProps {
  utilityAccountId: string;
  facilityId: string;
  auditStepLocked?: boolean;
}

export function PumpSection({
  utilityAccountId,
  facilityId,
  auditStepLocked = false,
}: PumpSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetPumpsQuery({
    utility_account_id: utilityAccountId,
  });
  const { data: auditData, isLoading: isAuditLoading } =
    useGetPumpAuditRecordsQuery({
      utility_account_id: utilityAccountId,
    });

  const [createPump, { isLoading: isCreating }] = useCreatePumpMutation();
  const [updatePump, { isLoading: isUpdating }] = useUpdatePumpMutation();
  const [deletePump, { isLoading: isDeleting }] = useDeletePumpMutation();
  const [uploadPumpDocuments, { isLoading: isUploadingDocs }] =
    useUploadPumpDocumentsMutation();

  const pumps = useMemo(() => data?.data || [], [data]);
  const pumpAuditRecords = useMemo(() => auditData?.data || [], [auditData]);
  const sortedPumps = useMemo(() => sortPumpsStable(pumps), [pumps]);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<PumpFormState | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Pump | null>(null);
  const [uploadModalPumpId, setUploadModalPumpId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<PumpDocument | null>(null);
  const [previewPumpId, setPreviewPumpId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const pumpTabs = useMemo(
    () =>
      sortedPumps.map((p, index) => ({
        id: p._id,
        label: getPumpTabLabel(p, index),
        completed: pumpAuditCompleted(p._id, pumpAuditRecords),
      })),
    [sortedPumps, pumpAuditRecords],
  );

  const activePump = useMemo(
    () => sortedPumps.find((p) => p._id === activeTabId) ?? null,
    [sortedPumps, activeTabId],
  );

  const activeHasAudit = useMemo(() => {
    if (!activePump) return false;
    return pumpAuditCompleted(activePump._id, pumpAuditRecords);
  }, [activePump, pumpAuditRecords]);

  useEffect(() => {
    if (!pumpTabs.length) {
      setActiveTabId("");
      return;
    }
    if (!pumpTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(pumpTabs[0].id);
    }
  }, [pumpTabs, activeTabId]);

  const openCreateModal = () => {
    setModalForm(createEmptyForm());
    setFormModalOpen(true);
  };

  const openEditModal = (p: Pump) => {
    setModalForm(pumpToForm(p));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setModalForm(null);
  };

  const handleModalFormChange = (
    updater: (prev: PumpFormState) => PumpFormState,
  ) => {
    setModalForm((prev) => (prev ? updater(prev) : prev));
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    if (!modalForm.pump_tag_number.trim()) {
      toast.error("Pump Tag Number is required");
      return;
    }

    const payload = buildPumpPayload(modalForm, facilityId, utilityAccountId);

    try {
      const result = await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createPump(payload).unwrap();
          }
          if (modalForm.id) {
            return updatePump({
              id: modalForm.id,
              ...payload,
            }).unwrap();
          }
          return Promise.reject(new Error("Pump ID is missing."));
        },
        loading: modalForm.isNew ? "Creating pump..." : "Updating pump...",
        success: modalForm.isNew
          ? "Pump created successfully"
          : "Pump updated successfully",
      });
      if (modalForm.isNew && result?.data?._id) {
        setActiveTabId(result.data._id);
      } else if (modalForm.id) {
        setActiveTabId(modalForm.id);
      }
      closeFormModal();
    } catch (error) {
      console.error("Failed to save pump:", error);
    }
  };

  const handleDelete = (p: Pump) => {
    if (!canDeleteRecords) return;
    setDeleteTarget(p);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deletePump(deleteTarget._id).unwrap(),
        loading: "Deleting pump...",
        success: "Pump deleted successfully",
      });
      if (activeTabId === deleteTarget._id) {
        const remaining = sortedPumps.filter((p) => p._id !== deleteTarget._id);
        setActiveTabId(remaining[0]?._id ?? "");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete pump:", error);
    }
  };

  const handleOpenUploadModal = (pId: string) => {
    setUploadModalPumpId(pId);
    setUploadFiles([]);
  };

  const handleUploadDocs = async () => {
    if (!uploadModalPumpId || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadPumpDocuments({
            id: uploadModalPumpId,
            documents: uploadFiles.map((item) => item.file),
            captions: uploadFiles.map((item) => item.caption.trim()),
          }).unwrap(),
        loading: "Uploading documents...",
        success: "Documents uploaded successfully",
      });
      setUploadModalPumpId(null);
      setUploadFiles([]);
    } catch (err) {
      console.error("Failed to upload documents:", err);
    }
  };

  const handleOpenPreview = (doc: PumpDocument, pId: string, index: number) => {
    if (!canViewDocumentsFlag) return;
    setPreviewDoc(doc);
    setPreviewPumpId(pId);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!previewPumpId || previewDocIndex === null || !previewDoc) return;
    const p = pumps.find((item) => item._id === previewPumpId);
    if (!p) return;

    const existingDocuments = (p.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updatePump({
            id: previewPumpId,
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
            <h3 className="text-lg font-medium text-foreground">Pumps</h3>
            <p className="text-sm text-muted-foreground">
              Switch between pumps using the tabs below. Audit opens in a modal;
              saved audits show as view-only cards with documents.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreateModal}
          className={cnHideUtilityAuditEdits(auditStepLocked)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Pump
        </Button>
      </div>

      {sortedPumps.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No pumps found. Click{" "}
          <span className="font-medium text-foreground">Create Pump</span> to add
          one.
        </div>
      ) : (
        <div className="space-y-4">
          <CustomTabs
            tabs={pumpTabs}
            activeTab={activeTabId}
            onTabChange={setActiveTabId}
            className="rounded-lg border bg-muted/20"
          />

          {activePump ? (
            <PumpDisplayCard
              key={activePump._id}
              pump={activePump}
              hasAudit={activeHasAudit}
              facilityId={facilityId}
              utilityAccountId={utilityAccountId}
              auditStepLocked={auditStepLocked}
              canDelete={canDeleteRecords}
              canViewDocuments={canViewDocumentsFlag}
              saving={saving}
              onEdit={() => openEditModal(activePump)}
              onDelete={() => handleDelete(activePump)}
              onUploadDocuments={() => handleOpenUploadModal(activePump._id)}
              onPreviewDocument={handleOpenPreview}
            />
          ) : null}
        </div>
      )}

      <PumpFormModal
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
            <AlertDialogTitle>Delete pump?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>
                {deleteTarget?.pump_tag_number
                  ? `Pump ${deleteTarget.pump_tag_number}`
                  : "this pump"}
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
        open={!!uploadModalPumpId}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalPumpId(null);
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
                document.getElementById("pump-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="pump-doc-file-input"
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
                      <Label htmlFor={`pump-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`pump-doc-caption-${item.id}`}
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
                setUploadModalPumpId(null);
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
            setPreviewPumpId(null);
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
                  <Label htmlFor="pump-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pump-doc-preview-caption"
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
