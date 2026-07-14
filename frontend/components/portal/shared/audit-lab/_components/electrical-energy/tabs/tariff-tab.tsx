"use client";

import { SandboxDataTable, type UtilityAuditPreviewSheetTab } from "./data-table";

export function TariffTab({ previewTab }: { previewTab: UtilityAuditPreviewSheetTab }) {
  return <SandboxDataTable previewTab={previewTab} />;
}
