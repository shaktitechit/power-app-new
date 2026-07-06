"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
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
import { useGetSolarGenerationRecordsQuery } from "@/store/slices/electrical-audit/solarGenerationRecordApiSlice";
import { useGetUtilityBillingRecordsQuery } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import {
  useCreateSolarPlantMutation,
  useDeleteSolarPlantMutation,
  useGetSolarPlantsQuery,
  useUpdateSolarPlantMutation,
  useUploadSolarPlantDocumentsMutation,
  type SolarPlant,
  type SolarPlantDocument,
} from "@/store/slices/electrical-audit/solarPlantApiSlice";
import { SolarPlantDisplayCard } from "./solar-plant-display-card";
import { SolarPlantFormModal } from "./solar-plant-form-modal";
import {
  buildSolarPlantPayload,
  createEmptyForm,
  plantToForm,
  sortSolarPlantsStable,
  type SolarPlantFormState,
} from "./solar-plant-utils";
import {
  buildSolarGenerationForms,
  countAuditedPeriods,
  filterSolarRecordsForPlant,
} from "./solar-generation-record-utils";

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

interface SolarPlantSectionProps {
  utilityAccountId: string;
  facilityId: string;
  auditStepLocked?: boolean;
}

export function SolarPlantSection({
  utilityAccountId,
  facilityId,
  auditStepLocked = false,
}: SolarPlantSectionProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canDeleteRecords = canDeleteAuditRecords(user?.role);
  const canViewDocumentsFlag = canViewDocuments(
    user?.role,
    (user?.permissions as UserPermission[]) || [],
  );

  const { data, isLoading } = useGetSolarPlantsQuery({
    utility_account_id: utilityAccountId,
  });
  const { data: billingData, isLoading: isBillingLoading } =
    useGetUtilityBillingRecordsQuery({
      utility_account_id: utilityAccountId,
    });
  const { data: solarGenData, isLoading: isGenLoading } =
    useGetSolarGenerationRecordsQuery({
      utility_account_id: utilityAccountId,
    });

  const [createSolarPlant, { isLoading: isCreating }] =
    useCreateSolarPlantMutation();
  const [updateSolarPlant, { isLoading: isUpdating }] =
    useUpdateSolarPlantMutation();
  const [deleteSolarPlant, { isLoading: isDeleting }] =
    useDeleteSolarPlantMutation();
  const [uploadSolarPlantDocuments, { isLoading: isUploadingDocs }] =
    useUploadSolarPlantDocumentsMutation();

  const solarPlants = useMemo(() => data?.data || [], [data]);
  const utilityBillingRecords = useMemo(
    () => billingData?.data || [],
    [billingData],
  );
  const solarGenRecords = useMemo(
    () => solarGenData?.data || [],
    [solarGenData],
  );
  const sortedPlants = useMemo(
    () => sortSolarPlantsStable(solarPlants),
    [solarPlants],
  );

  const getPlantAuditCounts = (plantId: string) => {
    const plantRecords = filterSolarRecordsForPlant(solarGenRecords, plantId);
    const forms = buildSolarGenerationForms(
      utilityBillingRecords,
      plantRecords,
    );
    return countAuditedPeriods(forms);
  };

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState<SolarPlantFormState | null>(null);
  const [activePlantTabId, setActivePlantTabId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SolarPlant | null>(null);
  const [uploadModalPlantId, setUploadModalPlantId] = useState<string | null>(
    null,
  );
  const [uploadFiles, setUploadFiles] = useState<PendingUploadFile[]>([]);
  const [previewDoc, setPreviewDoc] = useState<SolarPlantDocument | null>(null);
  const [previewPlantId, setPreviewPlantId] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState("");

  const plantTabs = useMemo(
    () =>
      sortedPlants.map((plant, index) => {
        const { audited, total } = getPlantAuditCounts(plant._id);
        const allPeriodsAudited = total > 0 && audited >= total;
        return {
          id: plant._id,
          label: plant.plant_name?.trim() || `Plant ${index + 1}`,
          completed: allPeriodsAudited,
        };
      }),
    [sortedPlants, solarGenRecords, utilityBillingRecords],
  );

  const activePlant = useMemo(
    () => sortedPlants.find((plant) => plant._id === activePlantTabId) ?? null,
    [sortedPlants, activePlantTabId],
  );

  const activePlantCounts = useMemo(() => {
    if (!activePlant) return null;
    return getPlantAuditCounts(activePlant._id);
  }, [activePlant, solarGenRecords, utilityBillingRecords]);

  useEffect(() => {
    if (!plantTabs.length) {
      setActivePlantTabId("");
      return;
    }
    if (!plantTabs.some((tab) => tab.id === activePlantTabId)) {
      setActivePlantTabId(plantTabs[0].id);
    }
  }, [plantTabs, activePlantTabId]);

  const openCreateModal = () => {
    setModalForm(createEmptyForm());
    setFormModalOpen(true);
  };

  const openEditModal = (plant: SolarPlant) => {
    setModalForm(plantToForm(plant));
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    setFormModalOpen(false);
    setModalForm(null);
  };

  const handleModalFormChange = (
    updater: (prev: SolarPlantFormState) => SolarPlantFormState,
  ) => {
    setModalForm((prev) => (prev ? updater(prev) : prev));
  };

  const handleSaveModal = async () => {
    if (!modalForm) return;

    const payload = buildSolarPlantPayload(
      modalForm,
      facilityId,
      utilityAccountId,
    );

    try {
      const result = await toastHandler({
        action: () => {
          if (modalForm.isNew) {
            return createSolarPlant(payload).unwrap();
          }
          if (modalForm.id) {
            return updateSolarPlant({
              id: modalForm.id,
              ...payload,
            }).unwrap();
          }
          return Promise.reject(new Error("Solar plant ID is missing."));
        },
        loading: modalForm.isNew
          ? "Creating solar plant..."
          : "Updating solar plant...",
        success: modalForm.isNew
          ? "Solar plant created successfully"
          : "Solar plant updated successfully",
      });
      if (modalForm.isNew && result?.data?._id) {
        setActivePlantTabId(result.data._id);
      } else if (modalForm.id) {
        setActivePlantTabId(modalForm.id);
      }
      closeFormModal();
    } catch (error) {
      console.error("Failed to save solar plant:", error);
    }
  };

  const handleDelete = (plant: SolarPlant) => {
    if (!canDeleteRecords) return;
    setDeleteTarget(plant);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id || !canDeleteRecords) return;
    try {
      await toastHandler({
        action: () => deleteSolarPlant(deleteTarget._id).unwrap(),
        loading: "Deleting solar plant...",
        success: "Solar plant deleted successfully",
      });
      if (activePlantTabId === deleteTarget._id) {
        const remaining = sortedPlants.filter(
          (plant) => plant._id !== deleteTarget._id,
        );
        setActivePlantTabId(remaining[0]?._id ?? "");
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete solar plant:", error);
    }
  };

  const handleOpenUploadModal = (plantId: string) => {
    setUploadModalPlantId(plantId);
    setUploadFiles([]);
  };

  const handleUploadDocs = async () => {
    if (!uploadModalPlantId || uploadFiles.length === 0) return;
    try {
      await toastHandler({
        action: () =>
          uploadSolarPlantDocuments({
            id: uploadModalPlantId,
            documents: uploadFiles.map((item) => item.file),
            captions: uploadFiles.map((item) => item.caption.trim()),
          }).unwrap(),
        loading: "Uploading documents...",
        success: "Documents uploaded successfully",
      });
      setUploadModalPlantId(null);
      setUploadFiles([]);
    } catch (err) {
      console.error("Failed to upload documents:", err);
    }
  };

  const handleOpenPreview = (
    doc: SolarPlantDocument,
    plantId: string,
    idx: number,
  ) => {
    if (!canViewDocumentsFlag) return;
    setPreviewDoc(doc);
    setPreviewPlantId(plantId);
    setPreviewDocIndex(idx);
    setEditCaptionValue(doc.caption ?? "");
  };

  const handleSaveCaption = async () => {
    if (!previewPlantId || previewDocIndex === null || !previewDoc) return;
    const plant = solarPlants.find((item) => item._id === previewPlantId);
    if (!plant) return;

    const existingDocuments = (plant.documents ?? []).map((doc, i) =>
      i === previewDocIndex ? { ...doc, caption: editCaptionValue } : doc,
    );

    try {
      await toastHandler({
        action: () =>
          updateSolarPlant({
            id: previewPlantId,
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

  if (isLoading || isGenLoading || isBillingLoading) {
    return <AuditSectionSkeleton />;
  }

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-foreground">Solar Plants</h3>
            <p className="text-sm text-muted-foreground">
              Switch between plants using the tabs below. Each plant has
              billing-period tabs for generation audits.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreateModal}
          className={cnHideUtilityAuditEdits(auditStepLocked)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Solar Plant
        </Button>
      </div>

      {sortedPlants.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No solar plants found. Click{" "}
          <span className="font-medium text-foreground">Create Solar Plant</span>{" "}
          to add one.
        </div>
      ) : (
        <div className="space-y-4">
          <CustomTabs
            tabs={plantTabs}
            activeTab={activePlantTabId}
            onTabChange={setActivePlantTabId}
            className="rounded-lg border bg-muted/20"
          />

          {activePlant && activePlantCounts ? (
            <SolarPlantDisplayCard
              key={activePlant._id}
              plant={activePlant}
              auditedPeriods={activePlantCounts.audited}
              totalPeriods={activePlantCounts.total}
              facilityId={facilityId}
              utilityAccountId={utilityAccountId}
              utilityBillingRecords={utilityBillingRecords}
              solarGenerationRecords={filterSolarRecordsForPlant(
                solarGenRecords,
                activePlant._id,
              )}
              auditStepLocked={auditStepLocked}
              canDelete={canDeleteRecords}
              canViewDocuments={canViewDocumentsFlag}
              saving={saving}
              onEdit={() => openEditModal(activePlant)}
              onDelete={() => handleDelete(activePlant)}
              onUploadDocuments={() => handleOpenUploadModal(activePlant._id)}
              onPreviewDocument={handleOpenPreview}
            />
          ) : null}
        </div>
      )}

      <SolarPlantFormModal
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
            <AlertDialogTitle>Delete solar plant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget?.plant_name || "this solar plant"}</strong>{" "}
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
        open={!!uploadModalPlantId}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalPlantId(null);
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
                document.getElementById("solar-plant-doc-file-input")?.click()
              }
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to select files (PDF, images, etc.)
              </p>
              <input
                id="solar-plant-doc-file-input"
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
                      <Label htmlFor={`solar-doc-caption-${item.id}`}>
                        Caption
                      </Label>
                      <Input
                        id={`solar-doc-caption-${item.id}`}
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
                setUploadModalPlantId(null);
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
            setPreviewPlantId(null);
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
                  <Label htmlFor="solar-doc-preview-caption">Caption</Label>
                  <div className="flex gap-2">
                    <Input
                      id="solar-doc-preview-caption"
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
