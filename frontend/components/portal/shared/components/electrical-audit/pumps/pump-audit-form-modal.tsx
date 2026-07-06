"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { PumpAuditRecordSection } from "./pump-audit-record-section";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  utilityAccountId: string;
  pumpId: string;
  auditStepLocked?: boolean;
  initialEditing?: boolean;
};

export function PumpAuditFormModal({
  open,
  onOpenChange,
  facilityId,
  utilityAccountId,
  pumpId,
  auditStepLocked = false,
  initialEditing = true,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Pump Audit</DialogTitle>
        </DialogHeader>
        <PumpAuditRecordSection
          facilityId={facilityId}
          utilityAccountId={utilityAccountId}
          pumpId={pumpId}
          auditStepLocked={auditStepLocked}
          embedded
          hideDocuments
          initialEditing={initialEditing}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
