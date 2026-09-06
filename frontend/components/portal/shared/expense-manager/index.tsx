"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Badge } from "@/components/portal/ui/badge";
import { Label } from "@/components/portal/ui/label";
import { Skeleton } from "@/components/portal/ui/skeleton";
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
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  Send,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  IndianRupee,
  PieChart,
  Settings2,
  User,
  Building2,
  Calendar,
  Layers,
  Pencil,
  Check,
  FileText,
} from "lucide-react";
import { DownloadExpensesModal } from "@/components/portal/shared/work-planner/components/DownloadExpensesModal";
import {
  useGetExpenseDashboardQuery,
  useGetExpensesQuery,
  useGetExpensePoliciesQuery,
  useCreateExpenseMutation,
  useSubmitExpenseMutation,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
  useReimburseExpenseMutation,
  useDeleteExpenseMutation,
  useCreateExpensePolicyMutation,
  useUpdateExpensePolicyMutation,
  type Expense,
  type ExpenseCategory,
  type ExpensePolicy,
} from "@/store/slices/expenseManagerApiSlice";
import { useGetWorkPlansQuery, type WorkPlan } from "@/store/slices/workPlannerApiSlice";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  reimbursed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const CATEGORIES: ExpenseCategory[] = [
  "travel", "accommodation", "food", "communication",
  "client_entertainment", "marketing", "office", "miscellaneous",
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ------------------------------------------------------------------
// Dashboard Stats
// ------------------------------------------------------------------
function ExpenseDashboardStats() {
  const { data, isLoading } = useGetExpenseDashboardQuery();

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
    </div>
  );

  const s = data?.summary || {};

  const stats = [
    { label: "Total Amount", value: formatCurrency(data?.totalAmount || 0), icon: IndianRupee, color: "text-primary" },
    { label: "Pending Approval", value: (s.submitted?.count || 0) + (s.under_review?.count || 0), icon: Clock, color: "text-blue-600" },
    { label: "Approved", value: s.approved?.count || 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "Reimbursed", value: s.reimbursed?.count || 0, icon: Banknote, color: "text-emerald-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-2.5 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
              <p className={`text-lg font-bold leading-tight mt-0.5 ${color}`}>{value}</p>
            </div>
            <div className="p-1.5 rounded-lg bg-muted/60 shrink-0">
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Create Expense Dialog
// ------------------------------------------------------------------
function CreateExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAppSelector((s) => s.auth.user);
  const [form, setForm] = useState({
    workPlanId: "",
    visitId: "",
    taskId: "",
    expenseDate: new Date().toISOString().split("T")[0],
    category: "travel" as ExpenseCategory,
    subcategory: "",
    amount: "",
    description: "",
    receiptUrl: "",
    fileName: "",
  });
  const [createExpense, { isLoading }] = useCreateExpenseMutation();
  const { data: workPlansData } = useGetWorkPlansQuery({ limit: 50 });

  const activeWorkPlans = workPlansData?.plans || [];
  const selectedPlan = activeWorkPlans.find((p: WorkPlan) => String(p._id) === String(form.workPlanId));

  const handleCreate = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Amount must be greater than 0.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (Number(form.amount) > 500 && !form.receiptUrl) {
      toast.error("Receipt document (Image or PDF) is required for expenses greater than ₹500.");
      return;
    }

    if (form.workPlanId) {
      if (selectedPlan && user?.role !== "super_admin") {
        const planDateObj = new Date(selectedPlan.date || selectedPlan.period?.startDate);
        const minDate = new Date(planDateObj); minDate.setHours(0, 0, 0, 0);
        const maxDate = new Date(planDateObj); maxDate.setDate(maxDate.getDate() + 2); maxDate.setHours(23, 59, 59, 999);
        const now = new Date();
        if (now > maxDate) {
          toast.error("The 2-day window to log expenses for this work plan has expired.");
          return;
        }
        const expD = new Date(form.expenseDate);
        if (expD < minDate || expD > maxDate) {
          toast.error("Expense date must fall on the work plan day or within 2 days after.");
          return;
        }
      }
    }

    try {
      await createExpense({
        workPlanId: form.workPlanId || undefined,
        visitId: form.visitId || undefined,
        taskId: form.taskId || undefined,
        expenseDate: form.expenseDate,
        category: form.category,
        subcategory: form.subcategory || undefined,
        amount: Number(form.amount),
        description: form.description,
        receiptUrl: form.receiptUrl || undefined,
      }).unwrap();
      toast.success("Expense created.");
      onClose();
      setForm({ workPlanId: "", visitId: "", taskId: "", expenseDate: new Date().toISOString().split("T")[0], category: "travel", subcategory: "", amount: "", description: "", receiptUrl: "", fileName: "" });
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to create expense.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Record a new expense for approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="exp-workplan">Link to Work Plan (Optional)</Label>
            <Select value={form.workPlanId} onValueChange={(v) => {
              const planObj = activeWorkPlans.find((p: WorkPlan) => String(p._id) === String(v));
              const pDate = planObj?.date ? new Date(planObj.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
              setForm((f) => ({ ...f, workPlanId: v === "none" ? "" : v, visitId: "", taskId: "", expenseDate: pDate }));
            }}>
              <SelectTrigger id="exp-workplan">
                <SelectValue placeholder="Select a work plan (optional)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- None --</SelectItem>
                {activeWorkPlans.map((p: WorkPlan) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.title} ({new Date(p.date || p.period?.startDate).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.workPlanId && selectedPlan?.visits && selectedPlan.visits.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="exp-visit">Link to Site Visit (Optional)</Label>
              <Select value={form.visitId} onValueChange={(v) => setForm((f) => ({ ...f, visitId: v === "none" ? "" : v }))}>
                <SelectTrigger id="exp-visit">
                  <SelectValue placeholder="Select site visit (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- None --</SelectItem>
                  {selectedPlan.visits.map((v, i) => (
                    <SelectItem key={v._id || `visit-${i}`} value={v._id || String(i)}>
                      {v.facilityName || v.facility?.name || v.clientName || v.purpose || `Visit #${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.workPlanId && selectedPlan?.works && selectedPlan.works.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="exp-task">Link to Work Task (Optional)</Label>
              <Select value={form.taskId} onValueChange={(v) => setForm((f) => ({ ...f, taskId: v === "none" ? "" : v }))}>
                <SelectTrigger id="exp-task">
                  <SelectValue placeholder="Select work task (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- None --</SelectItem>
                  {selectedPlan.works.map((w, i) => (
                    <SelectItem key={w._id || `work-${i}`} value={w._id || String(i)}>
                      {w.title || `Task #${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="exp-date">Expense Date</Label>
            <Input id="exp-date" type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-sub">Subcategory</Label>
              <Input id="exp-sub" placeholder="e.g. fuel, cab..." value={form.subcategory} onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-amount">Amount (₹)</Label>
            <Input id="exp-amount" type="number" min="1" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Description</Label>
            <Input id="exp-desc" placeholder="What was this expense for?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-receipt">
              Receipt / Document (Image or PDF) {Number(form.amount) > 500 ? <span className="text-red-500 font-bold">*</span> : <span className="text-muted-foreground font-normal">(Optional)</span>}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="exp-receipt"
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
                    setForm((f) => ({ ...f, receiptUrl: base64, fileName: file.name }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {form.receiptUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, receiptUrl: "", fileName: "" }))}
                >
                  Remove
                </Button>
              )}
            </div>
            {form.fileName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <FileText className="h-3.5 w-3.5 text-primary" /> Attached: {form.fileName}
              </p>
            )}
            {Number(form.amount) > 500 && !form.receiptUrl && (
              <p className="text-xs text-destructive font-medium">Receipt document is required for expenses over ₹500.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// Expenses List
// ------------------------------------------------------------------
function ExpensesTab() {
  const user = useAppSelector((s) => s.auth.user);
  const [tabView, setTabView] = useState<"today" | "my" | "all" | "team" | "approvals">("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [hiddenExpenseIds, setHiddenExpenseIds] = useState<string[]>([]);

  const isSenior = user?.role === "super_admin" || user?.role === "admin" || user?.role === "manager";

  const { data: pendingApprovalsData } = useGetExpensesQuery(
    { tab: "approvals", limit: 1 },
    { skip: !isSenior || tabView === "approvals" }
  );

  const { data, isLoading } = useGetExpensesQuery({
    tab: tabView,
    status: tabView === "approvals" ? undefined : (statusFilter !== "all" ? statusFilter : undefined),
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    page,
    limit: 15,
  });

  const rawPending = tabView === "approvals" ? (data?.total || 0) : (pendingApprovalsData?.total || 0);
  const pendingCount = Math.max(0, rawPending - (tabView === "approvals" ? hiddenExpenseIds.length : 0));

  const [showReportModal, setShowReportModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
    variant?: "default" | "destructive" | "emerald";
  } | null>(null);

  const [submit] = useSubmitExpenseMutation();
  const [approve] = useApproveExpenseMutation();
  const [reject] = useRejectExpenseMutation();
  const [reimburse] = useReimburseExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const canApprove = user?.role === "admin" || user?.role === "super_admin" || user?.role === "manager";
  const canReimburse = user?.role === "admin" || user?.role === "super_admin";

  const handleSubmit = (id: string) => {
    setConfirmModal({
      title: "Submit Expense",
      description: "Are you sure you want to submit this expense for approval?",
      variant: "default",
      action: async () => {
        try {
          await submit(id).unwrap();
          toast.success("Expense submitted.");
        } catch (e: any) {
          toast.error(e?.data?.message || "Failed.");
        }
      },
    });
  };

  const handleApprove = (id: string) => {
    setConfirmModal({
      title: "Approve Expense",
      description: "Are you sure you want to approve this expense?",
      variant: "emerald",
      action: async () => {
        setHiddenExpenseIds((prev) => [...prev, id]);
        try {
          await approve({ id }).unwrap();
          toast.success("Expense approved.");
        } catch (e: any) {
          setHiddenExpenseIds((prev) => prev.filter((i) => i !== id));
          toast.error(e?.data?.message || "Failed.");
        }
      },
    });
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const targetId = rejectTarget;
    setHiddenExpenseIds((prev) => [...prev, targetId]);
    try {
      await reject({ id: targetId, reason: rejectReason }).unwrap();
      toast.success("Expense rejected.");
      setRejectTarget(null);
      setRejectReason("");
    } catch (e: any) {
      setHiddenExpenseIds((prev) => prev.filter((i) => i !== targetId));
      toast.error(e?.data?.message || "Failed.");
    }
  };

  const handleReimburse = (id: string) => {
    setConfirmModal({
      title: "Mark Reimbursed",
      description: "Are you sure you want to mark this expense as reimbursed?",
      variant: "emerald",
      action: async () => {
        setHiddenExpenseIds((prev) => [...prev, id]);
        try {
          await reimburse({ id }).unwrap();
          toast.success("Marked as reimbursed.");
        } catch (e: any) {
          setHiddenExpenseIds((prev) => prev.filter((i) => i !== id));
          toast.error(e?.data?.message || "Failed.");
        }
      },
    });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      title: "Delete Expense",
      description: "Are you sure you want to delete this expense? This action cannot be undone.",
      variant: "destructive",
      action: async () => {
        setHiddenExpenseIds((prev) => [...prev, id]);
        try {
          await deleteExpense(id).unwrap();
          toast.success("Expense deleted.");
        } catch (e: any) {
          setHiddenExpenseIds((prev) => prev.filter((i) => i !== id));
          toast.error(e?.data?.message || "Failed.");
        }
      },
    });
  };

  const changeTab = (newTab: "today" | "my" | "all" | "team" | "approvals") => {
    setTabView(newTab);
    setHiddenExpenseIds([]);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      {/* Sub-Tabs: Today's Expenses | My Expenses | All Expenses | Team Expenses | Pending Approvals */}
      <div className="flex items-center gap-2 border-b pb-2 flex-wrap">
        <Button
          variant={tabView === "today" ? "default" : "ghost"}
          size="sm"
          onClick={() => changeTab("today")}
          className="gap-1.5 font-semibold text-xs h-7 px-2.5"
        >
          <Calendar className="h-3.5 w-3.5" /> Today's Expenses
        </Button>
        <Button
          variant={tabView === "my" ? "default" : "ghost"}
          size="sm"
          onClick={() => changeTab("my")}
          className="gap-1.5 font-semibold text-xs h-7 px-2.5"
        >
          <User className="h-3.5 w-3.5" /> My Expenses
        </Button>
        <Button
          variant={tabView === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => changeTab("all")}
          className="gap-1.5 font-semibold text-xs h-7 px-2.5"
        >
          <Layers className="h-3.5 w-3.5" /> All Expenses
        </Button>
        {isSenior && (
          <>
            <Button
              variant={tabView === "team" ? "default" : "ghost"}
              size="sm"
              onClick={() => changeTab("team")}
              className="gap-1.5 font-semibold text-xs h-7 px-2.5"
            >
              <Building2 className="h-3.5 w-3.5" /> Team Expenses
            </Button>
            <Button
              variant={tabView === "approvals" ? "default" : "ghost"}
              size="sm"
              onClick={() => changeTab("approvals")}
              className={`gap-1.5 font-semibold text-xs h-7 px-2.5 relative ${
                pendingCount > 0 && tabView !== "approvals" ? "text-amber-700 bg-amber-50 hover:bg-amber-100" : ""
              }`}
            >
              <Clock className="h-3.5 w-3.5" /> Pending Approvals
              {pendingCount > 0 && (
                <Badge className="ml-1 px-1.5 py-0 text-[10px] bg-amber-600 text-white font-bold rounded-full">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabView !== "approvals" && (
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["draft", "submitted", "under_review", "approved", "rejected", "reimbursed"].map((s) => (
                  <SelectItem key={s} value={s}>{s.replace("_", " ").charAt(0).toUpperCase() + s.replace("_", " ").slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 items-center">
          <Button onClick={() => setShowReportModal(true)} variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <FileText className="h-3.5 w-3.5 text-primary" /> Expense Report
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Add Expense
          </Button>
        </div>
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
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Amount & Category</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Description</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Logged By & Date</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(() => {
                const expensesList = data?.expenses || [];
                const displayedExpenses = expensesList.filter((e: Expense) => {
                  if (hiddenExpenseIds.includes(e._id)) return false;
                  if (tabView === "approvals") {
                    return ["submitted", "under_review"].includes(e.status);
                  }
                  return true;
                });

                if (displayedExpenses.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        <Receipt className="h-7 w-7 mx-auto mb-1.5 opacity-40" />
                        {tabView === "approvals" ? "No pending approvals found." : "No expenses found."}
                      </td>
                    </tr>
                  );
                }

                return displayedExpenses.map((expense: Expense) => {
                  const empIdStr = typeof expense.employeeId === "object" ? expense.employeeId?._id : expense.employeeId;
                  const isOwnExpense = String(empIdStr) === String(user?._id);
                  const canApproveRow = ["submitted", "under_review"].includes(expense.status) && canApprove && !isOwnExpense;

                  return (
                    <tr key={expense._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm">{formatCurrency(expense.amount)}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{formatCategory(expense.category)}</Badge>
                        </div>
                      </td>
                      <td className="px-3 py-2 max-w-[200px] truncate">
                        <span title={expense.description}>{expense.description}</span>
                        {expense.approval?.rejectionReason && (
                          <p className="text-[10px] text-destructive mt-0.5 truncate">Reason: {expense.approval.rejectionReason}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">
                        <span>{expense.employeeId?.name || "Employee"}</span>
                        <span className="text-[11px] block text-muted-foreground/80">{new Date(expense.expenseDate).toLocaleDateString()}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[expense.status] || ""}`} variant="outline">
                            {expense.status.replace("_", " ")}
                          </Badge>

                          {expense.status === "approved" && (
                            <Badge variant="outline" className="border-emerald-600/30 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40 text-[10px] px-1.5 py-0 font-normal">
                              Approved by: {expense.approval?.approvedBy?.name || "Team Lead"}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {/* Direct Action Buttons */}
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {expense.status === "draft" && isOwnExpense && (
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1 text-[11px] h-6 px-1.5"
                              onClick={() => handleSubmit(expense._id)}
                            >
                              <Send className="h-3 w-3" /> Submit
                            </Button>
                          )}

                          {canApproveRow && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] h-6 px-1.5"
                                onClick={() => handleApprove(expense._id)}
                              >
                                <ThumbsUp className="h-3 w-3" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1 text-[11px] h-6 px-1.5"
                                onClick={() => setRejectTarget(expense._id)}
                              >
                                <ThumbsDown className="h-3 w-3" /> Reject
                              </Button>
                            </>
                          )}

                          {expense.status === "approved" && canReimburse && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1 text-[11px] h-6 px-1.5"
                              onClick={() => handleReimburse(expense._id)}
                            >
                              <Banknote className="h-3 w-3" /> Reimburse
                            </Button>
                          )}

                          {expense.status === "draft" && isOwnExpense && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1 text-[11px] h-6 px-1.5"
                              onClick={() => handleDelete(expense._id)}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <p className="text-muted-foreground">
            Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, data.total)} of <strong>{data.total}</strong> expenses
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

      <CreateExpenseDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <DownloadExpensesModal open={showReportModal} onClose={() => setShowReportModal(false)} />

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

      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>Provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Rejection reason..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------
// Elaborate Policy Editor Modal & Settings Tab (super_admin only)
// ------------------------------------------------------------------
interface PolicyFormRule {
  maxAmount: number | null;
  approverRole: "manager" | "admin" | "super_admin";
  approvalLevel: number;
  label: string;
}

const DEFAULT_POLICY_RULES: PolicyFormRule[] = [
  { maxAmount: 2000, approverRole: "manager", approvalLevel: 1, label: "Manager Approval" },
  { maxAmount: 10000, approverRole: "admin", approvalLevel: 2, label: "Admin Approval" },
  { maxAmount: null, approverRole: "super_admin", approvalLevel: 3, label: "Super Admin Approval" },
];

function PolicyEditorModal({
  open,
  onClose,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  initialData: ExpensePolicy | null;
}) {
  const [createPolicy, { isLoading: isCreating }] = useCreateExpensePolicyMutation();
  const [updatePolicy, { isLoading: isUpdating }] = useUpdateExpensePolicyMutation();

  const [form, setForm] = useState({
    name: "",
    description: "",
    isDefault: false,
    isActive: true,
    rules: DEFAULT_POLICY_RULES,
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        description: initialData.description || "",
        isDefault: !!initialData.isDefault,
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
        rules: initialData.rules?.length
          ? initialData.rules.map((r) => ({
              maxAmount: r.maxAmount,
              approverRole: r.approverRole,
              approvalLevel: r.approvalLevel || 1,
              label: r.label || "",
            }))
          : DEFAULT_POLICY_RULES,
      });
    } else {
      setForm({
        name: "",
        description: "",
        isDefault: false,
        isActive: true,
        rules: DEFAULT_POLICY_RULES,
      });
    }
  }, [initialData, open]);

  const handleAddRule = () => {
    setForm((f) => ({
      ...f,
      rules: [
        ...f.rules,
        {
          maxAmount: 5000,
          approverRole: "manager",
          approvalLevel: f.rules.length + 1,
          label: `Level ${f.rules.length + 1} Approval`,
        },
      ],
    }));
  };

  const handleRemoveRule = (index: number) => {
    if (form.rules.length <= 1) {
      toast.error("Policy must have at least one rule.");
      return;
    }
    setForm((f) => ({
      ...f,
      rules: f.rules.filter((_, i) => i !== index),
    }));
  };

  const handleRuleChange = (index: number, key: keyof PolicyFormRule, value: any) => {
    setForm((f) => {
      const nextRules = [...f.rules];
      nextRules[index] = { ...nextRules[index], [key]: value };
      return { ...f, rules: nextRules };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Policy name is required.");
      return;
    }
    if (!form.rules.length) {
      toast.error("At least one rule is required.");
      return;
    }

    try {
      if (initialData) {
        await updatePolicy({
          id: initialData._id,
          name: form.name,
          description: form.description,
          isDefault: form.isDefault,
          isActive: form.isActive,
          rules: form.rules,
        }).unwrap();
        toast.success("Expense policy updated.");
      } else {
        await createPolicy({
          name: form.name,
          description: form.description,
          isDefault: form.isDefault,
          isActive: form.isActive,
          rules: form.rules,
        }).unwrap();
        toast.success("Expense policy created.");
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to save policy.");
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Expense Policy" : "Create Expense Policy"}</DialogTitle>
          <DialogDescription>
            Configure policy parameters, active status, default settings, and approval threshold rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* General Policy Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="policy-name">Policy Name *</Label>
              <Input
                id="policy-name"
                className="h-8 text-xs"
                placeholder="e.g. Standard Corporate Expense Policy"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="policy-desc">Description</Label>
              <Input
                id="policy-desc"
                className="h-8 text-xs"
                placeholder="Brief summary of policy applicability..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="policy-isdefault"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="policy-isdefault" className="cursor-pointer text-xs font-semibold">
                Set as Default System Policy
              </Label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="policy-isactive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="policy-isactive" className="cursor-pointer text-xs font-semibold">
                Active Policy Status
              </Label>
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Approval Threshold Rules</h4>
                <p className="text-[11px] text-muted-foreground">Rules evaluate sequentially by maximum amount threshold.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRule} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Rule
              </Button>
            </div>

            <div className="space-y-2.5">
              {form.rules.map((rule, index) => (
                <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary">Rule #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRule(index)}
                      className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Rule Label</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. Tier 1"
                        value={rule.label}
                        onChange={(e) => handleRuleChange(index, "label", e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Max Amount (₹)</Label>
                      <div className="space-y-1">
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          placeholder="No upper limit"
                          disabled={rule.maxAmount === null}
                          value={rule.maxAmount === null ? "" : rule.maxAmount}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              "maxAmount",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            id={`nolimit-${index}`}
                            checked={rule.maxAmount === null}
                            onChange={(e) =>
                              handleRuleChange(index, "maxAmount", e.target.checked ? null : 5000)
                            }
                            className="h-3 w-3"
                          />
                          <label htmlFor={`nolimit-${index}`} className="text-[10px] text-muted-foreground cursor-pointer">
                            Above all / No limit
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Approver Role</Label>
                      <Select
                        value={rule.approverRole}
                        onValueChange={(v) => handleRuleChange(index, "approverRole", v as any)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Approval Level</Label>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        min="1"
                        value={rule.approvalLevel}
                        onChange={(e) => handleRuleChange(index, "approvalLevel", Number(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="h-8 text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="h-8 text-xs">
            {isLoading ? "Saving..." : initialData ? "Update Policy" : "Create Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicyTab() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: policies, isLoading } = useGetExpensePoliciesQuery();
  const [updatePolicy] = useUpdateExpensePolicyMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ExpensePolicy | null>(null);

  const canManage = user?.role === "super_admin";

  const handleOpenCreate = () => {
    setEditingPolicy(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ExpensePolicy) => {
    setEditingPolicy(p);
    setModalOpen(true);
  };

  const handleToggleDefault = async (p: ExpensePolicy) => {
    try {
      await updatePolicy({ id: p._id, isDefault: true }).unwrap();
      toast.success(`"${p.name}" set as default policy.`);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to set default.");
    }
  };

  const handleToggleActive = async (p: ExpensePolicy) => {
    try {
      await updatePolicy({ id: p._id, isActive: !p.isActive }).unwrap();
      toast.success(`Policy status updated.`);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to update status.");
    }
  };

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Expense Approval Policies</h3>
            <p className="text-xs text-muted-foreground">Super Admin control over thresholds, approver roles, and policy rules.</p>
          </div>
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Add Policy
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {(policies || []).map((p: ExpensePolicy) => (
          <Card key={p._id} className="border shadow-2xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
                  {p.isDefault ? (
                    <Badge className="text-[10px] bg-primary text-primary-foreground">Default System Policy</Badge>
                  ) : (
                    canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                        onClick={() => handleToggleDefault(p)}
                      >
                        Set as Default
                      </Button>
                    )
                  )}

                  <Badge variant={p.isActive ? "outline" : "destructive"} className="text-[10px]">
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(p)}
                      className="h-7 text-xs px-2"
                    >
                      {p.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenEdit(p)}
                      className="h-7 text-xs gap-1 px-2.5"
                    >
                      <Pencil className="h-3 w-3" /> Edit Policy
                    </Button>
                  </div>
                )}
              </div>
              {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Approval Rules ({p.rules?.length || 0})</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {p.rules.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-muted/40 rounded-md border border-border/50 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary text-[11px]">Level {rule.approvalLevel}</span>
                        {rule.label && <span className="font-medium text-foreground">· {rule.label}</span>}
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>
                          Threshold: <strong>{rule.maxAmount !== null ? `Up to ${formatCurrency(rule.maxAmount)}` : "Above all (No limit)"}</strong>
                        </span>
                        <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                          → {rule.approverRole.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!policies?.length && (
          <div className="py-12 text-center text-muted-foreground text-xs">
            <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No expense policies configured. Click "Add Policy" to define approval thresholds.
          </div>
        )}
      </div>

      <PolicyEditorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingPolicy}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
export default function ExpenseManagerPage() {
  const user = useAppSelector((s) => s.auth.user);
  const canSeePolicy = user?.role === "super_admin";
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <DashboardLayout title="Expense Manager" subtitle="Track, approve, and reimburse expenses">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Expense Manager</h1>
              <p className="text-sm text-muted-foreground">Manage expenses and reimbursements</p>
            </div>
          </div>
          <Button onClick={() => setShowReportModal(true)} variant="outline" size="sm" className="gap-2 text-xs h-9 font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Expense Report
          </Button>
        </div>

        <Tabs defaultValue="expenses">
          <TabsList>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" /> Expenses
            </TabsTrigger>
            {canSeePolicy && (
              <TabsTrigger value="policy" className="gap-2">
                <Settings2 className="h-4 w-4" /> Approval Policy
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="expenses" className="mt-4">
            <ExpensesTab />
          </TabsContent>
          {canSeePolicy && (
            <TabsContent value="policy" className="mt-4">
              <PolicyTab />
            </TabsContent>
          )}
        </Tabs>

        <DownloadExpensesModal open={showReportModal} onClose={() => setShowReportModal(false)} />
      </div>
    </DashboardLayout>
  );
}
