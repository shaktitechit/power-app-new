import type { Enquiry } from "@/store/slices/enquiryApiSlice";

export function resolveUserId(
  ref: string | { _id?: string } | null | undefined,
): string | null {
  if (ref == null) return null;
  if (typeof ref === "string") return ref;
  return ref._id ?? null;
}

export function assigneeLabel(
  ref: string | { _id?: string; name?: string; email?: string } | null | undefined,
): string | null {
  if (!ref) return null;
  if (typeof ref === "object") return ref.name ?? ref.email ?? ref._id ?? null;
  return String(ref);
}

export function withCurrentUserIfRole<
  T extends { _id?: string; name?: string; email?: string; role?: string },
>(
  list: T[],
  currentUser:
    | { _id?: string; name?: string; email?: string; role?: string }
    | null
    | undefined,
  role: string,
): T[] {
  const next = [...list];
  if (currentUser?._id && currentUser.role === role) {
    if (!next.some((u) => u._id === currentUser._id)) {
      next.unshift({
        _id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      } as T);
    }
  }
  return next;
}

export function canAssignEnquiryRoles(role?: string | null): boolean {
  return role === "super_admin";
}

export function ownEnquiryAssignmentRole(
  role?: string | null,
): "auditor" | "manager" | "admin" | null {
  if (role === "auditor" || role === "manager" || role === "admin") return role;
  return null;
}

export function canEditEnquiry(
  userId: string | undefined,
  row: Enquiry,
): boolean {
  if (!userId) return false;
  const creator = resolveUserId(row.created_by);
  const auditor = resolveUserId(row.assigned_to ?? undefined);
  const manager = resolveUserId(row.assigned_manager_to ?? undefined);
  const admin = resolveUserId(row.assigned_admin_to ?? undefined);
  return (
    creator === userId ||
    auditor === userId ||
    manager === userId ||
    admin === userId
  );
}

type EnquiryListUser = {
  _id?: string;
  role?: string;
} | null | undefined;

/** Same visibility rules as the main enquiries list. */
export function filterEnquiriesForUser(
  enquiries: Enquiry[],
  user: EnquiryListUser,
): Enquiry[] {
  const uid = user?._id;
  if (!uid || user?.role === "super_admin") return enquiries;

  return enquiries.filter((item) => {
    if (user.role === "admin") {
      return resolveUserId(item.assigned_admin_to) === uid;
    }
    if (user.role === "manager") {
      return (
        resolveUserId(item.assigned_manager_to) === uid ||
        resolveUserId(item.assigned_to) === uid
      );
    }
    if (user.role === "auditor") {
      return resolveUserId(item.assigned_to) === uid;
    }
    return true;
  });
}
