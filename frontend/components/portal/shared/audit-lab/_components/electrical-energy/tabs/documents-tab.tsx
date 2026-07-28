"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/portal/ui/card";
import { Input } from "@/components/portal/ui/input";
import { Badge } from "@/components/portal/ui/badge";
import { Button } from "@/components/portal/ui/button";
import { Checkbox } from "@/components/portal/ui/checkbox";
import { Label } from "@/components/portal/ui/label";
import {
  FileText,
  Download,
  Search,
  FolderOpen,
  Layers,
  Eye,
  FileDown,
} from "lucide-react";
import type { FacilityAuditEnergyUtilityNest } from "@/store/slices/auditApiSlice";
import { toFileManagementContentUrl } from "@/components/portal/lib/fileManagementUrls";
import { DocumentPreviewModal } from "./document-preview-modal";
import { DocumentsReportModal, type DocumentReportItem } from "./documents-report-modal";
import type {
  AuditDocumentEntityType,
  AuditDocumentItem,
  StoredAuditDocument,
} from "../lib/audit-document-types";
import { useAuditDocumentActions } from "../lib/use-audit-document-actions";

function getDocumentKey(item: AuditDocumentItem): string {
  return `${item.entityType}-${item.entityId}-${item.docIndex}-${item.fileUrl}`;
}

interface DocumentsTabProps {
  facilityId: string;
  utilityAccounts: FacilityAuditEnergyUtilityNest[];
  activeAccountIndex: number;
}

