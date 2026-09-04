export function signatoryUserId(doc) {
  const value = doc?.signatory?.userId;
  if (!value) return null;
  if (typeof value === "object") return value._id || null;
  return value;
}

export function createdByUserId(doc) {
  const value = doc?.createdBy;
  if (!value) return null;
  if (typeof value === "object") return value._id || null;
  return value;
}

export function isCreatorOrAssignedSignatory(doc, user) {
  const userId = String(user?._id || "");
  if (!userId) return false;
  if (String(createdByUserId(doc) || "") === userId) return true;
  return String(signatoryUserId(doc) || "") === userId;
}

export function creatorOrSignatoryListFilter(user) {
  if (!user?._id) return { _id: { $in: [] } };
  return {
    $or: [{ createdBy: user._id }, { "signatory.userId": user._id }],
  };
}

export function applyCreatorOrSignatoryListFilter(filter, user) {
  if (user?.role === "super_admin") return;
  filter.$and = [...(filter.$and || []), creatorOrSignatoryListFilter(user)];
}

export function pendingSignatoryApproval() {
  return {
    status: "PENDING",
    approvedAt: null,
    approvedBy: null,
  };
}

export function documentStatus(doc) {
  return String(doc?.status || "").toUpperCase();
}

export function signatoryApprovalNotRequired(doc) {
  const status = documentStatus(doc);
  return status === "ACCEPTED" || status === "CANCELLED";
}

export function approvedSignatoryApproval(user) {
  return {
    status: "APPROVED",
    approvedAt: new Date(),
    approvedBy: user?._id || null,
  };
}

export function isSignatoryApproved(doc) {
  if (signatoryApprovalNotRequired(doc)) return true;
  const approval = String(doc?.signatoryApproval?.status || "").toUpperCase();
  if (approval === "APPROVED") return true;
  if (approval === "PENDING") return false;
  const status = documentStatus(doc);
  return Boolean(status) && status !== "DRAFT";
}

export function isSignatoryContentLocked(doc) {
  return String(doc?.signatoryApproval?.status || "").toUpperCase() === "APPROVED";
}

export function hasNonStatusUpdates(body = {}) {
  return Object.keys(body || {}).some(
    (key) => key !== "status" && body[key] !== undefined,
  );
}

export function assertSignatoryContentEditable(doc) {
  if (!isSignatoryContentLocked(doc)) return;
  const err = new Error(
    "This document cannot be edited after signatory approval",
  );
  err.statusCode = 403;
  throw err;
}

export function assertSignatoryApproved(doc, action = "release this document") {
  if (isSignatoryApproved(doc)) return;
  const err = new Error(
    `The assigned signatory must approve before you can ${action}`,
  );
  err.statusCode = 403;
  throw err;
}

export function assertCurrentUserIsSignatory(user, doc) {
  const id = signatoryUserId(doc);
  if (id && String(id) === String(user?._id)) return;
  const err = new Error("Only the assigned signatory can approve this document");
  err.statusCode = 403;
  throw err;
}

export function applyPendingSignatoryApproval(doc) {
  doc.signatoryApproval = pendingSignatoryApproval();
}

export function bodyResetsSignatoryApproval(body = {}, keys = []) {
  return keys.some((key) => body[key] !== undefined);
}
