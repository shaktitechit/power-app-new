"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "@/components/portal/hooks/useParams";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { Badge } from "@/components/portal/ui/badge";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Building2,
  MapPin,
  User,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Send,
  ThumbsUp,
  ThumbsDown,
  Briefcase,
  Palmtree,
  IndianRupee,
  ListChecks,
  XCircle,
  CalendarPlus,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Banknote,
  FileText,
} from "lucide-react";
import {
  useGetWorkPlanQuery,
  useUpdateWorkPlanMutation,
  useSubmitWorkPlanMutation,
  useApproveWorkPlanMutation,
  useRejectWorkPlanMutation,
  useCompleteWorkPlanMutation,
  useCancelWorkPlanMutation,
  type VisitItem,
  type WorkItem,
} from "@/store/slices/workPlannerApiSlice";
import {
  useCreateExpenseMutation,
  useSubmitExpenseMutation,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
  useReimburseExpenseMutation,
  useDeleteExpenseMutation,
} from "@/store/slices/expenseManagerApiSlice";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";
import { formatRoleLabel } from "@/components/portal/lib/authRoles";

import {
  renderPlanStatusBadge,
  renderPlanTypeBadge,
  formatPlanDate,
  formatTime,
  PLAN_TYPE_CONFIG,
  STATUS_COLORS,
} from "../workPlanUtils";
import {
  VisitFormModal,
  WorkFormModal,
  CompleteVisitModal,
  CompleteWorkModal,
  RejectWorkPlanModal,
  NextVisitPlanModal,
  EditPlanModal,
} from "../components";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/portal/ui/dialog";
import { Label } from "@/components/portal/ui/label";
import { Input } from "@/components/portal/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/portal/ui/select";

