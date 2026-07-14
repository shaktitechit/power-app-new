"use client";

import { SandboxDataTable, type UtilityAuditPreviewSheetTab } from "./data-table";

export function BillingTab({ previewTab }: { previewTab: UtilityAuditPreviewSheetTab }) {
  return <SandboxDataTable previewTab={previewTab} />;
}
