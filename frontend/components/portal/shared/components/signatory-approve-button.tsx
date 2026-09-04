"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/portal/ui/alert-dialog";
import {
  canApproveAsSignatory,
  isSignatoryApproved,
  signatoryDisplayNameFromDoc,
  type SignatoryApprovalDoc,
} from "@/components/portal/lib/signatoryApproval";
import { toastHandler } from "@/components/portal/lib/toast";
import { useAppSelector } from "@/store/hooks";

export function SignatoryApproveButton({
  doc,
  documentLabel,
  refLabel,
  onApprove,
  isLoading,
  size = "sm",
}: {
  doc: SignatoryApprovalDoc;
  documentLabel: string;
  refLabel: string;
  onApprove: () => Promise<unknown>;
  isLoading?: boolean;
  size?: "sm" | "default";
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const userId = useAppSelector((state) => state.auth.user?._id);
  if (isSignatoryApproved(doc) || !canApproveAsSignatory(doc, userId)) return null;

  const handleApprove = async () => {
    await toastHandler({
      loading: `Approving ${documentLabel}…`,
      success: `${documentLabel === "EOI" ? "EOI" : "Quotation"} approved.`,
      action: () => onApprove(),
    });
  };

  return (
    <>
      <Button
        size={size}
        className={size === "sm" ? "h-8" : undefined}
        disabled={isLoading}
        onClick={(event) => {
          event.stopPropagation();
          setConfirmOpen(true);
        }}
      >
        <Check className="mr-1.5 h-3.5 w-3.5" />
        Approve as signatory
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this {documentLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              {refLabel} will be released under {signatoryDisplayNameFromDoc(doc)}.
              After you approve, others can preview the PDF and the document can be emailed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Not yet</AlertDialogCancel>
            <AlertDialogAction disabled={isLoading} onClick={() => void handleApprove()}>
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
