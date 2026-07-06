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
  useCreateSafetyPacVentilationAuditMutation,
  useDeleteSafetyPacVentilationAuditMutation,
  useGetSafetyPacVentilationAuditsQuery,
  useUpdateSafetyPacVentilationAuditMutation,
} from "@/store/slices/safety-audit/safetyPacVentilationAuditApiSlice";
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
import { SafetyPacVentilationDisplayCard } from "./safety-pac-ventilation-display-card";
import { SafetyPacVentilationFormModal } from "./safety-pac-ventilation-form-modal";
import { useAuditRecordCompletenessToggle } from "@/components/portal/shared/components/electrical-audit/utility-audit/use-audit-record-completeness-toggle";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";

const SAFETY_AUDIT_TAB_ID = "pac-ventilation";

export const UNIT_TYPES = ["pac", "ac", "ventilation", "exhaust", "other"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: "pac", label: "PAC" },
  { value: "ac", label: "AC" },
  { value: "ventilation", label: "Ventilation" },
  { value: "exhaust", label: "Exhaust" },
  { value: "other", label: "Other" },
];

export function normalizeUnitType(v: unknown): UnitType {
  const s = typeof v === "string" ? v : "";
  return UNIT_TYPES.includes(s as UnitType) ? (s as UnitType) : "pac";
}

export function formatUnitTypeLabel(v: unknown): string {
  const normalized = normalizeUnitType(v);
  return UNIT_TYPE_OPTIONS.find((o) => o.value === normalized)?.label ?? "-";
}

export interface SafetyPacVentilationSectionProps {
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

export type SafetyPacVentilationFormState = {
  id?: string;
  localId: string;
  isNew: boolean;
  isEditing: boolean;
  unit_name: string;
  unit_type: UnitType;
  location: string;
  room_temperature_c: string;
  relative_humidity_percent: string;
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

const DEFAULT_PAC_VENT_CHECKLIST_SPEC: readonly {
  activity_description: string;
  requirement: string;
}[] = [
  {
    activity_description: "Room temperature within range",
    requirement: "20 °C – 25 °C",
  },
  {
    activity_description: "Relative humidity within recommended limits",
    requirement: "45 % – 55 % RH",
  },
  {
    activity_description: "Timer-based PAC/standby test",
    requirement: "Switchover within 10–15 min",
  },
  {
    activity_description: "PAC unit vibration and noise",
    requirement: "No unusual noise or vibration",
  },
  {
    activity_description: "No water leakage from AC units",
    requirement: "Dry floor; no drips near panels",
  },
  {
    activity_description: "Redundant cooling availability (N+1)",
    requirement: "Minimum one backup PAC for 24×7 zones",
  },
  {
    activity_description: "Natural ventilation openings sufficient",
    requirement: "As per NBC Part 8 & IS:4894 minimum air changes",
  },
  {
    activity_description: "Mechanical ventilation operational",
    requirement: "Fans, exhausts working; maintenance records available",
  },
  {
    activity_description: "Airflow rates measured",
    requirement: "Matches design specifications",
  },
  {
    activity_description: "Vent paths unobstructed",
    requirement: "No blockages, grills clean",
  },
];

const nextKey = () =>
  `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function defaultChecklistRows(): ChecklistRow[] {
  return DEFAULT_PAC_VENT_CHECKLIST_SPEC.map((row, i) => ({
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

const createEmptyForm = (): SafetyPacVentilationFormState => ({
  localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  isNew: true,
  isEditing: true,
  unit_name: "",
  unit_type: "pac",
  location: "",
  room_temperature_c: "",
  relative_humidity_percent: "",
  audit_date: new Date().toISOString().split("T")[0],
  status: "draft",
  items: defaultChecklistRows(),
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

function recordToForm(r: SafetyAuditRecord): SafetyPacVentilationFormState {
  const items =
    Array.isArray(r.items) && r.items.length > 0
      ? (r.items as SafetyChecklistItem[]).map((it, i) => itemToRow(it, i))
      : defaultChecklistRows();

  return {
    id: r._id,
    localId: r._id,
    isNew: false,
    isEditing: false,
    unit_name: typeof r.unit_name === "string" ? r.unit_name : "",
    unit_type: normalizeUnitType(r.unit_type),
    location: typeof r.location === "string" ? r.location : "",
    room_temperature_c:
      r.room_temperature_c != null ? String(r.room_temperature_c) : "",
    relative_humidity_percent:
      r.relative_humidity_percent != null
        ? String(r.relative_humidity_percent)
        : "",
    audit_date: toDateInput(r.audit_date),
    status: r.status || "draft",
    items,
    documents: [],
    existingDocuments: r.documents || [],
  };
}

function recordTabLabel(record: SafetyAuditRecord, index: number): string {
  if (typeof record.unit_name === "string" && record.unit_name.trim()) {
    return record.unit_name.trim();
  }
  return `PAC/Ventilation ${index + 1}`;
}

export function SafetyPacVentilationSection({
  facilityId,
  utilityAccountId,
  auditStepLocked = false,
}: SafetyPacVentilationSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canEditDocumentCaption = canEditAuditDocumentCaption(user?.role);
  const canMarkPending = canUncompleteUtilityAuditStep(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading, refetch } = useGetSafetyPacVentilationAuditsQuery({
    utility_account_id: utilityAccountId,
  });

  const [createRec, { isLoading: isCreating }] =
    useCreateSafetyPacVentilationAuditMutation();
  const [updateRec, { isLoading: isUpdating }] =
    useUpdateSafetyPacVentilationAuditMutation();
  const [deleteRec, { isLoading: isDeleting }] =
    useDeleteSafetyPacVentilationAuditMutation();

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
  const [modalForm, setModalForm] = useState<SafetyPacVentilationFormState | null>(
    null,
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<SafetyPacVentilationFormState | null>(null);

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
      unit_name: modalForm.unit_name.trim() || undefined,
      unit_type: modalForm.unit_type,
      location: modalForm.location.trim() || undefined,
      room_temperature_c: modalForm.room_temperature_c
        ? Number(modalForm.room_temperature_c)
        : undefined,
      relative_humidity_percent: modalForm.relative_humidity_percent
        ? Number(modalForm.relative_humidity_percent)
        : undefined,
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
          ? "Creating PAC & ventilation safety audit..."
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
        Loading PAC & ventilation safety audits…
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            Safety — PAC & Ventilation
          </h3>
          <p className="text-sm text-muted-foreground">
            Switch between PAC & ventilation safety records using the tabs. Add or
            edit details via modals.
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
            <SafetyPacVentilationDisplayCard
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

      <SafetyPacVentilationFormModal
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
        unitTypeOptions={UNIT_TYPE_OPTIONS}
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
              This will permanently delete this PAC & ventilation safety audit
              record.
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
                document.getElementById("pac-vent-record-doc-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images)
              </p>
              <input
                id="pac-vent-record-doc-input"
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
