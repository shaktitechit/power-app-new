"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import { CustomTabs } from "@/components/portal/ui/custom-tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
  upsAuditFormToExcelPrefill,
  downloadUPSAuditExcelTemplate,
  parseUPSAuditExcel,
} from "@/components/portal/lib/electrical-audit/ups-audit-record-excel";
import { toastHandler } from "@/components/portal/lib/toast";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { AuditSectionSkeleton } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-skeleton";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { AuditRecordsEmptyState } from "@/components/portal/shared/components/electrical-audit/utility-audit/audit-records-empty-state";
import { useAppSelector } from "@/store/hooks";
import {
  useCreateUPSAuditMutation,
  useDeleteUPSAuditMutation,
  useGetUPSAuditsQuery,
  useUpdateUPSAuditMutation,
  useUploadUPSAuditDocumentsMutation,
  type UPSAuditRecord,
  type UPSAuditDocument,
} from "@/store/slices/electrical-audit/upsAuditApiSlice";
import { toast } from "sonner";
import { UPSAuditDisplayCard } from "./ups-audit-display-card";
import { UPSAuditFormModal } from "./ups-audit-form-modal";
import {
  applyUPSAuditExcelParsed,
  auditToForm,
  buildUPSAuditPayload,
  createEmptyForm,
  getUPSAuditTabLabel,
  sortUPSAuditsStable,
  type UPSAuditFormState,
} from "./ups-audit-utils";

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

interface UPSAuditSectionProps {
  facilityId: string;
  utilityAccountId: string;
  auditStepLocked?: boolean;
}

