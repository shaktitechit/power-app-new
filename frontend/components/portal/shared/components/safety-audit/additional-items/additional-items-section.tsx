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
import {
  useCreateSafetyAdditionalItemsAuditMutation,
  useDeleteSafetyAdditionalItemsAuditMutation,
  useGetSafetyAdditionalItemsAuditsQuery,
  useUpdateSafetyAdditionalItemsAuditMutation,
} from "@/store/slices/safety-audit/safetyAdditionalItemsAuditApiSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { useAppSelector } from "@/store/hooks";
import {
  type SafetyAuditAttachment,
  type SafetyAuditRecord,
  type SafetyChecklistItem,
  type SafetyCompliance,
  type SafetySeverity,
} from "@/store/slices/safety-audit/safetyAuditTypes";
import {
  canViewDocuments,
  canUncompleteUtilityAuditStep,
  type UserPermission,
  canDeleteAuditRecords,
  canEditAuditDocumentCaption,
} from "@/components/portal/lib/authRoles";
import { SafetyAuditEmptyRecords } from "@/components/portal/shared/components/safety-audit/safety-audit-empty-records";
import { SafetyAdditionalItemsDisplayCard } from "./safety-additional-items-display-card";
import { SafetyAdditionalItemsFormModal } from "./safety-additional-items-form-modal";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";

const SAFETY_AUDIT_TAB_ID = "additional-items";

export interface SafetyAdditionalItemsSectionProps {
  facilityId: string;
  utilityAccountId: string;
  auditStepLocked?: boolean;
}

export type ChecklistRow = {
  localKey: string;
  sr_no: number;
  activity_description: string;
  requirement: string;
  compliance: SafetyCompliance;
  remarks: string;
  recommendations: string;
  severity: SafetySeverity;
};

export type SafetyAdditionalItemsFormState = {
  id?: string;
  localId: string;
  isNew: boolean;
  isEditing: boolean;
  area_name: string;
  location: string;
  audit_date: string;
  status: "draft" | "completed" | "approved" | "";
  items: ChecklistRow[];
  documents: File[];
  existingDocuments: SafetyAuditAttachment[];
};

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

const DEFAULT_ADDITIONAL_ITEMS_CHECKLIST_SPEC: readonly {
  activity_description: string;
  requirement: string;
}[] = [
  {
    activity_description: "Cable Routing",
    requirement: "No Cable Hanging, Proper Routing",
  },
  {
    activity_description: "Damage Cable",
    requirement:
      "Replace/Remove the cable in following\n1. Insulation damage\n2. Cable Cut",
  },
  {
    activity_description: "Cable Joints",
    requirement:
      "Check cable joints & eliminate by providing Terminal blocks or lay new piece of cable",
  },
  {
    activity_description: "Cable Terminals",
    requirement: "Use proper lugs & crimp",
  },
  {
    activity_description: "Terminal Box",
    requirement: "No open holes should be left in the terminal box",
  },
  {
    activity_description: "Terminal Box",
    requirement: "4 fasteners should be there to fix the TB firmly",
  },
  {
    activity_description: "Glands",
    requirement:
      "All panels/equipment's entry or exit proper size gland to be used",
  },
  {
    activity_description: "Sockets",
    requirement: "Right Spec as per load to be used",
  },
  {
    activity_description: "Equipment damage",
    requirement: "No damage, No broken, No crack",
  },
  {
    activity_description: "Tube light/Fan hanging on bed switch",
    requirement:
      "One equipment, one switch with proper insulation",
  },
  {
    activity_description: "Panel: Check for any unwanted holes",
    requirement: "No holes, if holes should be enclosed",
  },
  {
    activity_description: "Cleanliness inside the panel",
    requirement: "No dust & any material inside the panel",
  },
  {
    activity_description: "Earthing of Panel",
    requirement: "Check Presence",
  },
  {
    activity_description: "Check MCB rating",
    requirement:
      "According to load standard\nBreaker rating should not be more than cable rating used to connect",
  },
  {
    activity_description: "Cable should not contact with sharp edges of metals",
    requirement: "Cable edge protection cover",
  },
  {
    activity_description: "Unstandardized Cable laid",
    requirement: "Cable laid with cable tray",
  },
  {
    activity_description:
      "Both over & under crimped terminal can cause overheating",
    requirement:
      "Use proper & standard crimping tool for lug crimping",
  },
  {
    activity_description: "Power Cables jointing directly",
    requirement: "Need to use adaptor/junction box",
  },
  {
    activity_description: "Cables joints with direct connections",
    requirement:
      "Through Joint Kit should be used for Joint or adaptor box can be used",
  },
];

