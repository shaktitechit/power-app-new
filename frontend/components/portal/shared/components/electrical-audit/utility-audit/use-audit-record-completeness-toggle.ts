"use client";

import { useState } from "react";
import { isAuditRecordCompleted } from "@/components/portal/lib/electrical-audit/utility-audit-edits-visibility";
import { toastHandler } from "@/components/portal/lib/toast";

type CompletenessRecord = {
  _id: string;
  is_completed?: boolean | string | null;
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
    const currentlyCompleted = isAuditRecordCompleted(record.is_completed);
    try {
      setCompletenessTargetId(record._id);
      await toastHandler({
        action: () =>
          updateRecord({
            id: record._id,
            is_completed: !currentlyCompleted,
          }).unwrap(),
        loading: "Updating status…",
        success: currentlyCompleted
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
