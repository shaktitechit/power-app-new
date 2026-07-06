"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Activity, FileText, ImageIcon, Plug, Save, Upload, X, Zap } from "lucide-react";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";
import {
  useUpdateUtilityAccountMutation,
  useUploadUtilityAccountDocumentsMutation,
} from "@/store/slices/electrical-audit/utilityApiSlice";
import { filterIncludedDataSheetSections } from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { toastHandler } from "@/components/portal/lib/toast";
import {
  type UtilityDocument,
  formatUtilityAuditSubmittedBy,
} from "../shared/utility-account-workspace-types";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { useAppSelector } from "@/store/hooks";
import { canManageResource } from "@/components/portal/lib/authRoles";

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
  utilityAccount: UtilityAccount;
  canViewDocs: boolean;
  finalAuditLocked: boolean;
  finalAuditSubmission:
    | {
        submitted_at?: string;
        submitted_by?: string | { _id?: string; name?: string; email?: string };
      }
    | undefined;
  auditStatusLabel: string;
  auditStepLocked: boolean;
};

export function UtilityAccountDetailsSafety({
  utilityAccount,
  canViewDocs,
  finalAuditLocked,
  finalAuditSubmission,
  auditStatusLabel,
  auditStepLocked,
}: Props) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<UtilityDocument | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const user = useAppSelector((state) => state.auth.user);
  const canUpdateUtilityAccount = canManageResource(
    user?.role,
    user?.permissions || [],
    "utility_account",
    "update",
  );

  const [updateUtilityAccount, { isLoading: isUpdating }] =
    useUpdateUtilityAccountMutation();
  const [uploadUtilityAccountDocuments, { isLoading: isUploadingDocs }] =
    useUploadUtilityAccountDocumentsMutation();

  const handleUploadDocs = async () => {
    if (!utilityAccount._id || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadUtilityAccountDocuments({
            id: utilityAccount._id,
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

  const handleOpenPreview = (doc: UtilityDocument, index: number) => {
    if (!canViewDocs) return;
    setPreviewDoc(doc);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (previewDocIndex === null || !previewDoc) return;

    const existingDocuments = (utilityAccount.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateUtilityAccount({
            id: utilityAccount._id,
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Plug className="h-5 w-5 text-primary" />
              Utility Account Information
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {utilityAccount.account_number || "-"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {utilityAccount.connection_type || "-"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Category</span>
                <span className="text-right text-foreground">
                  {utilityAccount.category || "-"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Location</span>
                <span className="text-right text-foreground">
                  {utilityAccount.location || "-"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Sanctioned Demand</span>
                <span className="text-right text-foreground">
                  {utilityAccount.sanctioned_demand_value != null
                    ? `${utilityAccount.sanctioned_demand_value} ${utilityAccount.sanctioned_demand_unit || "kVA"}`
                    : utilityAccount.sanctioned_demand_kVA != null
                      ? `${utilityAccount.sanctioned_demand_kVA} kVA`
                      : "-"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Provider</span>
                <span className="text-right text-foreground">
                  {utilityAccount.provider || "-"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Audit Status</span>
                <span
                  className={`text-right font-medium ${
                    finalAuditLocked
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {auditStatusLabel}
                </span>
              </div>

              {finalAuditLocked ? (
                <>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Audit completed at</span>
                    <span className="text-right text-foreground">
                      {finalAuditSubmission?.submitted_at
                        ? new Date(
                            finalAuditSubmission.submitted_at,
                          ).toLocaleString()
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Completed by</span>
                    <span className="text-right text-foreground">
                      {formatUtilityAuditSubmittedBy(
                        finalAuditSubmission?.submitted_by,
                      )}
                    </span>
                  </div>
                </>
              ) : null}

              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Audit Date</span>
                <span className="text-right text-foreground">
                  {utilityAccount.audit_date
                    ? new Date(utilityAccount.audit_date).toLocaleDateString()
                    : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Activity className="h-5 w-5 text-primary" />
              Connection Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="flex flex-wrap gap-2">
              {(() => {
                const includedSections = filterIncludedDataSheetSections(
                  utilityAccount.dataSheet,
                );

                if (includedSections.length === 0) {
                  return (
                    <span className="text-xs text-muted-foreground">
                      No audit sheets connected
                    </span>
                  );
                }

                return includedSections.map((section) => (
                  <span
                    key={section.key}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${section.activeClass.replace(/border-[^ ]+/g, "").trim()}`}
                  >
                    {section.label} Included
                  </span>
                ));
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Connection Type</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {utilityAccount.connection_type || "-"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Provider</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {utilityAccount.provider || "-"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Audit Status</p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    finalAuditLocked
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {auditStatusLabel}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <ImageIcon className="h-5 w-5 text-primary" />
            Images & Documents
          </CardTitle>
          {canUpdateUtilityAccount && !auditStepLocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUploadFiles([]);
                setUploadModalOpen(true);
              }}
              className="h-8 text-xs sm:text-sm"
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              Upload
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {!canViewDocs ? (
            <p className="text-sm text-muted-foreground">
              Only super admin, admin, and manager can view uploaded documents.
            </p>
          ) : utilityAccount.documents?.length > 0 ? (
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {utilityAccount.documents.map(
                (doc: UtilityDocument, index: number) => (
                  <div
                    key={index}
                    className="flex min-w-0 items-start gap-2 rounded-lg border p-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {doc.fileType === "image" ? (
                        <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(doc, index)}
                          className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
                        >
                          {doc.fileName || `Document ${index + 1}`}
                        </button>
                        {doc.caption ? (
                          <p
                            className="truncate text-xs text-muted-foreground"
                            title={doc.caption}
                          >
                            {doc.caption}
                          </p>
                        ) : null}
                        {doc.uploadedAt ? (
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No documents uploaded.</p>
          )}
        </CardContent>
      </Card>

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
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-muted/50"
              onClick={() =>
                document.getElementById("utility-account-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="utility-account-doc-file-input"
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
                      <Label htmlFor={`utility-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`utility-doc-caption-${item.id}`}
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
              {canUpdateUtilityAccount && !auditStepLocked ? (
                <div className="space-y-2">
                  <Label htmlFor="utility-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="utility-doc-preview-caption"
                      value={editCaptionValue}
                      onChange={(e) => setEditCaptionValue(e.target.value)}
                      placeholder="Document caption"
                    />
                    <Button
                      type="button"
                      onClick={handleSaveCaption}
                      disabled={isUpdating}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : previewDoc.caption ? (
                <p className="text-sm text-muted-foreground">
                  {previewDoc.caption}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
