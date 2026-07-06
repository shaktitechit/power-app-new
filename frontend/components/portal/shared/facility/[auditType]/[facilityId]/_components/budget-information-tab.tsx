"use client";

import { Activity, Pencil } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import type { Facility } from "@/store/slices/facilityApiSlice";

interface BudgetInformationTabProps {
  facility: Facility;
  canUpdateFacility: boolean;
  facilityAuditClosed: boolean;
  onEditBudget: () => void;
}

export function BudgetInformationTab({
  facility,
  canUpdateFacility,
  facilityAuditClosed,
  onEditBudget,
}: BudgetInformationTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Activity className="h-5 w-5 text-primary" />
            Budget Information
          </CardTitle>
          {canUpdateFacility ? (
            <Button
              variant="outline"
              size="sm"
              disabled={facilityAuditClosed}
              onClick={onEditBudget}
              className="h-8 text-xs sm:text-sm"
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit Budget
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">No. of Persons</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {facility?.budget?.no_of_persons != null
                ? facility.budget.no_of_persons
                : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Planned Site Visits</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {facility?.budget?.no_planned_site_visits != null
                ? facility.budget.no_planned_site_visits
                : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Tentative Budget</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {facility?.budget?.tentative_budget != null
                ? `₹${facility.budget.tentative_budget.toLocaleString("en-IN")}`
                : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Actual Budget</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {facility?.budget?.actual_budget != null
                ? `₹${facility.budget.actual_budget.toLocaleString("en-IN")}`
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
