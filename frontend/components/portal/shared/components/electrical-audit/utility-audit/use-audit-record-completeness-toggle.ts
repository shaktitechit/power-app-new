"use client";

import { useState } from "react";
import { toastHandler } from "@/components/portal/lib/toast";

type CompletenessRecord = {
  _id: string;
  is_completed?: boolean;
};

type UpdateCompletenessArg = {
  id: string;
  is_completed: boolean;
};

type UpdateCompletenessMutation = (
  arg: UpdateCompletenessArg,
) => { unwrap: () => Promise<unknown> };

export function useAuditRecordCompletenessToggle(
  updateRecord: UpdateCompletenessMutation,
) {
  const [completenessTargetId, setCompletenessTargetId] = useState<
    string | null
  >(null);

  const handleToggleCompleteness = async (record: CompletenessRecord) => {
    try {
      setCompletenessTargetId(record._id);
      await toastHandler({
        action: () =>
          updateRecord({
            id: record._id,
            is_completed: !record.is_completed,
          }).unwrap(),
        loading: "Updating status…",
        success: record.is_completed
          ? "Marked as pending"
          : "Marked as completed",
      });
    } catch (error) {
      console.error("Failed to update audit record status:", error);
    } finally {
      setCompletenessTargetId(null);
    }
  };

  return { completenessTargetId, handleToggleCompleteness };
}