const nextKey = () =>
  `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function defaultAdditionalItemsChecklistRows(): ChecklistRow[] {
  return DEFAULT_ADDITIONAL_ITEMS_CHECKLIST_SPEC.map((row, i) => ({
    localKey: nextKey(),
    sr_no: i + 1,
    activity_description: row.activity_description,
    requirement: row.requirement,
    compliance: "",
    remarks: "",
    recommendations: "",
    severity: "",
  }));
}

const createEmptyForm = (): SafetyAdditionalItemsFormState => ({
  localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  isNew: true,
  isEditing: true,
  area_name: "",
  location: "",
  audit_date: new Date().toISOString().split("T")[0],
  status: "draft",
  items: defaultAdditionalItemsChecklistRows(),
  documents: [],
  existingDocuments: [],
});

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const itemToRow = (it: SafetyChecklistItem, index: number): ChecklistRow => ({
  localKey: nextKey(),
  sr_no: it.sr_no ?? index + 1,
  activity_description: it.activity_description || "",
  requirement: it.requirement || "",
  compliance: (it.compliance as SafetyCompliance) ?? "",
  remarks: it.remarks || "",
  recommendations: it.recommendations || "",
  severity: (it.severity as SafetySeverity) ?? "",
});

function recordToForm(r: SafetyAuditRecord): SafetyAdditionalItemsFormState {
  const items =
    Array.isArray(r.items) && r.items.length > 0
      ? (r.items as SafetyChecklistItem[]).map((it, i) => itemToRow(it, i))
      : defaultAdditionalItemsChecklistRows();

  return {
    id: r._id,
    localId: r._id,
    isNew: false,
    isEditing: false,
    area_name: typeof r.area_name === "string" ? r.area_name : "",
    location: typeof r.location === "string" ? r.location : "",
    audit_date: toDateInput(r.audit_date),
    status: r.status || "draft",
    items,
    documents: [],
    existingDocuments: r.documents || [],
  };
}

function recordTabLabel(record: SafetyAuditRecord, index: number): string {
  if (typeof record.area_name === "string" && record.area_name.trim()) {
    return record.area_name.trim();
  }
  return `Additional Item ${index + 1}`;
}

export function SafetyAdditionalItemsSection({
  facilityId,
  utilityAccountId,
  auditStepLocked = false,
}: SafetyAdditionalItemsSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canEditDocumentCaption = canEditAuditDocumentCaption(user?.role);
  const canMarkPending = canUncompleteUtilityAuditStep(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading, refetch } = useGetSafetyAdditionalItemsAuditsQuery({
    utility_account_id: utilityAccountId,
  });

  const [createRec, { isLoading: isCreating }] =
    useCreateSafetyAdditionalItemsAuditMutation();
  const [updateRec, { isLoading: isUpdating }] =
    useUpdateSafetyAdditionalItemsAuditMutation();
  const [deleteRec, { isLoading: isDeleting }] =
    useDeleteSafetyAdditionalItemsAuditMutation();

  const { completenessTargetId, handleToggleCompleteness } =
    useAuditRecordCompletenessToggle((arg) =>
      updateRec({ id: arg.id, is_completed: arg.is_completed }),
    );

  const records = useMemo(() => data?.data || [], [data]);
  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime(),
      ),
    [records],
  );

  const [activeTabId, setActiveTabId] = useState<string>("");
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<SafetyAdditionalItemsFormState | null>(
    null,
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SafetyAdditionalItemsFormState | null>(
    null,
  );

  const [uploadModalRecordId, setUploadModalRecordId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);

  const [previewDoc, setPreviewDoc] = useState<SafetyAuditAttachment | null>(null);
  const [previewRecordId, setPreviewRecordId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const recordTabs = useMemo(
    () =>
      sortedRecords.map((record, index) => ({
        id: record._id,
        label: recordTabLabel(record, index),
      })),
    [sortedRecords],
  );

  const activeRecordIndex = useMemo(
    () => sortedRecords.findIndex((r) => r._id === activeTabId),
    [sortedRecords, activeTabId],
  );

  const activeRecord = useMemo(
    () => (activeRecordIndex >= 0 ? sortedRecords[activeRecordIndex] : null),
    [sortedRecords, activeRecordIndex],
  );

  useEffect(() => {
    if (!recordTabs.length) {
      setActiveTabId("");
      return;
    }
    if (!recordTabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(recordTabs[0].id);
    }
  }, [recordTabs, activeTabId]);

  const openCreateModal = () => {
    setModalForm(createEmptyForm());
    setFormModalOpen(true);
  };

  const openEditModal = (rec: SafetyAuditRecord) => {
    setModalForm(recordToForm(rec));
    setFormModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    const payload = {
      facility_id: facilityId,
      utility_account_id: utilityAccountId,
      area_name: modalForm.area_name.trim() || undefined,
      location: modalForm.location.trim() || undefined,
      audit_date: modalForm.audit_date || undefined,
      status: (modalForm.status || "draft") as "draft" | "completed" | "approved",
      items: modalForm.items.map((row) => ({
        sr_no: row.sr_no,
        activity_description: row.activity_description,
        requirement: row.requirement,
        compliance: row.compliance,
        remarks: row.remarks,
        recommendations: row.recommendations,
        severity: row.severity,
      })),
    };

    try {
      const result = await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createRec(payload as never).unwrap();
          }
          return updateRec({ id: modalForm.id, ...payload } as never).unwrap();
        },
        loading: modalForm.isNew
          ? "Creating additional items safety audit..."
          : "Saving...",
        success: modalForm.isNew ? "Created successfully" : "Saved successfully",
      });

      if (modalForm.isNew && result?.data?._id) {
        setActiveTabId(result.data._id);
      } else if (modalForm.id) {
        setActiveTabId(modalForm.id);
      }
      setFormModalOpen(false);
      setModalForm(null);
      void refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (rec: SafetyAuditRecord) => {
    setDeleteTarget(recordToForm(rec));
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await toastHandler({
        action: () => deleteRec(deleteTarget.id as string).unwrap(),
        loading: "Deleting...",
        success: "Deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      void refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenUploadModal = (recordId: string) => {
    setUploadModalRecordId(recordId);
    setUploadFiles([]);
  };

  const handleUploadDocs = async () => {
    if (!uploadModalRecordId || uploadFiles.length === 0) return;
    const target = records.find((r) => r._id === uploadModalRecordId);
    if (!target) return;

    const payload = {
      facility_id: facilityId,
      utility_account_id: utilityAccountId,
      documents: uploadFiles.map((x) => x.file),
      captions: uploadFiles.map((x) => x.caption.trim()),
    };

    try {
      await toastHandler({
        action: () =>
          updateRec({ id: uploadModalRecordId, ...payload } as never).unwrap(),
        loading: "Uploading attachments...",
        success: "Attachments uploaded",
      });
      setUploadModalRecordId(null);
      setUploadFiles([]);
      void refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenPreview = (doc: SafetyAuditAttachment, index: number) => {
    if (!activeTabId) return;
    setPreviewDoc(doc);
    setPreviewRecordId(activeTabId);
    setPreviewDocIndex(index);
    setEditCaptionValue(doc.caption || "");
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
          updateRec({
            id: previewRecordId,
            existing_documents: existingDocuments,
          } as never).unwrap(),
        loading: "Saving caption...",
        success: "Caption updated",
      });
      setPreviewDoc((prev) =>
        prev ? { ...prev, caption: editCaptionValue } : prev,
      );
      void refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const saving = isCreating || isUpdating || isDeleting;

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading additional items safety audits…
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            Safety — Additional Items
          </h3>
          <p className="text-sm text-muted-foreground">
            Switch between additional items safety records using the tabs. Add or edit
            details via modals.
          </p>
        </div>
        {!auditStepLocked && (
          <Button
            type="button"
            onClick={openCreateModal}
            className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
            variant="outline"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        )}
      </div>

      {sortedRecords.length === 0 ? (
        <SafetyAuditEmptyRecords />
      ) : (
        <div className="space-y-4">
          <CustomTabs
            tabs={recordTabs}
            activeTab={activeTabId}
            onTabChange={setActiveTabId}
            className="rounded-lg border bg-muted/20"
          />

          {activeRecord ? (
            <SafetyAdditionalItemsDisplayCard
              record={activeRecord}
              auditStepLocked={auditStepLocked}
              canDelete={canDeleteRecords}
              canMarkPending={canMarkPending}
              canViewDocuments={canViewDocumentsFlag}
              saving={saving}
              onEdit={() => openEditModal(activeRecord)}
              onDelete={() => handleDelete(activeRecord)}
              onToggleCompleteness={() => {
                void handleToggleCompleteness(activeRecord).then(() => refetch());
              }}
              togglingCompleteness={completenessTargetId === activeRecord._id}
              onUploadDocuments={() => handleOpenUploadModal(activeRecord._id)}
              onPreviewDocument={handleOpenPreview}
            />
          ) : null}
        </div>
      )}

      <SafetyAdditionalItemsFormModal
        open={formModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormModalOpen(false);
            setModalForm(null);
          }
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this additional items safety audit record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/95"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
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
            <DialogTitle>Upload Attachments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 hover:bg-muted/50"
              onClick={() =>
                document.getElementById("additional-items-record-doc-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images)
              </p>
              <input
                id="additional-items-record-doc-input"
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
            {uploadFiles.length > 0 && (
              <ul className="space-y-3">
                {uploadFiles.map((item) => (
                  <li
                    key={item.id}
                    className="space-y-2 rounded-md border p-3 bg-muted/20"
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
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`caption-${item.id}`}>Caption</Label>
                      <Input
                        id={`caption-${item.id}`}
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
                        placeholder="Add a caption..."
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
              disabled={uploadFiles.length === 0 || isUpdating}
            >
              Upload
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
            <DialogTitle>{previewDoc?.fileName || "Attachment"}</DialogTitle>
          </DialogHeader>
          {previewDoc ? (
            <div className="space-y-4">
              {previewDoc.fileType === "image" ? (
                <img
                  src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                  alt={previewDoc.fileName || "Attachment"}
                  className="max-h-[60vh] w-full rounded-md object-contain"
                />
              ) : (
                <iframe
                  src={toSameOriginFileManagementUrl(previewDoc.fileUrl)}
                  title={previewDoc.fileName || "Attachment"}
                  className="h-[60vh] w-full rounded-md border"
                />
              )}
              {canEditDocumentCaption && !auditStepLocked ? (
                <div className="space-y-2">
                  <Label htmlFor="preview-doc-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="preview-doc-caption"
                      value={editCaptionValue}
                      onChange={(e) => setEditCaptionValue(e.target.value)}
                      placeholder="Caption"
                    />
                    <Button type="button" onClick={handleSaveCaption} disabled={isUpdating}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : previewDoc.caption ? (
                <p className="text-sm text-muted-foreground">{previewDoc.caption}</p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
