"use client";

import type { TabProps } from "./types";
import { SafetyDocumentsReviewSection } from "@/components/portal/shared/components/safety-audit/document-review/document-review-section";

export function DocumentsReviewTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyDocumentsReviewSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
