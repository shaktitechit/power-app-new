"use client";

import { cn } from "@/components/portal/lib/utils";
import {
  htmlToPlainText,
  RICH_TEXT_PROSE_CLASS,
  sanitizeRichHtml,
} from "@/components/portal/lib/richText";

export function RichText({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const safe = sanitizeRichHtml(html);
  if (!htmlToPlainText(safe)) return null;

  return (
    <div
      className={cn("text-sm text-foreground", RICH_TEXT_PROSE_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
