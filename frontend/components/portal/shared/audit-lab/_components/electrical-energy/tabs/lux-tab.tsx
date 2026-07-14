"use client";

import { SandboxDataTable, type UtilityAuditPreviewSheetTab } from "./data-table";

export function LuxTab({ previewTab }: { previewTab: UtilityAuditPreviewSheetTab }) {
  return <SandboxDataTable previewTab={previewTab} />;
}
