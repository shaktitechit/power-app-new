"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Card, CardContent } from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Badge } from "@/components/portal/ui/badge";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { Label } from "@/components/portal/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/portal/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import {
  ClipboardList,
  Plus,
  Clock,
  Send,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Users,
  ListChecks,
  Eye,
  Download,
  FileText,
  Receipt,
  Calendar as CalendarIcon,
  Network,
  Pencil,
  Layers,
} from "lucide-react";
import { TeamManagerContent } from "@/components/portal/shared/team-manager";
import {
  useGetWorkPlansQuery,
  useGetWorkTasksQuery,
  useCreateWorkPlanMutation,
  useSubmitWorkPlanMutation,
  useApproveWorkPlanMutation,
  useRejectWorkPlanMutation,
  useDeleteWorkPlanMutation,
  type WorkPlan,
  type WorkTask,
} from "@/store/slices/workPlannerApiSlice";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";

import { renderPlanStatusBadge, renderPlanTypeBadge, formatPlanDate, STATUS_COLORS } from "./workPlanUtils";
import {
  WorkPlannerStatsWidgets,
  RejectWorkPlanModal,
  DownloadWorkPlansModal,
  DownloadExpensesModal,
  CreatePlanModal,
  EditPlanModal,
  WorkPlannerCalendarModal,
} from "./components";