export default function WorkPlanDetailsPage({ planIdProp }: { planIdProp?: string }) {
  const router = useRouter();
  const params = useParams();
  const planId = planIdProp || String(params.planId || "");

  const user = useAppSelector((s) => s.auth.user);
  const { data: plan, isLoading, error } = useGetWorkPlanQuery(planId, { skip: !planId });

  const [updatePlan] = useUpdateWorkPlanMutation();
  const [submitPlan] = useSubmitWorkPlanMutation();
  const [approvePlan] = useApproveWorkPlanMutation();
  const [rejectPlan] = useRejectWorkPlanMutation();
  const [completePlan] = useCompleteWorkPlanMutation();
  const [cancelPlan] = useCancelWorkPlanMutation();

  const [createExpense, { isLoading: isCreatingExpense }] = useCreateExpenseMutation();
  const [submitExpense] = useSubmitExpenseMutation();
  const [approveExpense] = useApproveExpenseMutation();
  const [rejectExpense] = useRejectExpenseMutation();
  const [reimburseExpense] = useReimburseExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  // Modals state
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<{ index?: number; item?: VisitItem } | null>(null);

  const [showWorkModal, setShowWorkModal] = useState(false);
  const [editingWork, setEditingWork] = useState<{ index?: number; item?: WorkItem } | null>(null);

  const [completeVisitTarget, setCompleteVisitTarget] = useState<{ index: number; item: VisitItem } | null>(null);
  const [completeWorkTarget, setCompleteWorkTarget] = useState<{ index: number; item: WorkItem } | null>(null);
  const [nextVisitTarget, setNextVisitTarget] = useState<VisitItem | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [rejectExpenseTarget, setRejectExpenseTarget] = useState<string | null>(null);
  const [rejectExpenseReason, setRejectExpenseReason] = useState("");

  const [expenseForm, setExpenseForm] = useState({
    visitId: "",
    taskId: "",
    category: "travel",
    subcategory: "fuel",
    amount: "",
    description: "",
    receiptUrl: "",
    fileName: "",
  });

  // Generic Confirmation Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
    variant?: "default" | "destructive" | "emerald";
  } | null>(null);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  const isOwner = String(plan?.owner?._id || plan?.owner) === String(user?._id);
  const rolePrefix = user?.role ? `/${user.role.replace("_", "-")}` : "";

  if (error || !plan) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
          <AlertCircle className="h-12 w-12 text-destructive mb-3" />
          <h2 className="text-xl font-bold">Work Plan Not Found</h2>
          <p className="text-muted-foreground text-sm mt-1 mb-4">
            The work plan could not be retrieved or you do not have permission to view it.
          </p>
          <Button onClick={() => router.push(`${rolePrefix}/work-planner`)}>Back to Work Planner</Button>
        </div>
      </DashboardLayout>
    );
  }

  // 2-Day Expense Window Calculation
  const planDateObj = plan.date ? new Date(plan.date) : (plan.period?.startDate ? new Date(plan.period.startDate) : new Date());
  const minExpenseDate = new Date(planDateObj);
  minExpenseDate.setHours(0, 0, 0, 0);

  const maxExpenseDate = new Date(planDateObj);
  maxExpenseDate.setDate(maxExpenseDate.getDate() + 2);
  maxExpenseDate.setHours(23, 59, 59, 999);

  const currentTime = new Date();
  const isSuperAdmin = user?.role === "super_admin";
  const isExpenseWindowExpired = !isSuperAdmin && currentTime > maxExpenseDate;
  const isExpenseWindowTooEarly = !isSuperAdmin && currentTime < minExpenseDate;
  const isExpenseWindowActive = !isExpenseWindowExpired && !isExpenseWindowTooEarly;

  const isSeniorAuthority = user?.role === "super_admin" || user?.role === "admin" || (user?.role === "manager" && !isOwner);
  const canApprove = (user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager") && (!isOwner || user?.role === "super_admin");
  const canApproveExpense = (user?.role === "super_admin" || user?.role === "admin" || user?.role === "manager") && (!isOwner || user?.role === "super_admin");

  const isApproved = ["approved", "active"].includes(plan.status);
  const isSubmitted = plan.status === "submitted";
  const isDraftOrRejected = ["draft", "rejected"].includes(plan.status);
  const isUnapproved = ["draft", "submitted", "rejected"].includes(plan.status);
  const isPlanLocked = ["completed", "cancelled"].includes(plan.status);

  // Can Add / Edit / Delete Visits & Works & Plan Details
  const canModifyStructure = !isPlanLocked && (isUnapproved ? (isOwner || isSeniorAuthority) : (isApproved && isSeniorAuthority));
  const canUpdateWorkflow = !isPlanLocked && isApproved && (isOwner || isSeniorAuthority);

  // Completion Eligibility Check
  const hasVisits = Array.isArray(plan.visits) && plan.visits.length > 0;
  const hasWorks = Array.isArray(plan.works) && plan.works.length > 0;
  
  const allVisitsCompleted = hasVisits && (plan.visits || []).every((v) => v.status === "completed");
  const allWorksCompleted = hasWorks && (plan.works || []).every((w) => w.status === "completed");

  let isPlanEligibleForCompletion = false;
  if (plan.planType === "visits") {
    isPlanEligibleForCompletion = hasVisits && allVisitsCompleted;
  } else if (["work_from_office", "work_from_home"].includes(plan.planType)) {
    isPlanEligibleForCompletion = hasWorks && allWorksCompleted;
  } else if (plan.planType === "leave") {
    isPlanEligibleForCompletion = true;
  }

  // Workflow Handlers
  const handleSubmit = () => {
    setConfirmModalConfig({
      title: "Submit Work Plan",
      description: "Are you sure you want to submit this work plan for approval?",
      variant: "default",
      action: async () => {
        try {
          await submitPlan(plan._id).unwrap();
          if (user?.role === "super_admin") {
            toast.success("Work plan approved directly (Super Admin).");
          } else {
            toast.success("Plan submitted for approval.");
          }
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to submit plan.");
        }
      },
    });
  };

  const handleApprove = () => {
    setConfirmModalConfig({
      title: "Approve Work Plan",
      description: "Are you sure you want to approve this work plan?",
      variant: "emerald",
      action: async () => {
        try {
          await approvePlan({ id: plan._id }).unwrap();
          toast.success("Plan approved.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to approve plan.");
        }
      },
    });
  };

  const handleRejectConfirm = async (reason: string) => {
    try {
      await rejectPlan({ id: plan._id, reason }).unwrap();
      toast.success("Plan rejected.");
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to reject plan.");
    }
  };

  const handleCompletePlan = () => {
    if (!isPlanEligibleForCompletion) {
      toast.error("All scheduled visits or work tasks must be marked as completed first.");
      return;
    }
    setConfirmModalConfig({
      title: "Complete Work Plan",
      description: "Are you sure you want to mark this work plan as completed?",
      variant: "emerald",
      action: async () => {
        try {
          await completePlan(plan._id).unwrap();
          toast.success("Work plan marked as completed.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to complete work plan.");
        }
      },
    });
  };

  const handleCancelPlan = () => {
    setConfirmModalConfig({
      title: "Cancel Work Plan",
      description: "Are you sure you want to cancel this work plan? This action cannot be undone.",
      variant: "destructive",
      action: async () => {
        try {
          await cancelPlan(plan._id).unwrap();
          toast.success("Work plan cancelled.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to cancel work plan.");
        }
      },
    });
  };

  // Visit Item Handlers
  const handleSaveVisit = async (visitPayload: VisitItem) => {
    if (!canModifyStructure) {
      toast.error("Only senior authority can modify plan structure after approval.");
      return;
    }

    let updatedVisits = [...(plan.visits || [])];
    if (editingVisit?.index !== undefined) {
      updatedVisits[editingVisit.index] = { ...updatedVisits[editingVisit.index], ...visitPayload };
    } else {
      updatedVisits.push(visitPayload);
    }

    try {
      await updatePlan({ id: plan._id, visits: updatedVisits as any }).unwrap();
      toast.success(editingVisit?.index !== undefined ? "Visit updated." : "Visit added to plan.");
      setShowVisitModal(false);
      setEditingVisit(null);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to save visit.");
    }
  };

  const handleDeleteVisit = (index: number) => {
    if (!canModifyStructure) {
      toast.error("Only senior authority can remove visits after plan approval.");
      return;
    }
    setConfirmModalConfig({
      title: "Remove Site Visit",
      description: "Are you sure you want to remove this site visit from the work plan?",
      variant: "destructive",
      action: async () => {
        const updatedVisits = (plan.visits || []).filter((_, i) => i !== index);
        try {
          await updatePlan({ id: plan._id, visits: updatedVisits as any }).unwrap();
          toast.success("Visit removed from plan.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to remove visit.");
        }
      },
    });
  };

  const handleCheckInVisit = async (index: number) => {
    if (!canUpdateWorkflow) {
      toast.error("Plan must be approved before updating visit workflow.");
      return;
    }
    const updatedVisits = (plan.visits || []).map((v, i) => {
      if (i !== index) return v;
      return { ...v, status: "in_progress" as const, checkInTime: new Date().toISOString() };
    });
    try {
      await updatePlan({ id: plan._id, visits: updatedVisits as any }).unwrap();
      toast.success("Checked in to site visit.");
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to check in.");
    }
  };

  const handleCompleteVisitConfirm = async ({ outcome, status }: { outcome: string; status: "completed" }) => {
    if (!completeVisitTarget || !canUpdateWorkflow) return;
    const { index } = completeVisitTarget;
    const updatedVisits = (plan.visits || []).map((v, i) => {
      if (i !== index) return v;
      return {
        ...v,
        status: "completed" as const,
        checkOutTime: v.checkOutTime || new Date().toISOString(),
        notes: outcome ? `${v.notes ? v.notes + " | " : ""}${outcome}` : v.notes,
      };
    });
    try {
      await updatePlan({ id: plan._id, visits: updatedVisits as any }).unwrap();
      toast.success("Visit marked as completed.");
      setCompleteVisitTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to complete visit.");
    }
  };

  const handleScheduleNextConfirm = async ({ date, purpose }: { date: string; purpose: string }) => {
    toast.success(`Follow-up visit scheduled for ${date}.`);
    setNextVisitTarget(null);
  };

  // Work Item Handlers
  const handleSaveWork = async (workPayload: WorkItem) => {
    if (!canModifyStructure) {
      toast.error("Only senior authority can modify plan structure after approval.");
      return;
    }

    let updatedWorks = [...(plan.works || [])];
    if (editingWork?.index !== undefined) {
      updatedWorks[editingWork.index] = { ...updatedWorks[editingWork.index], ...workPayload };
    } else {
      updatedWorks.push(workPayload);
    }

    try {
      await updatePlan({ id: plan._id, works: updatedWorks as any }).unwrap();
      toast.success(editingWork?.index !== undefined ? "Work item updated." : "Work item added.");
      setShowWorkModal(false);
      setEditingWork(null);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to save work item.");
    }
  };

  const handleDeleteWork = (index: number) => {
    if (!canModifyStructure) {
      toast.error("Only senior authority can remove work items after plan approval.");
      return;
    }
    setConfirmModalConfig({
      title: "Remove Task",
      description: "Are you sure you want to remove this work task from the plan?",
      variant: "destructive",
      action: async () => {
        const updatedWorks = (plan.works || []).filter((_, i) => i !== index);
        try {
          await updatePlan({ id: plan._id, works: updatedWorks as any }).unwrap();
          toast.success("Work item removed.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to remove work item.");
        }
      },
    });
  };

  const handleCompleteWorkConfirm = async (remarks: string) => {
    if (!completeWorkTarget || !canUpdateWorkflow) return;
    const { index } = completeWorkTarget;
    const updatedWorks = (plan.works || []).map((w, i) => {
      if (i !== index) return w;
      return {
        ...w,
        status: "completed" as const,
        notes: remarks ? `${w.notes ? w.notes + " | " : ""}${remarks}` : w.notes,
      };
    });
    try {
      await updatePlan({ id: plan._id, works: updatedWorks as any }).unwrap();
      toast.success("Work task marked completed.");
      setCompleteWorkTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to complete work task.");
    }
  };

  // Expense Handlers & Workflow
  const handleAddExpense = async () => {
    if (isExpenseWindowExpired) {
      toast.error("The 2-day window for logging expenses for this work plan has expired.");
      return;
    }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    if (!expenseForm.description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (Number(expenseForm.amount) > 500 && !expenseForm.receiptUrl) {
      toast.error("Receipt document (Image or PDF) is required for expenses greater than ₹500.");
      return;
    }
    try {
      await createExpense({
        workPlanId: plan._id,
        visitId: expenseForm.visitId || undefined,
        taskId: expenseForm.taskId || undefined,
        expenseDate: plan.date ? new Date(plan.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        category: expenseForm.category as any,
        subcategory: expenseForm.subcategory,
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
        receiptUrl: expenseForm.receiptUrl || undefined,
      }).unwrap();
      toast.success("Expense added to plan.");
      setShowAddExpense(false);
      setExpenseForm({ visitId: "", taskId: "", category: "travel", subcategory: "fuel", amount: "", description: "", receiptUrl: "", fileName: "" });
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to add expense.");
    }
  };

  const handleSubmitExpenseItem = (id: string) => {
    setConfirmModalConfig({
      title: "Submit Expense",
      description: "Are you sure you want to submit this expense for approval?",
      variant: "default",
      action: async () => {
        try {
          await submitExpense(id).unwrap();
          toast.success("Expense submitted for approval.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to submit expense.");
        }
      },
    });
  };

  const handleApproveExpenseItem = (id: string) => {
    setConfirmModalConfig({
      title: "Approve Expense",
      description: "Are you sure you want to approve this expense?",
      variant: "emerald",
      action: async () => {
        try {
          await approveExpense({ id }).unwrap();
          toast.success("Expense approved.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to approve expense.");
        }
      },
    });
  };

  const handleRejectExpenseConfirm = async () => {
    if (!rejectExpenseTarget) return;
    try {
      await rejectExpense({ id: rejectExpenseTarget, reason: rejectExpenseReason }).unwrap();
      toast.success("Expense rejected.");
      setRejectExpenseTarget(null);
      setRejectExpenseReason("");
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to reject expense.");
    }
  };

  const handleReimburseExpenseItem = (id: string) => {
    setConfirmModalConfig({
      title: "Mark Expense Reimbursed",
      description: "Are you sure you want to mark this expense as reimbursed?",
      variant: "emerald",
      action: async () => {
        try {
          await reimburseExpense({ id }).unwrap();
          toast.success("Expense marked as reimbursed.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to reimburse expense.");
        }
      },
    });
  };

  const handleDeleteExpenseItem = (id: string) => {
    setConfirmModalConfig({
      title: "Delete Expense",
      description: "Are you sure you want to delete this expense? This action cannot be undone.",
      variant: "destructive",
      action: async () => {
        try {
          await deleteExpense(id).unwrap();
          toast.success("Expense deleted.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to delete expense.");
        }
      },
    });
  };

  const handleSubmitAllDraftExpenses = () => {
    const draftExpenses = (plan.expenses || []).filter((e: any) => e.status === "draft");
    if (draftExpenses.length === 0) return;
    setConfirmModalConfig({
      title: "Submit All Draft Expenses",
      description: `Are you sure you want to submit all ${draftExpenses.length} draft expense(s) for approval?`,
      variant: "default",
      action: async () => {
        try {
          for (const exp of draftExpenses) {
            await submitExpense(exp._id).unwrap();
          }
          toast.success(`Submitted ${draftExpenses.length} draft expense(s) for approval.`);
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed to submit draft expenses.");
        }
      },
    });
  };

  const totalExpenseAmount = (plan.expenses || []).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
  const draftExpensesCount = (plan.expenses || []).filter((e: any) => e.status === "draft").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`${rolePrefix}/work-planner`)}
              className="gap-2 mb-1 p-0 h-auto text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Work Planner
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{plan.title || "Daily Work Plan"}</h1>
              {renderPlanTypeBadge(plan.planType)}
              {renderPlanStatusBadge(plan.status)}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatPlanDate(plan.date || plan.period.startDate)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Owner: {plan.owner?.name} ({formatRoleLabel(plan.owner?.role)})
              </span>
              {plan.approval?.approvedBy?.name && (
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Approved by: <strong>{plan.approval.approvedBy.name}</strong>
                  {plan.approval.approvedAt && (
                    <span className="text-muted-foreground font-normal ml-1">
                      ({new Date(plan.approval.approvedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Workflow Actions Header Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canModifyStructure && (
              <Button onClick={() => setShowEditPlanModal(true)} variant="outline" className="gap-1.5 font-semibold">
                <Pencil className="h-4 w-4" /> Edit Plan
              </Button>
            )}
            {isDraftOrRejected && (isOwner || String(plan.created_by?._id) === String(user?._id)) && (
              <Button onClick={handleSubmit} className="gap-2 font-bold">
                <Send className="h-4 w-4" /> {user?.role === "super_admin" ? "Submit & Approve" : "Submit Plan"}
              </Button>
            )}
            {isSubmitted && canApprove && (
              <>
                <Button onClick={handleApprove} variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold">
                  <ThumbsUp className="h-4 w-4" /> Approve Plan
                </Button>
                <Button onClick={() => setShowRejectModal(true)} variant="destructive" className="gap-1.5 font-bold">
                  <ThumbsDown className="h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {isApproved && (isOwner || isSeniorAuthority) && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCompletePlan}
                  disabled={!isPlanEligibleForCompletion}
                  className={`gap-1.5 font-bold ${
                    isPlanEligibleForCompletion
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                  title={!isPlanEligibleForCompletion ? "Complete all scheduled visits/tasks first" : "Mark work plan completed"}
                >
                  <CheckCircle2 className="h-4 w-4" /> Complete Work Plan
                </Button>
              </div>
            )}
            {!isPlanLocked && (isOwner || isSeniorAuthority) && (
              <Button onClick={handleCancelPlan} variant="outline" className="text-destructive hover:bg-red-50 gap-1.5 font-medium">
                <XCircle className="h-4 w-4" /> Cancel Plan
              </Button>
            )}
          </div>
        </div>

        {/* Submission Pending Notice Banner */}
        {isSubmitted && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="p-4 flex items-start gap-3 text-amber-900 text-sm">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Plan Submitted & Awaiting Approval</p>
                <p className="text-amber-800 text-xs">
                  This work plan is waiting for approval from your reporting authority. Visit check-ins and task status updates will activate once approved.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Ineligible Hint Banner */}
        {isApproved && !isPlanEligibleForCompletion && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-3 flex items-center justify-between gap-3 text-purple-950 text-xs font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-700 shrink-0" />
                <span>Complete all scheduled site visits and work tasks to activate the "Complete Work Plan" button.</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejection Notice */}
        {plan.status === "rejected" && plan.approval?.rejectionReason && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Plan Rejected</p>
                <p className="text-red-700 mt-0.5">{plan.approval.rejectionReason}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="items" className="gap-2">
              <ListChecks className="h-4 w-4" />
              {plan.planType === "visits" ? "Visits List" : plan.planType === "leave" ? "Leave Details" : "Work Items"}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" />
              Expenses ({plan.expenses?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* ------------------- TAB 1: VISITS / WORKS / LEAVE ------------------- */}
          <TabsContent value="items" className="space-y-6">
            {/* SITE VISITS */}
            {plan.planType === "visits" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Planned Visits</h2>
                    <p className="text-xs text-muted-foreground">Audit site & client location visits scheduled for this day</p>
                  </div>
                  {canModifyStructure && (
                    <Button onClick={() => { setEditingVisit(null); setShowVisitModal(true); }} size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" /> Add Visit
                    </Button>
                  )}
                </div>

                {(!plan.visits || plan.visits.length === 0) ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="font-medium">No visits added yet</p>
                      <p className="text-xs mt-1">Click "Add Visit" to add audit site or client visits to this plan.</p>
                      {canModifyStructure && (
                        <Button onClick={() => { setEditingVisit(null); setShowVisitModal(true); }} size="sm" variant="outline" className="mt-4 gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Add First Visit
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plan.visits.map((visit, idx) => (
                      <Card key={visit._id || idx} className="hover:shadow-sm transition-shadow">
                        <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-purple-600" />
                              {visit.facilityName || (visit.facility as any)?.name || "Site Visit"}
                            </CardTitle>
                            {visit.clientName && (
                              <CardDescription className="text-xs mt-0.5 font-medium text-slate-700">Client Rep: {visit.clientName}</CardDescription>
                            )}
                          </div>
                          {renderPlanStatusBadge(visit.status)}
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm pt-2">
                          {visit.location && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 text-slate-500" />
                              <span>{visit.location}</span>
                            </div>
                          )}
                          {(visit.clientContactNumber || visit.clientEmail) && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5 flex-wrap">
                              {visit.clientContactNumber && (
                                <a href={`tel:${visit.clientContactNumber}`} className="flex items-center gap-1 text-purple-700 hover:underline font-medium">
                                  <Phone className="h-3 w-3" /> {visit.clientContactNumber}
                                </a>
                              )}
                              {visit.clientEmail && (
                                <a href={`mailto:${visit.clientEmail}`} className="flex items-center gap-1 text-purple-700 hover:underline font-medium">
                                  <Mail className="h-3 w-3" /> {visit.clientEmail}
                                </a>
                              )}
                            </div>
                          )}
                          {visit.purpose && (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground block">Purpose:</span>
                              <p className="text-xs">{visit.purpose}</p>
                            </div>
                          )}
                          {visit.expectedOutcome && (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground block">Expected Outcome:</span>
                              <p className="text-xs">{visit.expectedOutcome}</p>
                            </div>
                          )}
                          {visit.notes && (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground block">Notes:</span>
                              <p className="text-xs text-muted-foreground italic">{visit.notes}</p>
                            </div>
                          )}

                          {(visit.checkInTime || visit.checkOutTime) && (
                            <div className="flex gap-3 pt-1.5 text-xs text-muted-foreground border-t">
                              {visit.checkInTime && (
                                <span>Check-in: <strong>{formatTime(visit.checkInTime)}</strong></span>
                              )}
                              {visit.checkOutTime && (
                                <span>Check-out: <strong>{formatTime(visit.checkOutTime)}</strong></span>
                              )}
                            </div>
                          )}

                          {/* Visit Action Controls */}
                          <div className="flex items-center gap-2 pt-2 border-t flex-wrap justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {canUpdateWorkflow && visit.status !== "completed" && visit.status !== "cancelled" && (
                                <>
                                  {!visit.checkInTime ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 gap-1 font-semibold"
                                      onClick={() => handleCheckInVisit(idx)}
                                    >
                                      <Clock className="h-3 w-3" /> Check In
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 gap-1 font-semibold"
                                      onClick={() => setCompleteVisitTarget({ index: idx, item: visit })}
                                    >
                                      <CheckCircle2 className="h-3 w-3" /> Complete Visit
                                    </Button>
                                  )}
                                </>
                              )}

                              {canUpdateWorkflow && visit.status === "completed" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs gap-1 text-primary font-medium"
                                  onClick={() => setNextVisitTarget(visit)}
                                >
                                  <CalendarPlus className="h-3 w-3" /> Schedule Next
                                </Button>
                              )}
                            </div>

                            {canModifyStructure && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Visit"
                                  onClick={() => {
                                    setEditingVisit({ index: idx, item: visit });
                                    setShowVisitModal(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  title="Delete Visit"
                                  onClick={() => handleDeleteVisit(idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WFO / WFH WORK ITEMS */}
            {["work_from_office", "work_from_home"].includes(plan.planType) && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Work Items</h2>
                    <p className="text-xs text-muted-foreground">Tasks and responsibilities planned for this workday</p>
                  </div>
                  {canModifyStructure && (
                    <Button onClick={() => { setEditingWork(null); setShowWorkModal(true); }} size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" /> Add Work Item
                    </Button>
                  )}
                </div>

                {(!plan.works || plan.works.length === 0) ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="font-medium">No work items added yet</p>
                      <p className="text-xs mt-1">Click "Add Work Item" to list reports, analysis, or tasks for today.</p>
                      {canModifyStructure && (
                        <Button onClick={() => { setEditingWork(null); setShowWorkModal(true); }} size="sm" variant="outline" className="mt-4 gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Add First Work Item
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {plan.works.map((work, idx) => (
                      <Card key={work._id || idx} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm truncate">{work.title}</h3>
                              <Badge variant="outline" className="capitalize text-[10px] px-2">
                                {work.category || "general"}
                              </Badge>
                              {!!work.estimatedHours && work.estimatedHours > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {work.estimatedHours}h
                                </span>
                              )}
                              {renderPlanStatusBadge(work.status)}
                            </div>
                            {work.description && <p className="text-xs text-muted-foreground">{work.description}</p>}
                            {work.notes && <p className="text-xs text-muted-foreground italic">Remarks: {work.notes}</p>}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {canUpdateWorkflow && work.status !== "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 gap-1 font-semibold"
                                onClick={() => setCompleteWorkTarget({ index: idx, item: work })}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
                              </Button>
                            )}
                            {canModifyStructure && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit Work Item"
                                  onClick={() => {
                                    setEditingWork({ index: idx, item: work });
                                    setShowWorkModal(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  title="Delete Work Item"
                                  onClick={() => handleDeleteWork(idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LEAVE DETAILS */}
            {plan.planType === "leave" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palmtree className="h-5 w-5 text-amber-600" /> On Leave
                  </CardTitle>
                  <CardDescription>Member is on approved or requested leave for this date.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">Leave Reason / Remarks:</span>
                    <p className="text-sm mt-0.5">{plan.leaveReason || plan.description || "No leave reason specified."}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ------------------- TAB 2: EXPENSES ------------------- */}
          <TabsContent value="expenses" className="space-y-4">
            {/* 2-Day Window Notice Banner */}
            {isSuperAdmin ? (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-3 flex items-center justify-between gap-3 text-blue-950 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>
                      <strong>Super Admin Privilege Active:</strong> You can log and manage expenses for this work plan anytime without window restrictions.
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : isExpenseWindowExpired ? (
              <Card className="border-amber-200 bg-amber-50/60">
                <CardContent className="p-3.5 flex items-center justify-between gap-3 text-amber-900 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>2-Day Expense Window Closed:</strong> Expenses for this work plan could only be logged up to 2 days after the plan date ({formatPlanDate(maxExpenseDate)}).
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : isExpenseWindowActive ? (
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="p-3 flex items-center justify-between gap-3 text-emerald-950 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>2-Day Expense Window Active:</strong> You can log expenses for this work plan until {formatPlanDate(maxExpenseDate)}.
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Plan Expenses
                  <Badge variant="secondary" className="text-xs font-semibold">
                    Total: ₹{totalExpenseAmount.toLocaleString("en-IN")}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">Expenses incurred or filed for this work plan day</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {draftExpensesCount > 0 && (isOwner || String(plan.created_by?._id) === String(user?._id)) && (
                  <Button onClick={handleSubmitAllDraftExpenses} size="sm" variant="outline" className="gap-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 font-semibold">
                    <Send className="h-3.5 w-3.5" /> Submit All Draft Expenses ({draftExpensesCount})
                  </Button>
                )}
                <Button
                  onClick={() => setShowAddExpense(true)}
                  disabled={isExpenseWindowExpired}
                  size="sm"
                  className="gap-1.5"
                  title={isExpenseWindowExpired ? "The 2-day window to log expenses has expired" : "Log a new expense for this plan"}
                >
                  <Plus className="h-4 w-4" /> Add Expense for this Plan
                </Button>
              </div>
            </div>

            {(!plan.expenses || plan.expenses.length === 0) ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <IndianRupee className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="font-medium">No expenses logged for this plan</p>
                  <p className="text-xs mt-1">Add travel, food, accommodation, or office expenses tied to this work plan.</p>
                  <Button
                    onClick={() => setShowAddExpense(true)}
                    disabled={isExpenseWindowExpired}
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Expense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {plan.expenses.map((expense: any) => (
                  <Card key={expense._id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="capitalize text-xs font-semibold">
                              {expense.category}
                            </Badge>
                            {expense.subcategory && (
                              <span className="text-xs text-muted-foreground">({expense.subcategory})</span>
                            )}
                            {renderPlanStatusBadge(expense.status)}
                          </div>
                          <p className="text-sm font-medium pt-0.5">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Logged by {expense.employeeId?.name || "Employee"} on {formatPlanDate(expense.expenseDate)}
                          </p>

                          {/* Approved by badge */}
                          {expense.status === "approved" && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md border border-emerald-200 mt-2 font-medium w-fit">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>Approved by: <strong>{expense.approval?.approvedBy?.name || "Team Leader / Super Admin"}</strong></span>
                              {expense.approval?.approvedAt && (
                                <span className="text-emerald-700 ml-1">
                                  ({new Date(expense.approval.approvedAt).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Rejection notice */}
                          {expense.status === "rejected" && (
                            <div className="flex items-start gap-1.5 text-xs text-red-800 bg-red-100/70 px-2.5 py-1.5 rounded-md border border-red-200 mt-2 w-fit">
                              <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Rejected {expense.approval?.rejectedBy?.name ? `by ${expense.approval.rejectedBy.name}` : ""}: </span>
                                <span>{expense.approval?.rejectionReason || "No reason provided."}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-bold text-foreground">
                            ₹{expense.amount?.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Approval & Workflow Action Controls */}
                      <div className="flex items-center gap-2 pt-3 border-t mt-3 justify-end flex-wrap">
                        {expense.status === "draft" && (isOwner || String(expense.employeeId?._id || expense.employeeId) === String(user?._id)) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 gap-1 font-semibold"
                            onClick={() => handleSubmitExpenseItem(expense._id)}
                          >
                            <Send className="h-3 w-3" /> Submit Expense
                          </Button>
                        )}
                        {["submitted", "under_review"].includes(expense.status) && canApproveExpense && String(expense.employeeId?._id || expense.employeeId) !== String(user?._id) && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                              onClick={() => handleApproveExpenseItem(expense._id)}
                            >
                              <ThumbsUp className="h-3 w-3" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs gap-1 font-semibold"
                              onClick={() => setRejectExpenseTarget(expense._id)}
                            >
                              <ThumbsDown className="h-3 w-3" /> Reject
                            </Button>
                          </>
                        )}
                        {expense.status === "approved" && (user?.role === "super_admin" || user?.role === "admin") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 gap-1 font-semibold"
                            onClick={() => handleReimburseExpenseItem(expense._id)}
                          >
                            <Banknote className="h-3 w-3" /> Mark Reimbursed
                          </Button>
                        )}
                        {expense.status === "draft" && (isOwner || String(expense.employeeId?._id || expense.employeeId) === String(user?._id)) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Delete Expense"
                            onClick={() => handleDeleteExpenseItem(expense._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* MODAL DIALOGS */}
        <VisitFormModal
          open={showVisitModal}
          initial={editingVisit?.item}
          onClose={() => { setShowVisitModal(false); setEditingVisit(null); }}
          onConfirm={handleSaveVisit}
        />

        <WorkFormModal
          open={showWorkModal}
          initial={editingWork?.item}
          onClose={() => { setShowWorkModal(false); setEditingWork(null); }}
          onConfirm={handleSaveWork}
        />

        <CompleteVisitModal
          open={!!completeVisitTarget}
          visit={completeVisitTarget?.item}
          onClose={() => setCompleteVisitTarget(null)}
          onConfirm={handleCompleteVisitConfirm}
        />

        <CompleteWorkModal
          open={!!completeWorkTarget}
          work={completeWorkTarget?.item}
          onClose={() => setCompleteWorkTarget(null)}
          onConfirm={handleCompleteWorkConfirm}
        />

        <RejectWorkPlanModal
          open={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleRejectConfirm}
        />

        <NextVisitPlanModal
          open={!!nextVisitTarget}
          visit={nextVisitTarget}
          onClose={() => setNextVisitTarget(null)}
          onConfirm={handleScheduleNextConfirm}
        />

        {/* Expense Rejection Modal */}
        <Dialog open={!!rejectExpenseTarget} onOpenChange={(o) => { if (!o) { setRejectExpenseTarget(null); setRejectExpenseReason(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Expense</DialogTitle>
              <DialogDescription>Please provide a reason for rejecting this expense.</DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Input
                placeholder="Reason for rejection..."
                value={rejectExpenseReason}
                onChange={(e) => setRejectExpenseReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRejectExpenseTarget(null); setRejectExpenseReason(""); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleRejectExpenseConfirm}>Reject Expense</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expense Modal */}
        <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Expense for this Plan</DialogTitle>
              <DialogDescription>
                Log an expense incurred during this work plan day ({formatPlanDate(plan.date)}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {Array.isArray(plan.visits) && plan.visits.length > 0 && (
                <div className="space-y-1">
                  <Label>Link to Site Visit (Optional)</Label>
                  <Select value={expenseForm.visitId} onValueChange={(v) => setExpenseForm((f) => ({ ...f, visitId: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site visit (optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- None --</SelectItem>
                      {plan.visits.map((v: VisitItem, i: number) => (
                        <SelectItem key={v._id || `v-${i}`} value={v._id || String(i)}>
                          {v.facilityName || v.facility?.name || v.clientName || v.purpose || `Visit #${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {Array.isArray(plan.works) && plan.works.length > 0 && (
                <div className="space-y-1">
                  <Label>Link to Work Task (Optional)</Label>
                  <Select value={expenseForm.taskId} onValueChange={(v) => setExpenseForm((f) => ({ ...f, taskId: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work task (optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- None --</SelectItem>
                      {plan.works.map((w: WorkItem, i: number) => (
                        <SelectItem key={w._id || `w-${i}`} value={w._id || String(i)}>
                          {w.title || `Task #${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="office_supplies">Office Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Subcategory (Optional)</Label>
                <Input
                  placeholder="e.g. Fuel / Auto fare / Taxi"
                  value={expenseForm.subcategory}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, subcategory: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  placeholder="e.g. Travel to client facility"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label>
                  Receipt / Document (Image or PDF) {Number(expenseForm.amount) > 500 ? <span className="text-red-500 font-bold">*</span> : <span className="text-muted-foreground font-normal">(Optional)</span>}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("File size must be under 5MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64 = reader.result as string;
                        setExpenseForm((f) => ({ ...f, receiptUrl: base64, fileName: file.name }));
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  {expenseForm.receiptUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpenseForm((f) => ({ ...f, receiptUrl: "", fileName: "" }))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {expenseForm.fileName && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Attached: {expenseForm.fileName}
                  </p>
                )}
                {Number(expenseForm.amount) > 500 && !expenseForm.receiptUrl && (
                  <p className="text-xs text-destructive font-medium">Receipt document is required for expenses over ₹500.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddExpense(false)}>Cancel</Button>
              <Button onClick={handleAddExpense} disabled={isCreatingExpense}>
                {isCreatingExpense ? "Submitting..." : "Submit Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <EditPlanModal
          open={showEditPlanModal}
          onClose={() => setShowEditPlanModal(false)}
          plan={plan}
        />

        {/* Action Confirmation Modal */}
        {confirmModalConfig && (
          <Dialog open={!!confirmModalConfig} onOpenChange={(open) => !open && setConfirmModalConfig(null)}>
            <DialogContent className="max-w-md rounded-xl p-5">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">{confirmModalConfig.title}</DialogTitle>
                <DialogDescription className="text-xs pt-1">{confirmModalConfig.description}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 pt-3">
                <Button variant="outline" size="sm" onClick={() => setConfirmModalConfig(null)} className="h-8 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant={confirmModalConfig.variant === "destructive" ? "destructive" : "default"}
                  className={`h-8 text-xs ${confirmModalConfig.variant === "emerald" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  onClick={async () => {
                    const act = confirmModalConfig.action;
                    setConfirmModalConfig(null);
                    await act();
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}

