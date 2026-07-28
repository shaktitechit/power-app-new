export type AuditDocumentEntityType =
  | "utility_account"
  | "tariff"
  | "billing"
  | "solar_plant"
  | "solar_generation_record"
  | "dg_set"
  | "dg_audit_record"
  | "transformer"
  | "transformer_audit_record"
  | "pump"
  | "pump_audit_record"
  | "hvac"
  | "ac"
  | "lighting"
  | "fan"
  | "lux"
  | "misc"
  | "street_light"
  | "ups";

export interface StoredAuditDocument {
  _id?: string;
  fileUrl: string;
  fileType?: string;
  fileName?: string;
  caption?: string;
  uploadedAt?: string | Date;
}

export interface AuditDocumentItem {
  accountLabel: string;
  accountNumber: string;
  sectionName: string;
  entityName: string;
  fileName: string;
  fileUrl: string;
  fileType: "image" | "pdf" | string;
  caption?: string;
  uploadedAt?: string | Date;
  entityType: AuditDocumentEntityType;
  entityId: string;
  docIndex: number;
  docId?: string;
  sourceDocuments: StoredAuditDocument[];
}
