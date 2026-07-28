"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { Badge } from "@/components/portal/ui/badge";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
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
import {
  FileText,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Save,
  Trash2,
} from "lucide-react";
import { toFileManagementContentUrl } from "@/components/portal/lib/fileManagementUrls";
import type { AuditDocumentItem } from "../lib/audit-document-types";

export type DocumentPreviewItem = AuditDocumentItem;

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  document: DocumentPreviewItem | null;
  onUpdateCaption?: (item: DocumentPreviewItem, caption: string) => Promise<string | void>;
  onDelete?: (item: DocumentPreviewItem) => Promise<void>;
  isSaving?: boolean;
  canEdit?: boolean;
}

export function DocumentPreviewModal({
  open,
  onClose,
  document: doc,
  onUpdateCaption,
  onDelete,
  isSaving = false,
  canEdit = true,
}: DocumentPreviewModalProps) {
  const [editCaptionValue, setEditCaptionValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setEditCaptionValue(doc?.caption ?? "");
  }, [doc]);

  if (!open || !doc) return null;

  const isPdf =
    doc.fileType.toLowerCase().includes("pdf") || doc.fileName.toLowerCase().endsWith(".pdf");

  const proxiedUrl = toFileManagementContentUrl(doc.fileUrl);
  const showEditActions = canEdit && !!onUpdateCaption && !!onDelete;
  const captionDirty = editCaptionValue.trim() !== (doc.caption ?? "").trim();

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = proxiedUrl;
    a.download = doc.fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveCaption = async () => {
    if (!onUpdateCaption || !captionDirty) return;
    const updatedCaption = await onUpdateCaption(doc, editCaptionValue);
    if (typeof updatedCaption === "string") {
      setEditCaptionValue(updatedCaption);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    await onDelete(doc);
    setDeleteDialogOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="!max-w-7xl sm:!max-w-7xl w-[95vw] !max-h-[92vh] h-[92vh] flex flex-col p-0 !overflow-hidden border border-border/80 shadow-2xl rounded-xl gap-0 bg-background">

          {/* ── Header ── */}
          <DialogHeader className="px-5 py-3 border-b border-border/50 bg-muted/20 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {isPdf ? (
                  <FileText className="h-4 w-4 text-red-500 shrink-0" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                )}
                <DialogTitle className="text-xs font-bold text-foreground truncate max-w-[60vw]">
                  {doc.fileName}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-mono tracking-widest bg-background/50 border-border/40 shrink-0"
                >
                  {isPdf ? "PDF" : "IMAGE"}
                </Badge>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {showEditActions ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1.5 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isSaving}
                    title="Delete document"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] gap-1.5 px-2.5"
                  asChild
                  title="Open in new tab"
                >
                  <a href={proxiedUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-[11px] gap-1.5 px-2.5 bg-primary hover:bg-primary/90"
                  onClick={handleDownload}
                  title="Download file"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* ── File viewer ── */}
          <div className="flex-1 min-h-0 flex items-center justify-center bg-neutral-950/20 overflow-hidden p-3">
            {isPdf ? (
              <iframe
                src={proxiedUrl}
                style={{ width: "100%", height: "100%", minHeight: 0 }}
                className="border-none rounded-md bg-white"
                title={`PDF Preview: ${doc.fileName}`}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={proxiedUrl}
                alt={doc.fileName}
                className="max-w-full max-h-full object-contain rounded-md shadow-xl border border-border/30"
              />
            )}
          </div>

          {/* ── Caption ── */}
          <div className="px-5 py-3 border-t border-border/50 shrink-0 space-y-2">
            {showEditActions ? (
              <>
                <Label htmlFor="audit-doc-preview-caption" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  Document Caption
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="audit-doc-preview-caption"
                    value={editCaptionValue}
                    onChange={(e) => setEditCaptionValue(e.target.value)}
                    placeholder="Enter document description or caption..."
                    disabled={isSaving}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveCaption}
                    disabled={isSaving || !captionDirty}
                    className="shrink-0"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </>
            ) : doc.caption ? (
              <p className="text-sm text-muted-foreground text-center italic">{doc.caption}</p>
            ) : (
              <p className="text-sm text-muted-foreground/50 text-center italic">No caption</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &ldquo;{doc.fileName}&rdquo; from{" "}
              {doc.sectionName} / {doc.entityName}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? "Deleting..." : "Delete document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
