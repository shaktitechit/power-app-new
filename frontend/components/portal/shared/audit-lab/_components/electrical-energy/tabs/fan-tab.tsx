"use client";

import { SandboxDataTable, type UtilityAuditPreviewSheetTab } from "./data-table";

export function FanTab({ previewTab }: { previewTab: UtilityAuditPreviewSheetTab }) {
  return <SandboxDataTable previewTab={previewTab} />;
}
