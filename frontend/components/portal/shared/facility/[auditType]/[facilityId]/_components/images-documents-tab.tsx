"use client";

import { useState } from "react";
import { Download, Eye, FileIcon, FileText, ImageIcon, Plus } from "lucide-react";
import { toSameOriginFileManagementUrl } from "@/components/portal/lib/fileManagementUrls";
import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import type { Facility, FacilityDocument } from "@/store/slices/facilityApiSlice";

interface ImagesDocumentsTabProps {
  facility: Facility;
  canUpdateFacility: boolean;
  facilityAuditClosed: boolean;
  onEditDocuments: () => void;
}

export function ImagesDocumentsTab({
  facility,
  canUpdateFacility,
  facilityAuditClosed,
  onEditDocuments,
}: ImagesDocumentsTabProps) {
  const [selectedDoc, setSelectedDoc] = useState<FacilityDocument | null>(null);
  const selectedDocUrl = selectedDoc
    ? toSameOriginFileManagementUrl(selectedDoc.fileUrl)
    : "";

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <ImageIcon className="h-5 w-5 text-primary" />
              Images & Documents
            </CardTitle>
            {canUpdateFacility ? (
              <Button
                variant="outline"
                size="sm"
                disabled={facilityAuditClosed}
                onClick={onEditDocuments}
                className="h-8 text-xs sm:text-sm"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Documents
              </Button>
            ) : null}
          </CardHeader>

          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {facility?.documents?.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {facility.documents.map((doc, index) => {
                  const docUrl = toSameOriginFileManagementUrl(doc.fileUrl);

                  return (
                    <div
                      key={`${doc.fileUrl}-${index}`}
                      className="group overflow-hidden rounded-xl border border-border bg-muted/20"
                    >
                      <div className="relative h-32 w-full overflow-hidden bg-muted/40">
                        {doc.fileType === "image" ? (
                          <img
                            src={docUrl}
                            alt={doc.fileName || `Image ${index + 1}`}
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2">
                            <FileText className="h-8 w-8 text-destructive" />
                            <p className="text-xs text-muted-foreground">PDF Document</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 p-2">
                        <p className="truncate text-xs font-medium text-foreground" title={doc.fileName || `File ${index + 1}`}>
                          {doc.fileName || `File ${index + 1}`}
                        </p>
                        {doc.caption ? (
                          <p className="truncate text-[11px] text-muted-foreground italic" title={doc.caption}>
                            {doc.caption}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground">
                          {doc.uploadedAt
                            ? new Date(doc.uploadedAt).toLocaleDateString()
                            : "-"}
                        </p>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-full text-xs"
                          onClick={() => setSelectedDoc(doc)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!selectedDoc}
        onOpenChange={(open) => {
          if (!open) setSelectedDoc(null);
        }}
      >
        <DialogContent className="flex h-[90vh] max-w-6xl w-[95vw] flex-col overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-3 pr-6">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate pr-4 text-left text-base">
                  {selectedDoc?.caption || selectedDoc?.fileName || "Document Preview"}
                </DialogTitle>
                {selectedDoc?.caption && (
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {selectedDoc.fileName}
                  </p>
                )}
              </div>
              {selectedDoc ? (
                <Button asChild size="sm" variant="secondary" className="shrink-0 gap-2">
                  <a href={selectedDocUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" />
                    Download
                  </a>
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/10 p-4">
            {selectedDoc?.fileType === "image" ? (
              <img
                src={selectedDocUrl}
                alt={selectedDoc.fileName || "Document"}
                className="max-h-full max-w-full rounded-md object-contain"
              />
            ) : selectedDoc?.fileType === "pdf" ? (
              <iframe
                src={selectedDocUrl}
                className="h-full w-full rounded-md border-0 bg-white"
                title={selectedDoc.fileName || "PDF Document"}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <FileIcon className="size-16 opacity-50" />
                <p>No preview available for this file type.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
