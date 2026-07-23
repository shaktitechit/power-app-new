"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/portal/ui/card";
import { Input } from "@/components/portal/ui/input";
import { Badge } from "@/components/portal/ui/badge";
import { Button } from "@/components/portal/ui/button";
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
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { DocumentPreviewModal } from "./document-preview-modal";
import { DocumentsReportModal } from "./documents-report-modal";

interface DocumentItem {
  accountLabel: string;
  accountNumber: string;
  sectionName: string;
  entityName: string;
  fileName: string;
  fileUrl: string;
  fileType: "image" | "pdf" | string;
  caption?: string;
  uploadedAt?: string | Date;
}

interface DocumentsTabProps {
  utilityAccounts: FacilityAuditEnergyUtilityNest[];
  activeAccountIndex: number;
}

export function DocumentsTab({ utilityAccounts, activeAccountIndex }: DocumentsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const targetAccounts = useMemo(() => {
    return activeAccountIndex === -1
      ? utilityAccounts
      : [utilityAccounts[activeAccountIndex]].filter(Boolean);
  }, [utilityAccounts, activeAccountIndex]);

  const allDocuments = useMemo(() => {
    const list: DocumentItem[] = [];

    const push = (
      nest: FacilityAuditEnergyUtilityNest,
      sectionName: string,
      entityName: string,
      doc: any,
    ) => {
      if (!doc || !doc.fileUrl) return;
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
        fileUrl: fileUrl,
        fileType: "image",
        caption: doc.caption || "",
        uploadedAt: doc.uploadedAt,
      });
    };

    const eachDoc = (
      nest: FacilityAuditEnergyUtilityNest,
      sectionName: string,
      entityName: string,
      docs: any[] | undefined,
    ) => docs?.forEach((d) => push(nest, sectionName, entityName, d));

    targetAccounts.forEach((nest) => {
      const acc = nest.utility_account as any;
      const accLabel = acc?.account_number ? `Account: ${acc.account_number}` : "Account";

      eachDoc(nest, "Utility Account", accLabel, acc?.documents);

      nest.tariffs?.forEach((t: any) =>
        eachDoc(nest, "Tariff", t.tariff_name || t.tariff_type || "Tariff", t.documents),
      );
      nest.billing_records?.forEach((b: any) =>
        eachDoc(nest, "Billing", b.billing_period || b.billing_month || "Billing Record", b.documents),
      );

      nest.solar_plants?.forEach((sp: any) => {
        const name = sp.plant_name || "Solar Plant";
        eachDoc(nest, "Solar Plants", name, sp.documents);
        sp.solar_generation_records?.forEach((sgr: any) =>
          eachDoc(nest, "Solar – Generation Records", `${name} / Gen Record`, sgr.documents),
        );
      });

      nest.dg_sets?.forEach((dg: any) => {
        const name = dg.dg_number ? `DG Set: ${dg.dg_number}` : "DG Set";
        eachDoc(nest, "DG Sets", name, dg.documents);
        dg.dg_audit_records?.forEach((rec: any) =>
          eachDoc(nest, "DG – Audit Records", `${name} / Audit`, rec.documents),
        );
      });

      nest.transformers?.forEach((t: any) => {
        const name = t.transformer_tag || "Transformer";
        eachDoc(nest, "Transformers", name, t.documents);
        t.transformer_audit_records?.forEach((rec: any) =>
          eachDoc(nest, "Transformer – Audit Records", `${name} / Audit`, rec.documents),
        );
      });

      nest.pumps?.forEach((p: any) => {
        const name = p.pump_tag_number || "Pump";
        eachDoc(nest, "Pumps", name, p.documents);
        p.pump_audit_records?.forEach((rec: any) =>
          eachDoc(nest, "Pump – Audit Records", `${name} / Audit`, rec.documents),
        );
      });

      nest.hvac_audits?.forEach((h: any) =>
        eachDoc(nest, "HVAC", h.hvac_asset_id ? `HVAC: ${h.hvac_asset_id}` : "HVAC Audit", h.documents),
      );
      nest.ac_audit_records?.forEach((ac: any) =>
        eachDoc(nest, "AC", ac.ac_asset_id ? `AC: ${ac.ac_asset_id}` : "AC Audit", ac.documents),
      );
      nest.lighting_audits?.forEach((l: any) =>
        eachDoc(nest, "Lighting", l.lighting_db_name || l.location || "Lighting Audit", l.documents),
      );
      nest.fan_audit_records?.forEach((f: any) =>
        eachDoc(nest, "Fan", f.fan_location || f.fan_asset_id || "Fan Audit", f.documents),
      );
      nest.lux_measurements?.forEach((lux: any) =>
        eachDoc(nest, "Lux", lux.room_name || lux.location || "Lux Measurement", lux.documents),
      );
      nest.misc_load_audits?.forEach((m: any) =>
        eachDoc(nest, "Misc", m.equipment_name || "Misc Load", m.documents),
      );

      const nestAny = nest as any;
      nestAny.street_light_audits?.forEach((s: any) =>
        eachDoc(nest, "Street Light", s.street_light_location || "Street Light", s.documents),
      );
      nestAny.ups_audits?.forEach((u: any) =>
        eachDoc(nest, "UPS", u.ups_tag_asset_id ? `UPS: ${u.ups_tag_asset_id}` : "UPS Audit", u.documents),
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

  const groupedData = useMemo(() => {
    const tree: Record<string, { label: string; sections: Record<string, DocumentItem[]> }> = {};
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

  const isPdf = (item: DocumentItem) =>
    item.fileType.toLowerCase().includes("pdf") || item.fileName.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Card className="border border-border/80 bg-card/65 backdrop-blur shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename, caption, section or account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border/60 text-sm focus-visible:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground font-semibold">
              {filteredDocuments.length} document(s)
            </div>
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 shrink-0"
              disabled={filteredDocuments.length === 0}
              onClick={() => setReportOpen(true)}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download Docs
            </Button>
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
                  {items.map((item, idx) => {
                    const isImg = !isPdf(item);
                    const proxiedUrl = toSameOriginFileManagementUrl(item.fileUrl);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewDoc(item)}
                        className="group flex flex-col items-stretch text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
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
                            Download
                          </Button>
                        </div>
                      </button>
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
      />

      {/* Full documents report / download modal */}
      <DocumentsReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        documents={filteredDocuments as any}
        title="Audit Documents Report"
      />
    </div>
  );
}
