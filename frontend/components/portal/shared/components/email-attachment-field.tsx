"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import { Label } from "@/components/portal/ui/label";
import { toast } from "sonner";

/** Matches the limit on the server's email attachment upload. */
export const EMAIL_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const EMAIL_ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,image/*";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type Props = {
  id: string;
  /** PDF built from the record; used unless the user uploads a replacement. */
  generatedFile: File | null;
  generatedFilename: string;
  generating: boolean;
  generatingLabel: string;
  failureLabel: string;
  uploadedFile: File | null;
  onUploadedFileChange: (file: File | null) => void;
};

export function EmailAttachmentField({
  id,
  generatedFile,
  generatedFilename,
  generating,
  generatingLabel,
  failureLabel,
  uploadedFile,
  onUploadedFileChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const file = uploadedFile ?? generatedFile;
  const isPdf = file?.type === "application/pdf";
  const isImage = Boolean(file?.type.startsWith("image/"));

  useEffect(() => {
    if (!file || (!isPdf && !isImage)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isPdf, isImage]);

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    // Let the same file be picked again after it was cleared.
    event.target.value = "";
    if (!picked) return;
    if (picked.size > EMAIL_ATTACHMENT_MAX_BYTES) {
      toast.error("Attachment must be 10 MB or smaller.");
      return;
    }
    onUploadedFileChange(picked);
  };

  return (
    <div className="space-y-2">
      <Label>Attachment</Label>
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            {generating && !uploadedFile ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 truncate font-medium">
              {file?.name || generatedFilename}
            </span>
            {file ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              {uploadedFile ? "Change" : "Replace"}
            </Button>
            {uploadedFile ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => onUploadedFileChange(null)}
              >
                <Undo2 className="mr-1 h-3.5 w-3.5" />
                Use generated
              </Button>
            ) : null}
          </div>
        </div>

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={EMAIL_ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={handlePick}
        />

        {generating && !uploadedFile ? (
          <p className="mt-2 text-xs text-muted-foreground">{generatingLabel}</p>
        ) : previewUrl && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={file?.name || "Attachment preview"}
            className="mt-3 max-h-64 w-full rounded-md border border-border bg-white object-contain"
          />
        ) : previewUrl ? (
          <iframe
            title={file?.name || "Attachment preview"}
            src={previewUrl}
            className="mt-3 h-64 w-full rounded-md border border-border bg-white"
          />
        ) : file ? (
          <p className="mt-2 text-xs text-muted-foreground">
            This file type has no inline preview. It will be attached as-is.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{failureLabel}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {uploadedFile
          ? "This upload replaces the generated PDF."
          : "Upload a file to send it instead of the generated PDF (max 10 MB)."}
      </p>
    </div>
  );
}