export function DocumentsTab({
  facilityId,
  utilityAccounts,
  activeAccountIndex,
}: DocumentsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<AuditDocumentItem | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportHeader, setReportHeader] = useState("Audit Documents Report");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const { updateCaption, deleteDocument, isSaving } = useAuditDocumentActions(facilityId);

  const targetAccounts = useMemo(() => {
    return activeAccountIndex === -1
      ? utilityAccounts
      : [utilityAccounts[activeAccountIndex]].filter(Boolean);
  }, [utilityAccounts, activeAccountIndex]);

  const allDocuments = useMemo(() => {
    const list: AuditDocumentItem[] = [];

    const push = (
      nest: FacilityAuditEnergyUtilityNest,
      sectionName: string,
      entityName: string,
      entityType: AuditDocumentEntityType,
      entityId: string,
      sourceDocuments: StoredAuditDocument[],
      docIndex: number,
      doc: StoredAuditDocument,
    ) => {
      if (!doc?.fileUrl || !entityId) return;
      const fileUrl = doc.fileUrl;
      const fileType = doc.fileType || (fileUrl.endsWith(".pdf") ? "pdf" : "image");
      const isPdf = fileType.toLowerCase().includes("pdf") || fileUrl.toLowerCase().endsWith(".pdf");
      if (isPdf) return;

      const acc = nest.utility_account as any;
      const accNum = acc?.account_number || "unspecified";
      const accLabel = acc?.account_number
        ? `Account: ${acc.account_number} (${acc.provider || "Utility Provider"})`
        : "Utility Account (Unspecified)";

      list.push({
        accountLabel: accLabel,
        accountNumber: accNum,
        sectionName,
        entityName,
        fileName: doc.fileName || fileUrl.split("/").pop() || "Document",
        fileUrl,
        fileType: "image",
        caption: doc.caption || "",
        uploadedAt: doc.uploadedAt,
        entityType,
        entityId,
        docIndex,
        docId: doc._id,
        sourceDocuments,
      });
    };

    const eachDoc = (
      nest: FacilityAuditEnergyUtilityNest,
      sectionName: string,
      entityName: string,
      entityType: AuditDocumentEntityType,
      entity: { _id?: string; documents?: StoredAuditDocument[] } | null | undefined,
    ) => {
      if (!entity?._id || !entity.documents?.length) return;
      entity.documents.forEach((doc, docIndex) =>
        push(nest, sectionName, entityName, entityType, entity._id!, entity.documents!, docIndex, doc),
      );
    };

    targetAccounts.forEach((nest) => {
      const acc = nest.utility_account as any;
      const accLabel = acc?.account_number ? `Account: ${acc.account_number}` : "Account";

      eachDoc(nest, "Utility Account", accLabel, "utility_account", acc);

      nest.tariffs?.forEach((t: any) =>
        eachDoc(nest, "Tariff", t.tariff_name || t.tariff_type || "Tariff", "tariff", t),
      );
      nest.billing_records?.forEach((b: any) =>
        eachDoc(nest, "Billing", b.billing_period || b.billing_month || "Billing Record", "billing", b),
      );

      nest.solar_plants?.forEach((sp: any) => {
        const name = sp.plant_name || "Solar Plant";
        eachDoc(nest, "Solar Plants", name, "solar_plant", sp);
        sp.solar_generation_records?.forEach((sgr: any) =>
          eachDoc(nest, "Solar – Generation Records", `${name} / Gen Record`, "solar_generation_record", sgr),
        );
      });

      nest.dg_sets?.forEach((dg: any) => {
        const name = dg.dg_number ? `DG Set: ${dg.dg_number}` : "DG Set";
        eachDoc(nest, "DG Sets", name, "dg_set", dg);
        dg.dg_audit_records?.forEach((rec: any) =>
          eachDoc(nest, "DG – Audit Records", `${name} / Audit`, "dg_audit_record", rec),
        );
      });

      nest.transformers?.forEach((t: any) => {
        const name = t.transformer_tag || "Transformer";
        eachDoc(nest, "Transformers", name, "transformer", t);
        t.transformer_audit_records?.forEach((rec: any) =>
          eachDoc(nest, "Transformer – Audit Records", `${name} / Audit`, "transformer_audit_record", rec),
        );
      });

      nest.pumps?.forEach((p: any) => {
        const name = p.pump_tag_number || "Pump";
        eachDoc(nest, "Pumps", name, "pump", p);
        p.pump_audit_records?.forEach((rec: any) =>
          eachDoc(nest, "Pump – Audit Records", `${name} / Audit`, "pump_audit_record", rec),
        );
      });

      nest.hvac_audits?.forEach((h: any) =>
        eachDoc(nest, "HVAC", h.hvac_asset_id ? `HVAC: ${h.hvac_asset_id}` : "HVAC Audit", "hvac", h),
      );
      nest.ac_audit_records?.forEach((ac: any) =>
        eachDoc(nest, "AC", ac.ac_asset_id ? `AC: ${ac.ac_asset_id}` : "AC Audit", "ac", ac),
      );
      nest.lighting_audits?.forEach((l: any) =>
        eachDoc(nest, "Lighting", l.lighting_db_name || l.location || "Lighting Audit", "lighting", l),
      );
      nest.fan_audit_records?.forEach((f: any) =>
        eachDoc(nest, "Fan", f.fan_location || f.fan_asset_id || "Fan Audit", "fan", f),
      );
      nest.lux_measurements?.forEach((lux: any) =>
        eachDoc(nest, "Lux", lux.room_name || lux.location || "Lux Measurement", "lux", lux),
      );
      nest.misc_load_audits?.forEach((m: any) =>
        eachDoc(nest, "Misc", m.equipment_name || "Misc Load", "misc", m),
      );

      const nestAny = nest as any;
      nestAny.street_light_audits?.forEach((s: any) =>
        eachDoc(nest, "Street Light", s.street_light_location || "Street Light", "street_light", s),
      );
      nestAny.ups_audits?.forEach((u: any) =>
        eachDoc(nest, "UPS", u.ups_tag_asset_id ? `UPS: ${u.ups_tag_asset_id}` : "UPS Audit", "ups", u),
      );
    });

    return list;
  }, [targetAccounts]);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return allDocuments;
    const q = searchQuery.toLowerCase();
    return allDocuments.filter(
      (doc) =>
        doc.fileName.toLowerCase().includes(q) ||
        doc.caption?.toLowerCase().includes(q) ||
        doc.entityName.toLowerCase().includes(q) ||
        doc.accountNumber.toLowerCase().includes(q) ||
        doc.sectionName.toLowerCase().includes(q),
    );
  }, [allDocuments, searchQuery]);

  useEffect(() => {
    setSelectedKeys((prev) => {
      const validKeys = new Set(filteredDocuments.map(getDocumentKey));
      const next = new Set<string>();
      prev.forEach((key) => {
        if (validKeys.has(key)) next.add(key);
      });
      if (next.size === 0 && filteredDocuments.length > 0) {
        filteredDocuments.forEach((doc) => next.add(getDocumentKey(doc)));
      }
      return next;
    });
  }, [filteredDocuments]);

  const selectedDocuments = useMemo(
    () => filteredDocuments.filter((doc) => selectedKeys.has(getDocumentKey(doc))),
    [filteredDocuments, selectedKeys],
  );

  const allSelected =
    filteredDocuments.length > 0 && selectedKeys.size === filteredDocuments.length;
  const hasSelection = selectedKeys.size > 0;

  const toggleDocument = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAllDocuments = useCallback(() => {
    setSelectedKeys((prev) => {
      if (filteredDocuments.length > 0 && prev.size === filteredDocuments.length) {
        return new Set();
      }
      return new Set(filteredDocuments.map(getDocumentKey));
    });
  }, [filteredDocuments]);

  const groupedData = useMemo(() => {
    const tree: Record<string, { label: string; sections: Record<string, AuditDocumentItem[]> }> = {};
    filteredDocuments.forEach((doc) => {
      if (!tree[doc.accountNumber]) {
        tree[doc.accountNumber] = { label: doc.accountLabel, sections: {} };
      }
      if (!tree[doc.accountNumber].sections[doc.sectionName]) {
        tree[doc.accountNumber].sections[doc.sectionName] = [];
      }
      tree[doc.accountNumber].sections[doc.sectionName].push(doc);
    });
    return tree;
  }, [filteredDocuments]);

  const isPdf = (item: AuditDocumentItem) =>
    item.fileType.toLowerCase().includes("pdf") || item.fileName.toLowerCase().endsWith(".pdf");

  const handleUpdateCaption = useCallback(
    async (item: AuditDocumentItem, caption: string) => {
      const updatedCaption = await updateCaption(item, caption);
      setPreviewDoc((prev) =>
        prev && prev.fileUrl === item.fileUrl ? { ...prev, caption: updatedCaption ?? caption.trim() } : prev,
      );
      return updatedCaption ?? caption.trim();
    },
    [updateCaption],
  );

  const handleDeleteDocument = useCallback(
    async (item: AuditDocumentItem) => {
      await deleteDocument(item);
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        next.delete(getDocumentKey(item));
        return next;
      });
      setPreviewDoc(null);
    },
    [deleteDocument],
  );

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Card className="border border-border/80 bg-card/65 backdrop-blur shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename, caption, section or account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border/60 text-sm focus-visible:ring-primary"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-muted-foreground font-semibold">
                {selectedKeys.size} of {filteredDocuments.length} selected
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={filteredDocuments.length === 0}
                onClick={toggleAllDocuments}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 shrink-0"
                disabled={!hasSelection}
                onClick={() => setReportOpen(true)}
              >
                <FileDown className="h-3.5 w-3.5" />
                Download Selected
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 max-w-xl">
            <Label htmlFor="documents-default-header" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Default Report Header
            </Label>
            <Input
              id="documents-default-header"
              value={reportHeader}
              onChange={(e) => setReportHeader(e.target.value)}
              placeholder="Custom header for downloaded Word / print report..."
              className="h-9 text-sm bg-background/50 border-border/60"
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty state */}
      {filteredDocuments.length === 0 && (
        <Card className="border border-border/60 bg-muted/15">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No documents found.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Upload audit reports or images to view them here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Account → Section → Gallery grid */}
      {Object.entries(groupedData).map(([accNum, accGroup]) => (
        <div
          key={accNum}
          className="space-y-6 bg-muted/5 border border-border/40 p-5 rounded-xl"
        >
          {/* Account heading */}
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <h2 className="text-sm font-extrabold text-foreground tracking-tight">
              {accGroup.label}
            </h2>
            <Badge variant="outline" className="text-[10px] py-0.5 bg-background/60 font-mono">
              {Object.values(accGroup.sections).flat().length} file(s)
            </Badge>
          </div>

          {/* Sections */}
          <div className="space-y-8 pl-1">
            {Object.entries(accGroup.sections).map(([sectionName, items]) => (
              <div key={sectionName} className="space-y-3">
                {/* Section heading */}
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5 text-primary/70" />
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {sectionName}
                  </h3>
                  <span className="text-[10px] text-muted-foreground/50">({items.length})</span>
                </div>

                {/* Gallery grid */}
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {items.map((item) => {
                    const isImg = !isPdf(item);
                    const proxiedUrl = toFileManagementContentUrl(item.fileUrl);
                    const itemKey = getDocumentKey(item);
                    const isSelected = selectedKeys.has(itemKey);
                    return (
                      <div
                        key={itemKey}
                        className={`group relative flex flex-col items-stretch rounded-lg transition-all duration-200 ${
                          isSelected ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : ""
                        }`}
                      >
                        <div className="absolute left-2 top-2 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleDocument(itemKey)}
                            aria-label={`Select ${item.fileName}`}
                            className="bg-background/90 border-border shadow-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(item)}
                          className="flex flex-col items-stretch text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                        >
                        {/* Thumbnail box */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/50 bg-muted/30 group-hover:border-primary/50 group-hover:shadow-md transition-all duration-200">
                          {isImg ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={proxiedUrl}
                              alt={item.fileName}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            /* PDF tile */
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-red-50/60 to-orange-50/40 dark:from-red-950/30 dark:to-orange-950/20">
                              <FileText className="h-10 w-10 text-red-500/80 group-hover:scale-110 transition-transform duration-200" />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/70">
                                PDF
                              </span>
                            </div>
                          )}
                          {/* Hover overlay with eye icon */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
                          </div>
                        </div>

                        {/* Caption + entity ref below box */}
                        <div className="mt-2 px-0.5 space-y-1">
                          <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2">
                            {item.caption || (
                              <span className="italic text-muted-foreground/50">No caption</span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 truncate">
                            {item.entityName}
                          </p>
                          {/* Download button — opens DocumentPreviewModal */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-6 text-[10px] gap-1 mt-1 border-border/50 hover:border-primary hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewDoc(item);
                            }}
                          >
                            <Download className="h-3 w-3" />
                            View
                          </Button>
                        </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Per-document preview modal */}
      <DocumentPreviewModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        onUpdateCaption={handleUpdateCaption}
        onDelete={handleDeleteDocument}
        isSaving={isSaving}
      />

      {/* Full documents report / download modal */}
      <DocumentsReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        documents={selectedDocuments as DocumentReportItem[]}
        title={reportHeader.trim() || "Audit Documents Report"}
      />
    </div>
  );
}
