"use client";

import { Building2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import type { AssignedAuditor, Facility } from "@/store/slices/facilityApiSlice";
import { formatAuditClosureUser } from "./facility-utils";

interface FacilityInformationTabProps {
  facility: Facility;
  assignedAuditors: AssignedAuditor[];
  facilityAuditClosed: boolean;
  canUpdateFacility: boolean;
  onEdit: () => void;
}

export function FacilityInformationTab({
  facility,
  assignedAuditors,
  facilityAuditClosed,
  canUpdateFacility,
  onEdit,
}: FacilityInformationTabProps) {
  const teamLabel =
    facility?.auditor_id?.name ||
    facility?.auditor_id?.email ||
    (assignedAuditors?.length
      ? assignedAuditors
          .map((a) => {
            const userInfo = a?.user_id;
            if (!userInfo || typeof userInfo === "string") return "";
            return userInfo.name || userInfo.email || "";
          })
          .filter(Boolean)
          .join(", ")
      : "-");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Building2 className="h-5 w-5 text-primary" />
            Facility Information
          </CardTitle>
          {canUpdateFacility ? (
            <Button
              variant="outline"
              size="sm"
              disabled={facilityAuditClosed}
              onClick={onEdit}
              className="h-8 text-xs sm:text-sm"
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit Facility
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              {facility?.name || "-"}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                {facility?.facility_type?.trim() || "—"}
              </span>
              {facility?.audit_type ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                  {facility.audit_type}
                </span>
              ) : null}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  facilityAuditClosed
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                }`}
              >
                {facilityAuditClosed ? "Closed" : "Open"}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">{facility?.address || "-"}</p>
              <p className="text-sm text-muted-foreground">{facility?.city || "-"}</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Audit Type</span>
              <span className="max-w-[60%] text-right text-foreground">
                {facility?.audit_type || "—"}
              </span>
            </div>

            {facility?.audit_number ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Audit Number</span>
                <span className="font-mono text-xs text-right text-foreground">
                  {facility.audit_number}
                </span>
              </div>
            ) : null}

            {facility?.enquiry_number ? (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Enquiry Number</span>
                <span className="font-mono text-xs text-right text-foreground">
                  {facility.enquiry_number}
                </span>
              </div>
            ) : null}            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Audit Date</span>
              <span className="text-right text-foreground">
                {facility?.audit_date
                  ? new Date(facility.audit_date).toLocaleDateString()
                  : "-"}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Start Date</span>
              <span className="text-right text-foreground">
                {facility?.start_date
                  ? new Date(facility.start_date).toLocaleDateString()
                  : "-"}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Closure Date</span>
              <span className="text-right text-foreground">
                {facility?.closure_date
                  ? new Date(facility.closure_date).toLocaleDateString()
                  : "-"}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Team</span>
              <span className="text-right text-foreground">{teamLabel}</span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Created</span>
              <span className="text-right text-foreground">
                {facility?.created_at
                  ? new Date(facility.created_at).toLocaleString()
                  : facility?.createdAt
                    ? new Date(facility.createdAt).toLocaleString()
                    : "-"}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="text-right text-foreground">
                {facility?.updated_at
                  ? new Date(facility.updated_at).toLocaleString()
                  : facility?.updatedAt
                    ? new Date(facility.updatedAt).toLocaleString()
                    : "-"}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Closure Status</span>
              <span
                className={`text-right font-medium ${
                  facilityAuditClosed
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {facilityAuditClosed ? "Closed" : "Open"}
              </span>
            </div>

            {facilityAuditClosed ? (
              <>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Audit closure date</span>
                  <span className="text-right text-foreground">
                    {facility?.audit_closure?.closed_at
                      ? new Date(facility.audit_closure.closed_at).toLocaleString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Closed by</span>
                  <span className="text-right text-foreground">
                    {formatAuditClosureUser(facility?.audit_closure?.closed_by)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
