"use client";

import { useState } from "react";
import { toastHandler } from "@/components/portal/lib/toast";

export type AuditDocumentDeleteTarget = {
  recordId: string;
  index: number;
  fileName?: string;
};

type Options<TDoc> = {
  getDocuments: (recordId: string) => TDoc[] | undefined;
  persist: (recordId: string, remaining: TDoc[]) => Promise<unknown>;
};

export function useAuditDocumentDelete<TDoc>({
  getDocuments,
  persist,
}: Options<TDoc>) {
  const [target, setTarget] = useState<AuditDocumentDeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestDelete = (
    recordId: string,
    index: number,
    fileName?: string,
  ) => {
    setTarget({ recordId, index, fileName });
  };

  const close = () => {
    if (deleting) return;
    setTarget(null);
  };

  const confirmDelete = async () => {
    if (!target) return;
    const docs = getDocuments(target.recordId) ?? [];
    const remaining = docs.filter((_, index) => index !== target.index);

    setDeleting(true);
    try {
      await toastHandler({
        action: () => persist(target.recordId, remaining),
        loading: "Deleting document...",
        success: "Document deleted",
      });
      setTarget(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setDeleting(false);
    }
  };

  return {
    target,
    deleting,
    requestDelete,
    confirmDelete,
    close,
  };
}
