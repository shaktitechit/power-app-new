"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { CustomTabs } from "@/components/portal/ui/custom-tabs";
import { Button } from "@/components/portal/ui/button";
import { ArrowLeft, Maximize2, Minimize2, Pencil } from "lucide-react";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { canManageResource } from "@/components/portal/lib/authRoles";
import { EditSafetyAuditUtilityForm } from "@/components/portal/shared/components/safety-audit/utility-account/edit-safety-audit-utility-form";
import { UtilityAccountDetailsSafety } from "./utility-account-details-safety";
import { UtilityAccountSafetyAuditStepPanels } from "./utility-account-safety-audit-step-panels";
import { SafetyPreviewModal } from "./safety-preview-modal";
import { UtilityOpenAuditButton } from "@/components/portal/shared/components/electrical-audit/utility-audit/utility-open-audit-button";
import { SafetyAuditProgress } from "./safety-audit-progress";
import type { ElectricalSafetyUtilityAccountWorkspaceModel } from "./use-electrical-safety-utility-account-workspace";
import type { Facility } from "@/store/slices/facilityApiSlice";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";

type Props = {
  model: ElectricalSafetyUtilityAccountWorkspaceModel;
  facility: Facility;
  utilityAccount: UtilityAccount;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
};

export function ElectricalSafetyUtilityWorkspace({
  model,
  facility,
  utilityAccount,
  isFullscreen,
  onFullscreenToggle,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const user = useAppSelector((state) => state.auth.user);
  const canUpdateUtilityAccount = canManageResource(
    user?.role,
    user?.permissions || [],
    "utility_account",
    "update",
  );

  const {
    facilityPathPrefix,
    tabs,
    activeTab,
    handleTabChange,
    canViewDocs,
    finalAuditLocked,
    finalAuditSubmission,
    auditStatusLabel,
    facilityAuditLocked,
    auditStepLocked,
  } = model;

  const handleEditComplete = () => {
    setEditOpen(false);
  };

  return (
    <DashboardLayout
      title={utilityAccount.account_number}
      subtitle={`${facility.name} - ${utilityAccount.connection_type} Utility Account — Electrical safety`}
      isFullscreen={isFullscreen}
    >
      <div className="flex flex-col h-[calc(100vh-7rem)] sm:h-[calc(100vh-8.5rem)]">
        <div className="mb-4 flex-shrink-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <Link
            href={facilityPathPrefix}
            className="flex min-w-0 max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">Back to {facility.name}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {canUpdateUtilityAccount && !facilityAuditLocked && !finalAuditLocked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Edit Account
              </Button>
            ) : null}
            <SafetyPreviewModal
              model={model}
              utilityAccount={utilityAccount}
              disabled={facilityAuditLocked || finalAuditLocked}
            />
            {finalAuditLocked ? (
              <UtilityOpenAuditButton
                utilityAccountId={utilityAccount._id}
                accountNumber={utilityAccount.account_number}
                disabled={facilityAuditLocked}
              />
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={onFullscreenToggle}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <SafetyAuditProgress
          tabs={tabs}
          recordCompletionContext={model.recordCompletionContext}
        />

        <div className="flex-1 overflow-y-auto min-h-0 relative pr-1">
          {activeTab === "details" && (
            <UtilityAccountDetailsSafety
              utilityAccount={utilityAccount}
              canViewDocs={canViewDocs}
              finalAuditLocked={finalAuditLocked}
              finalAuditSubmission={finalAuditSubmission}
              auditStatusLabel={auditStatusLabel}
              auditStepLocked={auditStepLocked}
            />
          )}

          <UtilityAccountSafetyAuditStepPanels
            model={model}
            utilityAccount={utilityAccount}
            facilityId={facility._id}
          />
        </div>

        <div className="flex-shrink-0 pt-4 mt-4 border-t border-border">
          <CustomTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      </div>
      {canUpdateUtilityAccount && !facilityAuditLocked && !finalAuditLocked ? (
        <EditSafetyAuditUtilityForm
          open={editOpen}
          onOpenChange={setEditOpen}
          onComplete={handleEditComplete}
          utilityAccount={utilityAccount}
        />
      ) : null}
    </DashboardLayout>
  );
}
