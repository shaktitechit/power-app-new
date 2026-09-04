import { isSignatoryApproved, signatoryApprovalNotRequired } from "@/components/portal/lib/signatoryApproval";
import type { SignatoryApprovalDoc } from "@/components/portal/lib/signatoryApproval";

export function SignatoryApprovalPill({ doc }: { doc: SignatoryApprovalDoc }) {
  if (signatoryApprovalNotRequired(doc)) return null;
  const approved = isSignatoryApproved(doc);
  const base = "inline-flex rounded-full px-2.5 py-1 text-xs font-medium";
  if (approved) {
    return (
      <span className={`${base} bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200`}>
        Signatory approved
      </span>
    );
  }
  return (
    <span className={`${base} bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200`}>
      Awaiting signatory
    </span>
  );
}
