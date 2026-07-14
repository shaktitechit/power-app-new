"use client";

import { SandboxDataTable, type UtilityAuditPreviewSheetTab } from "./data-table";

export function SolarTab({ previewTab }: { previewTab: UtilityAuditPreviewSheetTab }) {
  return <SandboxDataTable previewTab={previewTab} />;
}
