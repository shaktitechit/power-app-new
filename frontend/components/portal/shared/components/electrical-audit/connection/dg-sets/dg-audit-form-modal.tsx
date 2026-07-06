"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { DGAuditRecordSection } from "./DGAuditRecordSection";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  utilityAccountId: string;
  dgSetId: string;
  auditStepLocked?: boolean;
  initialEditing?: boolean;
};

export function DGAuditFormModal({
  open,
  onOpenChange,
  facilityId,
  utilityAccountId,
  dgSetId,
  auditStepLocked = false,
  initialEditing = true,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>DG Audit</DialogTitle>
        </DialogHeader>
        <DGAuditRecordSection
          facilityId={facilityId}
          utilityAccountId={utilityAccountId}
          dgSetId={dgSetId}
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
