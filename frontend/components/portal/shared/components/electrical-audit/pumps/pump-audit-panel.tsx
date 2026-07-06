"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Label } from "@/components/portal/ui/label";
import { Input } from "@/components/portal/ui/input";
import { ClipboardList, ClipboardPlus, Upload, X, Save } from "lucide-react";
import {
  canViewDocuments,
  type UserPermission,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { cnHideUtilityAuditEdits } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { toastHandler } from "@/components/portal/lib/toast";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { useAppSelector } from "@/store/hooks";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import type { Pump } from "@/store/slices/electrical-audit/pumpApiSlice";
import {
  useDeletePumpAuditRecordMutation,
  useGetPumpAuditRecordsQuery,
  useUpdatePumpAuditRecordMutation,
  useUploadPumpAuditRecordDocumentsMutation,
  type PumpAuditRecord,
  type PumpAuditRecordDocument,
} from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";
import { getLatestPumpAuditRecord } from "./pump-audit-utils";
import { PumpAuditDisplayCard } from "./pump-audit-display-card";
import { PumpAuditFormModal } from "./pump-audit-form-modal";

interface PumpAuditPanelProps {
  pump: Pump;
  facilityId: string;
  utilityAccountId: string;
  auditStepLocked?: boolean;
}

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

export function PumpAuditPanel({
  pump,
  facilityId,
  utilityAccountId,
  auditStepLocked = false,
}: PumpAuditPanelProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data: auditData } = useGetPumpAuditRecordsQuery({
    pump_id: pump._id,
  });

  const [deletePumpAuditRecord, { isLoading: isDeleting }] =
    useDeletePumpAuditRecordMutation();
  const [updatePumpAuditRecord, { isLoading: isUpdating }] =
    useUpdatePumpAuditRecordMutation();
  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle(updatePumpAuditRecord);
  const [uploadPumpAuditRecordDocuments, { isLoading: isUploadingDocs }] =
    useUploadPumpAuditRecordDocumentsMutation();

  const auditRecords = useMemo(() => auditData?.data || [], [auditData]);
  const latestRecord = useMemo(
    () => getLatestPumpAuditRecord(auditRecords),
    [auditRecords],
  );

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [initialEditing, setInitialEditing] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<PumpAuditRecordDocument | null>(
    null,
  );
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const handleEdit = () => {
    setInitialEditing(true);
    setFormModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!latestRecord?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deletePumpAuditRecord(latestRecord._id).unwrap(),
        loading: "Deleting pump audit...",
        success: "Pump audit deleted successfully",
      });
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error("Failed to delete pump audit:", err);
    }
  };

  const handleUploadDocs = async () => {
    if (!latestRecord?._id || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadPumpAuditRecordDocuments({
            id: latestRecord._id,
            documents: uploadFiles.map((f) => f.file),
            captions: uploadFiles.map((f) => f.caption.trim()),
          }).unwrap(),
        loading: "Uploading audit documents...",
        success: "Audit documents uploaded successfully",
      });
      setUploadModalOpen(false);
      setUploadFiles([]);
    } catch (err) {
      console.error("Failed to upload audit documents:", err);
    }
  };

  const handleOpenPreview = (
    doc: PumpAuditRecordDocument,
    recordId: string,
    index: number,
  ) => {
    if (!canViewDocumentsFlag) return;
    setPreviewDoc(doc);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!latestRecord?._id || previewDocIndex === null || !previewDoc) return;

    const existingDocuments = (latestRecord.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updatePumpAuditRecord({
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

  const saving = isDeleting || isUpdating || isUploadingDocs;

  return (
    <Card className="border-dashed bg-muted/10">
      <CardHeader className="flex flex-row items-center gap-2 py-3">
        <ClipboardList className="h-5 w-5 text-primary" />
        <CardTitle className="text-sm font-semibold">Pump audit</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        {latestRecord ? (
          <PumpAuditDisplayCard
            record={latestRecord}
            pumpTag={pump.pump_tag_number}
            auditStepLocked={auditStepLocked}
            canDelete={canDeleteRecords}
            canViewDocuments={canViewDocumentsFlag}
            saving={saving}
            onEdit={handleEdit}
            onDelete={() => setDeleteDialogOpen(true)}
            onToggleCompleteness={() =>
              void handleToggleCompleteness(latestRecord)
            }
            togglingCompleteness={completenessTargetId === latestRecord._id}
            onUploadDocuments={() => setUploadModalOpen(true)}
            onPreviewDocument={handleOpenPreview}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
            <ClipboardPlus className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <h4 className="mb-1 text-sm font-medium text-foreground">
              No audit record found
            </h4>
            <p className="mb-4 max-w-sm text-xs text-muted-foreground">
              This pump has not been audited yet. Click the button below to add parameters and performance values.
            </p>
            <Button
              onClick={() => {
                setInitialEditing(true);
                setFormModalOpen(true);
              }}
              variant="outline"
              size="sm"
              className={cnHideUtilityAuditEdits(auditStepLocked)}
            >
              Audit this pump
            </Button>
          </div>
        )}
      </CardContent>

      <PumpAuditFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        facilityId={facilityId}
        utilityAccountId={utilityAccountId}
        pumpId={pump._id}
        auditStepLocked={auditStepLocked}
        initialEditing={initialEditing}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pump audit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the saved audit parameters and
              efficiency logs for this pump. This action cannot be undone.
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
        open={uploadModalOpen}
        onOpenChange={(open) => {
          setUploadModalOpen(open);
          if (!open) setUploadFiles([]);
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
                document.getElementById("pump-audit-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="pump-audit-doc-file-input"
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
                      <Label htmlFor={`pump-audit-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`pump-audit-doc-caption-${item.id}`}
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
                  <Label htmlFor="pump-audit-doc-preview-caption">
                    Caption
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="pump-audit-doc-preview-caption"
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
    </Card>
  );
}
