export type SignatoryApprovalStatus = "PENDING" | "APPROVED";

export type SignatoryApprovalUserRef = {
  _id?: string;
  name?: string;
  email?: string;
};

export type SignatoryApproval = {
  status?: SignatoryApprovalStatus | string;
  approvedAt?: string | null;
  approvedBy?: string | SignatoryApprovalUserRef | null;
};

export type SignatoryApprovalDoc = {
  status?: string;
  createdBy?: string | { _id?: string } | null;
  signatory?: {
    name?: string;
    userId?: string | { _id?: string; name?: string } | null;
  } | null;
  signatoryApproval?: SignatoryApproval | null;
};

export const SIGNATORY_APPROVAL_LOCKED_MESSAGE =
  "Waiting for signatory approval. Email stays locked until then.";

export const SIGNATORY_PDF_LOCKED_MESSAGE =
  "Only the assigned signatory can view this PDF until they approve it.";

export const CANCELLED_PDF_LOCKED_MESSAGE =
  "This document is cancelled. PDF preview and download are disabled.";

export const SIGNATORY_EDIT_LOCKED_MESSAGE =
  "This document cannot be edited after signatory approval.";

export function documentStatus(doc?: SignatoryApprovalDoc | null): string {
  return String(doc?.status || "").toUpperCase();
}

export function isCancelledDocument(doc?: SignatoryApprovalDoc | null): boolean {
  return documentStatus(doc) === "CANCELLED";
}

/** Accepted and cancelled documents do not need signatory approval. */
export function signatoryApprovalNotRequired(doc?: SignatoryApprovalDoc | null): boolean {
  const status = documentStatus(doc);
  return status === "ACCEPTED" || status === "CANCELLED";
}

export function pdfLockMessage(doc?: SignatoryApprovalDoc | null): string {
  if (isCancelledDocument(doc)) return CANCELLED_PDF_LOCKED_MESSAGE;
  return SIGNATORY_PDF_LOCKED_MESSAGE;
}

export function currentAuthUserId(
  user?: { _id?: string; userId?: string } | null,
): string | undefined {
  const id = user?._id || user?.userId;
  return id ? String(id) : undefined;
}

function refId(value?: string | { _id?: string } | null): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value._id ? String(value._id) : undefined;
}

export function signatoryUserId(doc?: SignatoryApprovalDoc | null): string | undefined {
  return refId(doc?.signatory?.userId);
}

export function signatoryDisplayNameFromDoc(doc?: SignatoryApprovalDoc | null): string {
  const stored = String(doc?.signatory?.name || "").trim();
  const userId = doc?.signatory?.userId;
  const fromUser =
    userId && typeof userId === "object" ? String(userId.name || "").trim() : "";
  return stored || fromUser || "the assigned signatory";
}

/** True only when the assigned signatory has explicitly approved. */
export function isSignatoryContentLocked(doc?: SignatoryApprovalDoc | null): boolean {
  return String(doc?.signatoryApproval?.status || "").toUpperCase() === "APPROVED";
}

export function isSignatoryApproved(doc?: SignatoryApprovalDoc | null): boolean {
  if (signatoryApprovalNotRequired(doc)) return true;
  if (isSignatoryContentLocked(doc)) return true;
  const approval = String(doc?.signatoryApproval?.status || "").toUpperCase();
  if (approval === "PENDING") return false;
  const status = documentStatus(doc);
  return Boolean(status) && status !== "DRAFT";
}

export function isSignatoryApprovalPending(doc?: SignatoryApprovalDoc | null): boolean {
  if (signatoryApprovalNotRequired(doc)) return false;
  return !isSignatoryApproved(doc);
}

export function canApproveAsSignatory(
  doc?: SignatoryApprovalDoc | null,
  userId?: string | null,
): boolean {
  if (!userId || !isSignatoryApprovalPending(doc)) return false;
  return isAssignedSignatory(doc, userId);
}

export function isAssignedSignatory(
  doc?: SignatoryApprovalDoc | null,
  userId?: string | null,
): boolean {
  const assigned = signatoryUserId(doc);
  const current = userId ? String(userId) : "";
  return Boolean(assigned && current && assigned === current);
}

export function createdByUserId(doc?: SignatoryApprovalDoc | null): string | undefined {
  return refId(doc?.createdBy);
}

export function isCreatorOrAssignedSignatory(
  doc?: SignatoryApprovalDoc | null,
  userId?: string | null,
): boolean {
  if (!userId) return false;
  if (createdByUserId(doc) === userId) return true;
  return isAssignedSignatory(doc, userId);
}

export function canListSignatoryDocument(
  doc?: SignatoryApprovalDoc | null,
  user?: { _id?: string; role?: string } | null,
): boolean {
  if (!user?._id) return false;
  if (user.role === "super_admin") return true;
  return isCreatorOrAssignedSignatory(doc, user._id);
}

/** Assigned signatory can preview before approving; cancelled documents cannot. */
export function canViewPdf(
  doc?: SignatoryApprovalDoc | null,
  userId?: string | null,
): boolean {
  if (isCancelledDocument(doc)) return false;
  return isSignatoryApproved(doc) || isAssignedSignatory(doc, userId);
}
