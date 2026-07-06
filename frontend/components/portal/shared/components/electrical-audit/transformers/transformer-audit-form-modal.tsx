"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { TransformerAuditRecordSection } from "./transformer-audit-record-section";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  utilityAccountId: string;
  transformerId: string;
  auditStepLocked?: boolean;
  initialEditing?: boolean;
};

export function TransformerAuditFormModal({
  open,
  onOpenChange,
  facilityId,
  utilityAccountId,
  transformerId,
  auditStepLocked = false,
  initialEditing = true,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Transformer Audit</DialogTitle>
        </DialogHeader>
        <TransformerAuditRecordSection
          facilityId={facilityId}
          utilityAccountId={utilityAccountId}
          transformerId={transformerId}
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
