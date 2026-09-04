import { quotationStatusLabel } from "@/components/portal/lib/quotationConstants";

export function QuotationStatusPill({ status }: { status: string }) {
  const base =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize";
  const map: Record<string, string> = {
    DRAFT:
      "bg-muted text-muted-foreground border border-border",
    SENT:
      "bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
    ACCEPTED:
      "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    REJECTED:
      "bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-red-200",
    EXPIRED:
      "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
    CANCELLED:
      "bg-muted text-muted-foreground border border-border",
  };
  const cls = map[status] ?? map.DRAFT;
  return <span className={`${base} ${cls}`}>{quotationStatusLabel(status)}</span>;
}
