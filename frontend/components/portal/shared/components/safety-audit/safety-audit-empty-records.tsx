"use client";

import { Card, CardContent } from "@/components/portal/ui/card";

export function SafetyAuditEmptyRecords() {
  return (
    <Card className="border-border">
      <CardContent className="px-4 py-8 sm:px-6">
        <p className="text-center text-sm text-muted-foreground sm:text-base">
          No records yet. Use Add Record to begin this audit section.
        </p>
      </CardContent>
    </Card>
  );
}
