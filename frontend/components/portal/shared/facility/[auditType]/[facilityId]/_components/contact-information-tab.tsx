"use client";

import { Mail, Phone, Pencil, User } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";

export interface ClientRepresentative {
  name?: string;
  contact_number?: string;
  email?: string;
}

interface ContactInformationTabProps {
  clientRepresentatives: ClientRepresentative[];
  canUpdateFacility: boolean;
  facilityAuditClosed: boolean;
  onEdit: () => void;
}

export function ContactInformationTab({
  clientRepresentatives,
  canUpdateFacility,
  facilityAuditClosed,
  onEdit,
}: ContactInformationTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <User className="h-5 w-5 text-primary" />
            Contact Information
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
              Edit Contact
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          {clientRepresentatives.length > 0 ? (
            <div className="space-y-3">
              {clientRepresentatives.map((rep, index) => (
                <div
                  key={`client-rep-${index}`}
                  className="rounded-lg border border-border bg-muted/20 p-3"
                >
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Representative {index + 1}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-foreground">
                        {rep?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-foreground">
                        {rep?.email || "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-foreground">
                        {rep?.contact_number || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No client representative details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
