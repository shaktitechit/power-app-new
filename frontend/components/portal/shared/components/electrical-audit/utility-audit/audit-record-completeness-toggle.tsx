"use client";

import { Badge } from "@/components/portal/ui/badge";
import { Button } from "@/components/portal/ui/button";
import { canUncompleteUtilityAuditStep } from "@/components/portal/lib/authRoles";
import { useAppSelector } from "@/store/hooks";

type AuditRecordCompletenessToggleProps = {
  isCompleted: boolean;
  auditStepLocked?: boolean;
  saving?: boolean;
  onToggle: () => void;
  className?: string;
};

export function AuditRecordCompletenessToggle({
  isCompleted,
  auditStepLocked = false,
  saving = false,
  onToggle,
  className,
}: AuditRecordCompletenessToggleProps) {
  const user = useAppSelector((state) => state.auth.user);
  const canMarkPending = canUncompleteUtilityAuditStep(user?.role);

  const showMarkCompleted = !isCompleted && !auditStepLocked;
  const showMarkPending = isCompleted && canMarkPending && !auditStepLocked;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Badge variant={isCompleted ? "default" : "secondary"}>
        {isCompleted ? "Completed" : "Pending"}
      </Badge>
      {showMarkCompleted || showMarkPending ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={auditStepLocked || saving}
          onClick={onToggle}
        >
          {saving
            ? "Saving…"
            : isCompleted
              ? "Mark pending"
              : "Mark completed"}
        </Button>
      ) : null}
    </div>
  );
}