export function UPSAuditSection({
  facilityId,
  utilityAccountId,
  auditStepLocked = false,
}: UPSAuditSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetUPSAuditsQuery({ facility_id: facilityId, utility_account_id: utilityAccountId });

  const [createUPSAudit, { isLoading: isCreating }] =
    useCreateUPSAuditMutation();
  const [updateUPSAudit, { isLoading: isUpdating }] =
    useUpdateUPSAuditMutation();
  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle(updateUPSAudit);
  const [deleteUPSAudit, { isLoading: isDeleting }] =
    useDeleteUPSAuditMutation();
  const [uploadUPSAuditDocuments, { isLoading: isUploadingDocs }] =
    useUploadUPSAuditDocumentsMutation();

  const upsAudits = useMemo(() => data?.data || [], [data]);
  const sortedRecords = useMemo(
    () => sortUPSAuditsStable(upsAudits),
    [upsAudits],
  );
  const sheetEditsLocked = isUtilityAuditSheetEditsLocked(
    auditStepLocked,
    sortedRecords,
  );

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<UPSAuditFormState | null>(null);
  const [activeUPSTabId, setActiveUPSTabId] = useState<string>("");
  const [excelImporting, setExcelImporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UPSAuditRecord | null>(null);
  const [uploadModalRecordId, setUploadModalRecordId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<UPSAuditDocument | null>(null);
  const [previewRecordId, setPreviewRecordId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const upsTabs = useMemo(
    () =>
      sortedRecords.map((record, index) => ({
        id: record._id,
        label: getUPSAuditTabLabel(record, index),
      })),
    [sortedRecords],
  );

  const activeRecordIndex = useMemo(
    () => sortedRecords.findIndex((record) => record._id === activeUPSTabId),
    [sortedRecords, activeUPSTabId],
  );
  const activeRecord = sortedRecords[activeRecordIndex] || null;

  useEffect(() => {
    if (sortedRecords.length > 0 && !activeUPSTabId) {
      setActiveUPSTabId(sortedRecords[0]._id);
    }
  }, [sortedRecords, activeUPSTabId]);

  const handleAddClick = () => {
    setModalForm(createEmptyForm(facilityId, utilityAccountId));
    setFormModalOpen(true);
  };

  const handleEditClick = (record: UPSAuditRecord) => {
    setModalForm(auditToForm(record));
    setFormModalOpen(true);
  };

  const handleDeleteClick = (record: UPSAuditRecord) => {
    setDeleteTarget(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await toastHandler({
      action: () => deleteUPSAudit(deleteTarget._id).unwrap(),
      loading: "Deleting record...",
      success: "Record deleted successfully",
    });
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    if (activeUPSTabId === deleteTarget._id) {
      setActiveUPSTabId("");
    }
  };

  const handleSave = async () => {
    if (!modalForm) return;

    if (!modalForm.ups_tag_asset_id?.trim()) {
      toast.error("UPS Tag / Asset ID is required");
      return;
    }

    const payload = buildUPSAuditPayload(
      modalForm,
      facilityId,
      utilityAccountId,
    );

    if (modalForm.isNew) {
      await toastHandler({
        action: async () => {
          const res = await createUPSAudit({
            ...payload,
            documents: modalForm.newDocuments,
          }).unwrap();
          if (res.success && res.data) {
            setActiveUPSTabId(res.data._id);
          }
          return res;
        },
        loading: "Creating record...",
        success: "Record created successfully",
      });
    } else {
      await toastHandler({
        action: () =>
          updateUPSAudit({
            id: modalForm.id!,
            ...payload,
            documents: modalForm.newDocuments,
            existing_documents: modalForm.existingDocuments,
          }).unwrap(),
        loading: "Saving record...",
        success: "Record saved successfully",
      });
    }

    setFormModalOpen(false);
    setModalForm(null);
  };

  // Excel
  const handleExportTemplate = () => {
    const prefill = upsAuditFormToExcelPrefill(
      activeRecord ? auditToForm(activeRecord) : createEmptyForm(facilityId, utilityAccountId),
    );
    downloadUPSAuditExcelTemplate(prefill);
  };

  const handleImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelImporting(true);

    const promise = parseUPSAuditExcel(file)
      .then((parsed) => {
        const base = activeRecord
          ? auditToForm(activeRecord)
          : createEmptyForm(facilityId, utilityAccountId);
        const merged = applyUPSAuditExcelParsed(base, parsed);
        setModalForm(merged);
        setFormModalOpen(true);
        e.target.value = "";
      })
      .finally(() => {
        setExcelImporting(false);
      });

    toast.promise(promise, {
      loading: "Parsing Excel file...",
      success: "Excel parsed successfully! Review the values and click save.",
      error: (err) => `Failed to parse Excel: ${err?.message || "Unknown error"}`,
    });
  };

  // Docs
  const handleUploadDocsClick = (recordId: string) => {
    setUploadModalRecordId(recordId);
    setUploadFiles([]);
  };

  const handleAddUploadFile = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const next: PendingUploadFile[] = [...uploadFiles];
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      if (f) {
        next.push({ id: newPendingUploadId(), file: f, caption: "" });
      }
    }
    setUploadFiles(next);
    e.target.value = "";
  };

  const handleRemoveUploadFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((x) => x.id !== id));
  };

  const handleUploadCaptionChange = (id: string, val: string) => {
    setUploadFiles((prev) =>
      prev.map((x) => (x.id === id ? { ...x, caption: val } : x)),
    );
  };

  const handleSaveUploadedDocs = async () => {
    if (!uploadModalRecordId || uploadFiles.length === 0) return;
    const documents = uploadFiles.map((x) => x.file);
    const captions = uploadFiles.map((x) => x.caption);

    await toastHandler({
      action: () =>
        uploadUPSAuditDocuments({
          id: uploadModalRecordId,
          documents,
          captions,
        }).unwrap(),
      loading: "Uploading documents...",
      success: "Documents uploaded successfully",
    });

    setUploadModalRecordId(null);
    setUploadFiles([]);
  };

  // Preview
  const handlePreviewDocument = (
    doc: UPSAuditDocument,
    recordId: string,
    index: number,
  ) => {
    setPreviewDoc(doc);
    setPreviewRecordId(recordId);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption || "");
  };

  const handleUpdatePreviewCaption = async () => {
    if (!previewRecordId || previewDocIndex === null || !sortedRecords) return;
    const targetRecord = sortedRecords.find((x) => x._id === previewRecordId);
    if (!targetRecord) return;

    const docsCopy = [...(targetRecord.documents || [])];
    const targetDoc = docsCopy[previewDocIndex];
    if (!targetDoc) return;

    docsCopy[previewDocIndex] = { ...targetDoc, caption: editCaptionValue.trim() };

    await toastHandler({
      action: () =>
        updateUPSAudit({
          id: previewRecordId,
          existing_documents: docsCopy,
        }).unwrap(),
      loading: "Updating caption...",
      success: "Caption updated successfully",
    });

    setPreviewDoc((prev) => (prev ? { ...prev, caption: editCaptionValue.trim() } : null));
  };

  if (isLoading) {
    return <AuditSectionSkeleton />;
  }

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-foreground">
            UPS System Audits
          </h3>
          <p className="text-sm text-muted-foreground">
            Switch between UPS system audits using the tabs below. Use Add or
            Edit to open the form in a modal. Upload documents from the
            documents panel.
          </p>
        </div>
        <div
          className={cnHideUtilityAuditEdits(
            sheetEditsLocked,
            "flex flex-wrap items-center gap-2",
          )}
        >
          <input
            id="ups-excel-import"
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleImportExcel}
            disabled={excelImporting}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddClick}
            className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add UPS Audit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportTemplate}
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
              document.getElementById("ups-excel-import")?.click()
            }
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {excelImporting ? "Reading…" : "Import Excel"}
          </Button>
        </div>
      </div>

      {upsAudits.length === 0 ? (
        <AuditRecordsEmptyState onAdd={handleAddClick} onImport={handleExportTemplate} editsLocked={sheetEditsLocked} />
      ) : (
        <div className="space-y-4">
          <CustomTabs
            tabs={upsTabs}
            activeTab={activeUPSTabId}
            onTabChange={setActiveUPSTabId}
            className="rounded-lg border bg-muted/20"
          />

          {activeRecord ? (
            <UPSAuditDisplayCard
              record={activeRecord}
              tabLabel={getUPSAuditTabLabel(activeRecord, activeRecordIndex)}
              auditStepLocked={auditStepLocked}
              canDelete={canDeleteRecords}
              canViewDocuments={canViewDocumentsFlag}
              saving={isCreating || isUpdating}
              onEdit={() => handleEditClick(activeRecord)}
              onDelete={() => handleDeleteClick(activeRecord)}
              onToggleCompleteness={() => handleToggleCompleteness(activeRecord)}
              togglingCompleteness={completenessTargetId === activeRecord._id}
              onUploadDocuments={() => handleUploadDocsClick(activeRecord._id)}
              onPreviewDocument={handlePreviewDocument}
            />
          ) : null}
        </div>
      )}

      <UPSAuditFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        form={modalForm}
        onFormChange={setModalForm}
        onSave={handleSave}
        saving={isCreating || isUpdating}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the UPS system audit record for{" "}
              <strong>{deleteTarget?.ups_tag_asset_id || "this UPS"}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Docs Modal */}
      <Dialog open={uploadModalRecordId !== null} onOpenChange={(open) => !open && setUploadModalRecordId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg p-6">
              <div className="text-center relative">
                <input type="file" multiple onChange={handleAddUploadFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Button type="button" variant="secondary" size="sm">Select Files</Button>
                <p className="mt-1 text-xs text-muted-foreground">Images or PDFs up to 5MB</p>
              </div>
            </div>
            {uploadFiles.length > 0 && (
              <div className="max-h-[30vh] overflow-y-auto space-y-3">
                {uploadFiles.map((x) => (
                  <div key={x.id} className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{x.file.name}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveUploadFile(x.id)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`caption-${x.id}`} className="text-[10px] uppercase font-bold text-muted-foreground">Caption (Optional)</Label>
                      <Input id={`caption-${x.id}`} size="sm" value={x.caption} onChange={(e) => handleUploadCaptionChange(x.id, e.target.value)} placeholder="Enter brief caption..." />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalRecordId(null)} disabled={isUploadingDocs}>Cancel</Button>
            <Button onClick={handleSaveUploadedDocs} disabled={uploadFiles.length === 0 || isUploadingDocs}>{isUploadingDocs ? "Uploading..." : "Save Files"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Doc Modal */}
      <Dialog open={previewDoc !== null} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewDoc?.fileName || "Preview Document"}</DialogTitle>
          </DialogHeader>
          {previewDoc ? (
            <div className="space-y-4 py-2">
              <div className="flex max-h-[50vh] justify-center items-center overflow-hidden bg-muted/20 rounded-lg p-2">
                {previewDoc.fileType === "image" ? (
                  <img src={toSameOriginFileManagementUrl(previewDoc.fileUrl)} alt={previewDoc.fileName} className="max-h-full max-w-full object-contain" />
                ) : (
                  <iframe src={toSameOriginFileManagementUrl(previewDoc.fileUrl)} title={previewDoc.fileName} className="h-[45vh] w-full border-none" />
                )}
              </div>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Document Caption</Label>
                <div className="flex gap-2">
                  <Input value={editCaptionValue} onChange={(e) => setEditCaptionValue(e.target.value)} placeholder="Add caption..." />
                  <Button size="sm" onClick={handleUpdatePreviewCaption}><Save className="mr-2 h-4 w-4" /> Save</Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
