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
  useCreateSafetyGeneralAuditMutation,
  useDeleteSafetyGeneralAuditMutation,
  useGetSafetyGeneralAuditsQuery,
  useUpdateSafetyGeneralAuditMutation,
} from "@/store/slices/safety-audit/safetyGeneralAuditApiSlice";
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
import { SafetyGeneralSafetyDisplayCard } from "./safety-general-safety-display-card";
import { SafetyGeneralSafetyFormModal } from "./safety-general-safety-form-modal";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";

const SAFETY_AUDIT_TAB_ID = "general-safety";

export interface SafetyGeneralSafetySectionProps {
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

export type SafetyGeneralSafetyFormState = {
  id?: string;
  localId: string;
  isNew: boolean;
  isEditing: boolean;
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

const DEFAULT_GENERAL_SAFETY_CHECKLIST_SPEC: readonly {
  activity_description: string;
  requirement: string;
}[] = [
  {
    activity_description: "Check route marking and exit lights at electrical installation.",
    requirement: "Exit light above door with arrow route marks.",
  },
  {
    activity_description: "Check provision of emergency lights at site",
    requirement: "Ensure operation",
  },
  {
    activity_description: "Check electrical enclosures are free from dust",
    requirement: "IP protection",
  },
  {
    activity_description: "Check the shrouding provision above live bus and terminals.",
    requirement: "Free from accidental contacts",
  },
  {
    activity_description: "Check danger notifications at site in English, Hindi, or local language.",
    requirement: "Visual inspection.",
  },
  {
    activity_description:
      "Check availability of licensed electrician as and when required for electrical repair and maintenance work",
    requirement: "Electrician license",
  },
  {
    activity_description: "Check correct access control is maintained at site",
    requirement: "Unauthored entry notifications",
  },
  {
    activity_description: "Check site is implementing LOTO procedure.",
    requirement: "LOTO register",
  },
  {
    activity_description: "Check backup power provision at site.",
    requirement: "DG / UPS / Two separate incoming lines",
  },
  {
    activity_description: "Check - conduit openings sealed properly",
    requirement: "Visual inspection",
  },
  {
    activity_description: "Check - cable entries sealed properly",
    requirement: "Visual inspection",
  },
  {
    activity_description:
      "Check - insulating rubber mats conforming IS 15652, provided in front of the electrical panels to save the operating personnel of electrical shock.",
    requirement: "Visual inspection",
  },
  {
    activity_description: "Check - IT cables and power cables laid in separate conduits",
    requirement: "Visual inspection",
  },
  {
    activity_description: "Megger tests on cables",
    requirement: "IR ≥ 1 MΩ for LT, ≥ 2 MΩ for HT",
  },
  {
    activity_description: "Check - Electrical insulated rubber gloves conform to IS 4770",
    requirement: "Visual inspection",
  },
  {
    activity_description: "Emergency exit lights functional",
    requirement: "Illuminated during power-off test",
  },
  {
    activity_description: "Signage visibility",
    requirement: "Glow-in-dark exit signs clear and unobstructed",
  },
  {
    activity_description: "Backup battery status",
    requirement: "Batteries tested, date logged",
  },
  {
    activity_description: "Segregation of material – oil, batteries, and types.",
    requirement: "Store apart",
  },
  {
    activity_description:
      "Check no flammable items near oil -batteries, corrugated box, electrical installation.",
    requirement: "Visual inspection.",
  },
  {
    activity_description: "Check the store area electrical sockets are not overloaded.",
    requirement: "15 A sockets free from multiple loads.",
  },
];

const nextKey = () =>
  `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function defaultGeneralSafetyChecklistRows(): ChecklistRow[] {
  return DEFAULT_GENERAL_SAFETY_CHECKLIST_SPEC.map((row, i) => ({
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

const createEmptyForm = (): SafetyGeneralSafetyFormState => ({
  localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  isNew: true,
  isEditing: true,
  audit_date: new Date().toISOString().split("T")[0],
  status: "draft",
  items: defaultGeneralSafetyChecklistRows(),
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

function recordToForm(r: SafetyAuditRecord): SafetyGeneralSafetyFormState {
  const items =
    Array.isArray(r.items) && r.items.length > 0
      ? (r.items as SafetyChecklistItem[]).map((it, i) => itemToRow(it, i))
      : defaultGeneralSafetyChecklistRows();

  return {
    id: r._id,
    localId: r._id,
    isNew: false,
    isEditing: false,
    audit_date: toDateInput(r.audit_date),
    status: r.status || "draft",
    items,
    documents: [],
    existingDocuments: r.documents || [],
  };
}

export function SafetyGeneralSafetySection({
  facilityId,
  utilityAccountId,
  auditStepLocked = false,
}: SafetyGeneralSafetySectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canEditDocumentCaption = canEditAuditDocumentCaption(user?.role);
  const canMarkPending = canUncompleteUtilityAuditStep(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading, refetch } = useGetSafetyGeneralAuditsQuery({
    utility_account_id: utilityAccountId,
  });

  const [createRec, { isLoading: isCreating }] = useCreateSafetyGeneralAuditMutation();
  const [updateRec, { isLoading: isUpdating }] = useUpdateSafetyGeneralAuditMutation();
  const [deleteRec, { isLoading: isDeleting }] = useDeleteSafetyGeneralAuditMutation();

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
  const [modalForm, setModalForm] = useState<SafetyGeneralSafetyFormState | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SafetyGeneralSafetyFormState | null>(
    null,
  );

  const [uploadModalRecordId, setUploadModalRecordId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);

  const [previewDoc, setPreviewDoc] = useState<SafetyAuditAttachment | null>(null);
  const [previewRecordId, setPreviewRecordId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const recordTabs = useMemo(
    () =>
      sortedRecords.map((record, index) => ({
        id: record._id,
        label: `General Safety ${index + 1}`,
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
          ? "Creating general safety audit..."
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
        Loading safety general safety audits…
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            Safety — General Safety
          </h3>
          <p className="text-sm text-muted-foreground">
            Switch between general safety records using the tabs. Add or edit details
            via modals.
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

          {activeRecord && activeRecordIndex >= 0 ? (
            <SafetyGeneralSafetyDisplayCard
              record={activeRecord}
              recordIndex={activeRecordIndex}
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

      <SafetyGeneralSafetyFormModal
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
              This will permanently delete this general safety audit record.
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
                document.getElementById("general-safety-record-doc-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images)
              </p>
              <input
                id="general-safety-record-doc-input"
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