// ------------------------------------------------------------------
// Work Plans Tab
// ------------------------------------------------------------------
function WorkPlansTab({ tabMode = "my" }: { tabMode?: "my" | "today" | "all" | "team" | "approvals" }) {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const rolePrefix = user?.role ? `/${user.role.replace("_", "-")}` : "";

  const [statusFilter, setStatusFilter] = useState("all");
  const [planTypeFilter, setPlanTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [editPlanTarget, setEditPlanTarget] = useState<WorkPlan | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
    variant?: "default" | "destructive" | "emerald";
  } | null>(null);

  const { data, isLoading } = useGetWorkPlansQuery({
    tab: tabMode,
    status: statusFilter !== "all" ? statusFilter : undefined,
    planType: planTypeFilter !== "all" ? planTypeFilter : undefined,
    page,
    limit: 15,
  });

  const [submitPlan] = useSubmitWorkPlanMutation();
  const [approvePlan] = useApproveWorkPlanMutation();
  const [rejectPlan] = useRejectWorkPlanMutation();
  const [deletePlan] = useDeleteWorkPlanMutation();

  const canApprove = user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager";

  const handleSubmit = (id: string) => {
    setConfirmModal({
      title: "Submit Work Plan",
      description: "Are you sure you want to submit this work plan for approval?",
      variant: "default",
      action: async () => {
        try {
          await submitPlan(id).unwrap();
          if (user?.role === "super_admin") {
            toast.success("Work plan approved directly (Super Admin).");
          } else {
            toast.success("Plan submitted for approval.");
          }
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to submit.");
        }
      },
    });
  };

  const handleApprove = (id: string) => {
    setConfirmModal({
      title: "Approve Work Plan",
      description: "Are you sure you want to approve this work plan?",
      variant: "emerald",
      action: async () => {
        try {
          await approvePlan({ id }).unwrap();
          toast.success("Plan approved.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to approve.");
        }
      },
    });
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    try {
      await rejectPlan({ id: rejectTarget, reason }).unwrap();
      toast.success("Plan rejected.");
      setRejectTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to reject.");
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Work Plan",
      description: "Are you sure you want to delete this work plan? This action cannot be undone.",
      variant: "destructive",
      action: async () => {
        try {
          await deletePlan(id).unwrap();
          toast.success("Plan deleted.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to delete.");
        }
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabMode !== "approvals" && (
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["draft", "submitted", "approved", "rejected", "active", "completed", "cancelled"].map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={planTypeFilter} onValueChange={(v) => { setPlanTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Plan Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="visits">Site Visits</SelectItem>
              <SelectItem value="work_from_office">Work From Office</SelectItem>
              <SelectItem value="work_from_home">Work From Home</SelectItem>
              <SelectItem value="leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tabMode === "my" && (
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> New Daily Plan
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto shadow-2xs">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Work Plan</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Owner</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden lg:table-cell">Visits / Items</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.plans || []).map((plan: WorkPlan) => (
                <tr key={plan._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderPlanTypeBadge(plan.planType)}
                      <span
                        className="font-medium text-foreground hover:text-primary cursor-pointer truncate max-w-[180px] sm:max-w-[240px]"
                        onClick={() => router.push(`${rolePrefix}/work-planner/${plan._id}`)}
                      >
                        {plan.title || `Work Plan (${plan.planType})`}
                      </span>
                    </div>
                    {plan.approval?.rejectionReason && (
                      <p className="text-[10px] text-destructive mt-0.5">Reason: {plan.approval.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell font-medium">
                    {plan.owner?.name}
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">
                    {formatPlanDate(plan.date || plan.period.startDate)}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    {plan.planType === "visits" ? (
                      <span className="text-purple-700 font-medium">{plan.visits?.length || 0} Visits</span>
                    ) : (
                      <span className="text-blue-700 font-medium">{plan.works?.length || 0} Tasks</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      {renderPlanStatusBadge(plan.status)}
                      {plan.approval?.approvedBy?.name && (
                        <Badge variant="outline" className="border-emerald-600/30 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40 text-[10px] px-1.5 py-0 font-normal">
                          Approved by: {plan.approval.approvedBy.name}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-[11px] h-6 px-1.5"
                        onClick={() => router.push(`${rolePrefix}/work-planner/${plan._id}`)}
                      >
                        <Eye className="h-3 w-3" /> Details
                      </Button>

                      {["draft", "submitted", "rejected"].includes(plan.status) && (String(plan.owner?._id) === String(user?._id) || canApprove) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-[11px] h-6 px-1.5"
                          onClick={() => setEditPlanTarget(plan)}
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                      )}

                      {["draft", "rejected"].includes(plan.status) && String(plan.owner?._id) === String(user?._id) && (
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1 text-[11px] h-6 px-1.5"
                          onClick={() => handleSubmit(plan._id)}
                        >
                          <Send className="h-3 w-3" /> {user?.role === "super_admin" ? "Approve" : "Submit"}
                        </Button>
                      )}

                      {(tabMode === "approvals" || (plan.status === "submitted" && canApprove && String(plan.owner?._id) !== String(user?._id))) && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] h-6 px-1.5"
                            onClick={() => handleApprove(plan._id)}
                          >
                            <ThumbsUp className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1 text-[11px] h-6 px-1.5"
                            onClick={() => setRejectTarget(plan._id)}
                          >
                            <ThumbsDown className="h-3 w-3" /> Reject
                          </Button>
                        </>
                      )}

                      {plan.status === "draft" && String(plan.owner?._id) === String(user?._id) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1 text-[11px] h-6 px-1.5"
                          onClick={() => handleDelete(plan._id)}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.plans?.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                    <ClipboardList className="h-7 w-7 mx-auto mb-1.5 opacity-40" />
                    No work plans found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <Dialog open={!!confirmModal} onOpenChange={(open) => !open && setConfirmModal(null)}>
          <DialogContent className="max-w-md rounded-xl p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">{confirmModal.title}</DialogTitle>
              <DialogDescription className="text-xs pt-1">{confirmModal.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setConfirmModal(null)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                variant={confirmModal.variant === "destructive" ? "destructive" : "default"}
                className={`h-8 text-xs ${confirmModal.variant === "emerald" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={async () => {
                  const act = confirmModal.action;
                  setConfirmModal(null);
                  await act();
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <p className="text-muted-foreground">
            Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, data.total)} of <strong>{data.total}</strong> plans
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>

            <span className="px-2 font-medium">
              Page {page} of {Math.ceil(data.total / 15) || 1}
            </span>

            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page * 15 >= data.total} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <CreatePlanModal open={showCreate} onClose={() => setShowCreate(false)} />

      <RejectWorkPlanModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
      />

      <EditPlanModal
        open={!!editPlanTarget}
        onClose={() => setEditPlanTarget(null)}
        plan={editPlanTarget}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// Tasks Tab
// ------------------------------------------------------------------
function TasksTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetWorkTasksQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: 15,
  });

  return (
    <div className="space-y-4">
      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {["draft", "assigned", "in_progress", "completed", "overdue"].map((s) => (
            <SelectItem key={s} value={s}>{s.replace("_", " ").charAt(0).toUpperCase() + s.replace("_", " ").slice(1)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.tasks || []).map((task: WorkTask) => (
            <Card key={task._id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{task.title}</p>
                      {renderPlanStatusBadge(task.status)}
                      <Badge variant="outline" className="text-xs capitalize">
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Assigned to {task.assignedTo?.name}
                      {task.dueDate && ` · Due ${formatPlanDate(task.dueDate)}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data?.tasks?.length && (
            <div className="py-12 text-center text-muted-foreground">
              <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No tasks found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
export default function WorkPlannerPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canSeeTeamAndApprovals = user?.role === "super_admin" || user?.role === "admin" || user?.role === "manager";

  const [showCalendar, setShowCalendar] = useState(false);
  const [showDownloadPlans, setShowDownloadPlans] = useState(false);
  const [showDownloadExpenses, setShowDownloadExpenses] = useState(false);

  return (
    <DashboardLayout title="Work Planner" subtitle="Plan, assign, and track work for your team">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Work Planner</h1>
              <p className="text-sm text-muted-foreground">Create and manage daily work plans, site visits, tasks and expenses</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowCalendar(true)}
              className="gap-1.5 text-xs bg-primary hover:bg-primary/90 shadow-sm"
            >
              <CalendarIcon className="h-4 w-4" /> Calendar View
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDownloadPlans(true)} className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> Work Plan Report
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDownloadExpenses(true)} className="gap-1.5 text-xs">
              <Receipt className="h-3.5 w-3.5" /> Expense Report
            </Button>
          </div>
        </div>

        <Tabs defaultValue="today">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="today" className="gap-2">
              <CalendarIcon className="h-4 w-4 text-emerald-600" /> Today&apos;s Plans
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> My Work Plans
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Layers className="h-4 w-4 text-blue-600" /> All Work Plans
            </TabsTrigger>
            {canSeeTeamAndApprovals && (
              <>
                <TabsTrigger value="team" className="gap-2">
                  <Users className="h-4 w-4 text-purple-600" /> Team Work Plans
                </TabsTrigger>
                <TabsTrigger value="approvals" className="gap-2">
                  <Clock className="h-4 w-4 text-amber-600" /> Pending Approvals
                </TabsTrigger>
              </>
            )}
            {user?.role === "super_admin" && (
              <TabsTrigger value="team-manager" className="gap-2">
                <Network className="h-4 w-4" /> Team Manager
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="today" className="mt-4">
            <WorkPlansTab tabMode="today" />
          </TabsContent>
          <TabsContent value="my" className="mt-4">
            <WorkPlansTab tabMode="my" />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <WorkPlansTab tabMode="all" />
          </TabsContent>
          {canSeeTeamAndApprovals && (
            <>
              <TabsContent value="team" className="mt-4">
                <WorkPlansTab tabMode="team" />
              </TabsContent>
              <TabsContent value="approvals" className="mt-4">
                <WorkPlansTab tabMode="approvals" />
              </TabsContent>
            </>
          )}
          {user?.role === "super_admin" && (
            <TabsContent value="team-manager" className="mt-4">
              <TeamManagerContent />
            </TabsContent>
          )}
        </Tabs>

        <WorkPlannerCalendarModal open={showCalendar} onClose={() => setShowCalendar(false)} />
        <DownloadWorkPlansModal open={showDownloadPlans} onClose={() => setShowDownloadPlans(false)} />
        <DownloadExpensesModal open={showDownloadExpenses} onClose={() => setShowDownloadExpenses(false)} />
      </div>
    </DashboardLayout>
  );
}
