"use client";

import { FileText, ImageIcon, Trash2 } from "lucide-react";

export type AuditDocumentLike = {
  fileType?: string;
  fileName?: string;
  caption?: string;
  uploadedAt?: string;
};

type AuditDocumentRowProps = {
  doc: AuditDocumentLike;
  index: number;
  onPreview: () => void;
  onDelete?: () => void;
  fallbackLabel?: string;
};

export function AuditDocumentRow({
  doc,
  index,
  onPreview,
  onDelete,
  fallbackLabel = "Document",
}: AuditDocumentRowProps) {
  const label = doc.fileName || `${fallbackLabel} ${index + 1}`;
  const isImage = doc.fileType === "image";

  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg border bg-background p-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isImage ? (
          <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : (
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onPreview}
            title={label}
            className="block max-w-full truncate text-left text-sm font-medium text-primary hover:underline"
          >
            {label}
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
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {new Date(doc.uploadedAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </div>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${label}`}
          title="Delete document"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

type AuditDocumentRowsProps<T extends AuditDocumentLike> = {
  documents: T[];
  onPreview: (doc: T, index: number) => void;
  onDelete?: (doc: T, index: number) => void;
  className?: string;
  fallbackLabel?: string;
};

export function AuditDocumentRows<T extends AuditDocumentLike>({
  documents,
  onPreview,
  onDelete,
  className,
  fallbackLabel = "Document",
}: AuditDocumentRowsProps<T>) {
  return (
    <div className={["grid min-w-0 gap-2", className].filter(Boolean).join(" ")}>
      {documents.map((doc, index) => (
        <AuditDocumentRow
          key={`${doc.fileName ?? "doc"}-${index}`}
          doc={doc}
          index={index}
          fallbackLabel={fallbackLabel}
          onPreview={() => onPreview(doc, index)}
          onDelete={onDelete ? () => onDelete(doc, index) : undefined}
        />
      ))}
    </div>
  );
}
