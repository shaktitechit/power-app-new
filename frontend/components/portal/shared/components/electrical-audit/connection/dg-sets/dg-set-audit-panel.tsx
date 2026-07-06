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
import { cnHideUtilityAuditEdits } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import {
  canViewDocuments,
  type UserPermission,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { toastHandler } from "@/components/portal/lib/toast";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { useAppSelector } from "@/store/hooks";
import {
  useDeleteDGAuditRecordMutation,
  useGetDGAuditRecordsQuery,
  useUpdateDGAuditRecordMutation,
  useUploadDGAuditRecordDocumentsMutation,
  type DGAuditRecordDocument,
} from "@/store/slices/electrical-audit/dgAuditRecordApiSlice";
import { ClipboardList, Save, Upload, X } from "lucide-react";
import { DGAuditDisplayCard } from "./dg-audit-display-card";
import { DGAuditFormModal } from "./dg-audit-form-modal";
import { getLatestDGAuditRecord } from "./dg-audit-utils";

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
  dgSetId: string;
  dgNumber: string;
  auditStepLocked?: boolean;
};

export function DGSetAuditPanel({
  facilityId,
  utilityAccountId,
  dgSetId,
  dgNumber,
  auditStepLocked = false,
}: Props) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetDGAuditRecordsQuery({
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    dg_set_id: dgSetId,
  });

  const [deleteDGAuditRecord, { isLoading: isDeleting }] =
    useDeleteDGAuditRecordMutation();
  const [updateDGAuditRecord, { isLoading: isUpdating }] =
    useUpdateDGAuditRecordMutation();
  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle(updateDGAuditRecord);
  const [uploadDGAuditRecordDocuments, { isLoading: isUploadingDocs }] =
    useUploadDGAuditRecordDocumentsMutation();

  const latestRecord = useMemo(
    () => getLatestDGAuditRecord(data?.data ?? []),
    [data],
  );

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DGAuditRecordDocument | null>(
    null,
  );
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  useEffect(() => {
    setAuditModalOpen(false);
    setUploadModalOpen(false);
    setUploadFiles([]);
    setPreviewDoc(null);
    setPreviewDocIndex(null);
    setEditCaptionValue("");
  }, [dgSetId]);

  const handleOpenUploadModal = () => {
    setUploadFiles([]);
    setUploadModalOpen(true);
  };

  const handleUploadDocs = async () => {
    if (!latestRecord?._id || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadDGAuditRecordDocuments({
            id: latestRecord._id,
            documents: uploadFiles.map((item) => item.file),
            captions: uploadFiles.map((item) => item.caption.trim()),
          }).unwrap(),
        loading: "Uploading documents...",
        success: "Documents uploaded successfully",
      });
      setUploadModalOpen(false);
      setUploadFiles([]);
    } catch (err) {
      console.error("Failed to upload documents:", err);
    }
  };

  const handleOpenPreview = (
    doc: DGAuditRecordDocument,
    _recordId: string,
    index: number,
  ) => {
    if (!canViewDocumentsFlag) return;
    setPreviewDoc(doc);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!latestRecord || previewDocIndex === null || !previewDoc) return;

    const existingDocuments = (latestRecord.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateDGAuditRecord({
            id: latestRecord._id,
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

  const handleConfirmDelete = async () => {
    if (!latestRecord?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deleteDGAuditRecord(latestRecord._id).unwrap(),
        loading: "Deleting DG audit record...",
        success: "DG audit record deleted successfully",
      });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete DG audit record:", error);
    }
  };

  const saving = isDeleting || isUpdating || isUploadingDocs;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ClipboardList className="h-4 w-4 text-primary" />
        DG audit
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Loading audit record…
        </div>
      ) : !latestRecord ? (
        <div className="rounded-lg border border-dashed bg-background px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No DG audit saved for{" "}
            <span className="font-medium text-foreground">
              DG Set {dgNumber || "—"}
            </span>
            .
          </p>
          <Button
            className={cnHideUtilityAuditEdits(
              auditStepLocked,
              "mt-4 bg-warning text-warning-foreground hover:bg-warning/90",
            )}
            onClick={() => setAuditModalOpen(true)}
            disabled={auditStepLocked}
          >
            Audit this DG set
          </Button>
        </div>
      ) : (
        <DGAuditDisplayCard
          record={latestRecord}
          dgNumber={dgNumber}
          auditStepLocked={auditStepLocked}
          canDelete={canDeleteRecords}
          canViewDocuments={canViewDocumentsFlag}
          saving={saving}
          onEdit={() => setAuditModalOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
          onToggleCompleteness={() =>
            void handleToggleCompleteness(latestRecord)
          }
          togglingCompleteness={completenessTargetId === latestRecord._id}
          onUploadDocuments={handleOpenUploadModal}
          onPreviewDocument={handleOpenPreview}
        />
      )}

      <DGAuditFormModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        facilityId={facilityId}
        utilityAccountId={utilityAccountId}
        dgSetId={dgSetId}
        auditStepLocked={auditStepLocked}
        initialEditing
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DG audit record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the audit record for DG Set{" "}
              {dgNumber || "—"}. This action cannot be undone.
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
        open={uploadModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalOpen(false);
            setUploadFiles([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Upload Audit Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-muted/50"
              onClick={() =>
                document.getElementById("dg-audit-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="dg-audit-doc-file-input"
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
                      <Label htmlFor={`dg-audit-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`dg-audit-doc-caption-${item.id}`}
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
                setUploadModalOpen(false);
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
                  <Label htmlFor="dg-audit-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="dg-audit-doc-preview-caption"
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
