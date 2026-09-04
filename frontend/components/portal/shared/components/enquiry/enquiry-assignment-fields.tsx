"use client";

import { useMemo } from "react";
import { Label } from "@/components/portal/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import {
  canAssignEnquiryRoles,
  ownEnquiryAssignmentRole,
  withCurrentUserIfRole,
} from "@/components/portal/lib/enquiryAccess";

const UNASSIGNED = "__none__";

type AssignableUser = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
};

interface EnquiryAssignmentFieldsProps {
  assignedTo: string;
  assignedManagerTo: string;
  assignedAdminTo: string;
  onAssignedToChange: (value: string) => void;
  onAssignedManagerToChange: (value: string) => void;
  onAssignedAdminToChange: (value: string) => void;
  assignableUsers: AssignableUser[];
  currentUser:
    | { _id?: string; name?: string; email?: string; role?: string }
    | null
    | undefined;
  /** On create, non-super-admins only see their own auto-assigned slot. */
  mode?: "create" | "edit";
}

export function EnquiryAssignmentFields({
  assignedTo,
  assignedManagerTo,
  assignedAdminTo,
  onAssignedToChange,
  onAssignedManagerToChange,
  onAssignedAdminToChange,
  assignableUsers,
  currentUser,
  mode = "edit",
}: EnquiryAssignmentFieldsProps) {
  const canAssignAll = canAssignEnquiryRoles(currentUser?.role);
  const ownRole = ownEnquiryAssignmentRole(currentUser?.role);

  const showAuditor = canAssignAll || ownRole === "auditor" || mode === "edit";
  const showManager = canAssignAll || ownRole === "manager" || mode === "edit";
  const showAdmin = canAssignAll || ownRole === "admin" || mode === "edit";

  const auditors = useMemo(
    () =>
      withCurrentUserIfRole(
        assignableUsers.filter((u) => u.role === "auditor"),
        currentUser,
        "auditor",
      ),
    [assignableUsers, currentUser],
  );
  const managers = useMemo(
    () =>
      withCurrentUserIfRole(
        assignableUsers.filter((u) => u.role === "manager"),
        currentUser,
        "manager",
      ),
    [assignableUsers, currentUser],
  );
  const admins = useMemo(
    () =>
      withCurrentUserIfRole(
        assignableUsers.filter((u) => u.role === "admin"),
        currentUser,
        "admin",
      ),
    [assignableUsers, currentUser],
  );

  const visibleCount = Number(showAuditor) + Number(showManager) + Number(showAdmin);
  const gridClass =
    visibleCount >= 3
      ? "grid gap-4 sm:grid-cols-3"
      : visibleCount === 2
        ? "grid gap-4 sm:grid-cols-2"
        : "grid gap-4 sm:grid-cols-1";

  return (
    <div className={gridClass}>
      {showAuditor ? (
        <AssignmentSelect
          label="Assigned auditor"
          value={assignedTo}
          onValueChange={onAssignedToChange}
          users={auditors}
          disabled={!canAssignAll}
        />
      ) : null}
      {showManager ? (
        <AssignmentSelect
          label="Assigned manager"
          value={assignedManagerTo}
          onValueChange={onAssignedManagerToChange}
          users={managers}
          disabled={!canAssignAll}
        />
      ) : null}
      {showAdmin ? (
        <AssignmentSelect
          label="Assigned admin"
          value={assignedAdminTo}
          onValueChange={onAssignedAdminToChange}
          users={admins}
          disabled={!canAssignAll}
        />
      ) : null}
    </div>
  );
}

function AssignmentSelect({
  label,
  value,
  onValueChange,
  users,
  disabled,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  users: AssignableUser[];
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Unassigned" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {users.map((u) => (
            <SelectItem key={u._id} value={u._id}>
              {u.name}
              {u.email ? ` (${u.email})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { UNASSIGNED as ENQUIRY_UNASSIGNED };
