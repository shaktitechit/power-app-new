"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/portal/ui/dialog";
import { Button } from "@/components/portal/ui/button";
import { Label } from "@/components/portal/ui/label";
import { Input } from "@/components/portal/ui/input";
import { Badge } from "@/components/portal/ui/badge";
import { Card, CardContent } from "@/components/portal/ui/card";
import { Skeleton } from "@/components/portal/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { Download, Receipt, CheckCircle2, Clock, Search, IndianRupee, CreditCard, Users, User, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { useGetExpensesQuery, type Expense } from "@/store/slices/expenseManagerApiSlice";
import { useGetOrgHierarchyQuery, type OrgNode } from "@/store/slices/teamManagerApiSlice";
import { useGetDefaultCompanyQuery } from "@/store/slices/companyApiSlice";
import { useAppSelector } from "@/store/hooks";
import { formatPlanDate } from "../workPlanUtils";
import { buildExpenseReportPdfBlob, expenseReportPdfFilename } from "@/components/portal/lib/expenseReportPdf";
import { PdfPreviewModal } from "./PdfPreviewModal";

export interface DownloadExpensesModalProps {
  open: boolean;
  onClose: () => void;
}

interface FlattenedMember {
  _id: string;
  name: string;
  role: string;
  email: string;
  teamId?: string;
}

function getMemberIdsFromNode(node: OrgNode): string[] {
  let ids: string[] = [String(node._id)];
  if (node.lead?._id) ids.push(String(node.lead._id));
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      ids = ids.concat(getMemberIdsFromNode(child));
    });
  }
  return Array.from(new Set(ids));
}

function extractMembersWithTeam(nodes: OrgNode[]): FlattenedMember[] {
  const map = new Map<string, FlattenedMember>();

  function traverse(node: OrgNode, currentTeamId?: string) {
    const teamId = node.teamId || currentTeamId;

    if (node._id) {
      if (!map.has(String(node._id))) {
        map.set(String(node._id), {
          _id: String(node._id),
          name: node.name,
          role: node.role || "",
          email: node.email || "",
          teamId,
        });
      }
    }
    if (node.lead && node.lead._id) {
      const leadId = String(node.lead._id);
      if (!map.has(leadId)) {
        map.set(leadId, {
          _id: leadId,
          name: node.lead.name,
          role: node.lead.role || "",
          email: node.lead.email || "",
          teamId,
        });
      }
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach((c) => traverse(c, teamId));
    }
  }

  (nodes || []).forEach((n) => traverse(n, n.teamId || n._id));
  return Array.from(map.values());
}

export function DownloadExpensesModal({ open, onClose }: DownloadExpensesModalProps) {
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const { data: orgNodes } = useGetOrgHierarchyQuery(undefined, { skip: !open });
  const { data: companyRes } = useGetDefaultCompanyQuery(undefined, { skip: !open });
  const defaultCompany = companyRes?.data;

  const { data, isLoading } = useGetExpensesQuery(
    {
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      limit: 300,
    },
    { skip: !open }
  );

  const allExpenses = data?.expenses || [];

  // Team scope user IDs map
  const teamMemberMap = useMemo(() => {
    const map = new Map<string, string[]>();
    (orgNodes || []).forEach((node) => {
      const nodeKey = node.teamId || node._id;
      map.set(nodeKey, getMemberIdsFromNode(node));
    });
    return map;
  }, [orgNodes]);

  // All accessible members in hierarchy scope + expense employees
  const allMembers = useMemo(() => {
    const list = extractMembersWithTeam(orgNodes || []);

    allExpenses.forEach((e: Expense) => {
      if (e.employeeId && e.employeeId._id) {
        const eId = String(e.employeeId._id);
        if (!list.some((m) => String(m._id) === eId)) {
          list.push({
            _id: eId,
            name: e.employeeId.name,
            role: e.employeeId.role || "",
            email: e.employeeId.email || "",
          });
        }
      }
    });

    if (user?._id) {
      const userStr = String(user._id);
      const existingIdx = list.findIndex((m) => String(m._id) === userStr);
      if (existingIdx !== -1) {
        list[existingIdx].name = `${user.name} (Myself)`;
      } else {
        list.unshift({
          _id: userStr,
          name: `${user.name} (Myself)`,
          role: user.role || "",
          email: user.email || "",
        });
      }
    }
    return list;
  }, [orgNodes, allExpenses, user]);

  const scopedMembers = useMemo(() => {
    if (teamFilter === "all") return allMembers;
    const allowedMemberIds = teamMemberMap.get(teamFilter) || [];
    return allMembers.filter((m) => allowedMemberIds.includes(String(m._id)));
  }, [allMembers, teamFilter, teamMemberMap]);

  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((e: Expense) => {
      const empId = String(e.employeeId?._id || "");

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empName = (e.employeeId?.name || "").toLowerCase();
        const desc = (e.description || "").toLowerCase();
        const cat = (e.category || "").toLowerCase();
        const subcat = (e.subcategory || "").toLowerCase();
        if (!empName.includes(q) && !desc.includes(q) && !cat.includes(q) && !subcat.includes(q)) {
          return false;
        }
      }

      if (teamFilter !== "all") {
        const allowedMemberIds = teamMemberMap.get(teamFilter) || [];
        if (!allowedMemberIds.includes(empId)) return false;
      }

      if (memberFilter !== "all") {
        if (empId !== String(memberFilter)) return false;
      }

      if (dateFrom) {
        const eDate = new Date(e.expenseDate);
        if (eDate < new Date(dateFrom)) return false;
      }

      if (dateTo) {
        const eDate = new Date(e.expenseDate);
        const endD = new Date(dateTo);
        endD.setHours(23, 59, 59, 999);
        if (eDate > endD) return false;
      }
      return true;
    });
  }, [allExpenses, searchQuery, teamFilter, teamMemberMap, memberFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    let totalAmount = 0;
    let approvedAmount = 0;
    let pendingCount = 0;
    let approvedCount = 0;

    filteredExpenses.forEach((e: Expense) => {
      const amt = Number(e.amount) || 0;
      totalAmount += amt;
      if (e.status === "approved" || e.status === "reimbursed") {
        approvedAmount += amt;
        approvedCount++;
      } else if (["submitted", "under_review"].includes(e.status)) {
        pendingCount++;
      }
    });

    return {
      totalCount: filteredExpenses.length,
      totalAmount,
      approvedAmount,
      approvedCount,
      pendingCount,
    };
  }, [filteredExpenses]);

  const renderExpenseStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Approved</Badge>;
      case "reimbursed":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Reimbursed</Badge>;
      case "submitted":
      case "under_review":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Pending Review</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "draft":
        return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handlePreviewPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      if (filteredExpenses.length === 0) {
        toast.error("No expenses found for the selected criteria.");
        setIsGeneratingPdf(false);
        return;
      }

      const teamObj = (orgNodes || []).find((n) => (n.teamId || n._id) === teamFilter);
      const teamFilterLabel =
        teamFilter === "all"
          ? isSuperAdmin
            ? "All Teams"
            : "All Accessible Teams"
          : teamObj?.name || teamObj?.lead?.name || "Selected Team";

      const memberObj = scopedMembers.find((m) => m._id === memberFilter);
      const memberFilterLabel =
        memberFilter === "all"
          ? teamFilter === "all"
            ? "All Members"
            : "All Team Members"
          : memberObj?.name || "Selected Member";

      const statusFilterLabel =
        statusFilter === "all" ? "All Statuses" : statusFilter.replace(/_/g, " ").toUpperCase();

      const categoryFilterLabel =
        categoryFilter === "all" ? "All Categories" : categoryFilter.replace(/_/g, " ").toUpperCase();

      const generatedBy = user?.name
        ? `${user.name} (${(user.role || "").replace(/_/g, " ")})`
        : "Authorized Staff";

      const blob = await buildExpenseReportPdfBlob({
        expenses: filteredExpenses,
        company: defaultCompany,
        dateFrom,
        dateTo,
        teamFilterLabel,
        memberFilterLabel,
        statusFilterLabel,
        categoryFilterLabel,
        generatedBy,
      });
      setPdfPreviewBlob(blob);
      setShowPdfPreview(true);
    } catch (err: any) {
      console.error("PDF generation failed", err);
      toast.error("Failed to generate expense PDF report: " + (err.message || "Unknown error"));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (filteredExpenses.length === 0) {
        toast.error("No expenses found for the selected criteria.");
        setIsExporting(false);
        return;
      }

      const headers = [
        "Employee",
        "Role",
        "Date",
        "Category",
        "Subcategory",
        "Amount (₹)",
        "Description",
        "Status",
        "Approved By",
        "Approved At / Rejection Reason",
      ];
      const rows = filteredExpenses.map((e: Expense) => {
        const approvedBy = e.approval?.approvedBy?.name || (e.approval?.rejectedBy?.name ? `Rejected by ${e.approval.rejectedBy.name}` : "Pending");
        const approvedAtOrReason = e.approval?.approvedAt
          ? formatPlanDate(e.approval.approvedAt)
          : e.approval?.rejectionReason || "";

        return [
          `"${(e.employeeId?.name || "").replace(/"/g, '""')}"`,
          `"${(e.employeeId?.role || "").replace(/"/g, '""')}"`,
          `"${formatPlanDate(e.expenseDate)}"`,
          `"${e.category}"`,
          `"${e.subcategory || ""}"`,
          e.amount,
          `"${(e.description || "").replace(/"/g, '""')}"`,
          `"${e.status}"`,
          `"${approvedBy.replace(/"/g, '""')}"`,
          `"${approvedAtOrReason.replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Work_Planner_Expenses_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Expenses report exported successfully.");
    } catch (err: any) {
      toast.error("Failed to export expenses report.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isExporting && onClose()}>
      <DialogContent fullscreen className="p-4 sm:p-6 flex flex-col gap-0 overflow-hidden bg-background">
        <DialogHeader className="pb-3 border-b shrink-0 flex flex-row items-center justify-between gap-4 pr-10">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Expense Report
            </DialogTitle>
            <DialogDescription className="text-xs">
              Detailed claim and reimbursement report for work plan expenses, team scope, individual members, and approval history.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handlePreviewPdf} disabled={isGeneratingPdf} size="sm" className="gap-1.5 text-xs h-8">
              <Eye className="h-3.5 w-3.5" />
              {isGeneratingPdf ? "Generating PDF..." : "Preview PDF"}
            </Button>
            <Button onClick={handleDownload} disabled={isExporting} variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Download className="h-3.5 w-3.5" />
              {isExporting ? "Exporting..." : "CSV"}
            </Button>
          </div>
        </DialogHeader>

        {/* Toolbar Filters */}
        <div className="py-3 flex flex-col sm:flex-row gap-2.5 justify-between border-b shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search emp/category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Team Scope Filter */}
            <Select value={teamFilter} onValueChange={(v) => { setTeamFilter(v); setMemberFilter("all"); }}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <Users className="h-3.5 w-3.5 text-muted-foreground mr-1 shrink-0" />
                <SelectValue placeholder="Team Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {isSuperAdmin ? "All Teams (Super Admin)" : "All Accessible Teams"}
                </SelectItem>
                {(orgNodes || []).map((node) => (
                  <SelectItem key={node.teamId || node._id} value={node.teamId || node._id}>
                    {node.name || node.lead?.name || "Team"} Scope
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Individual Member Scope Filter */}
            <Select value={memberFilter} onValueChange={setMemberFilter}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <User className="h-3.5 w-3.5 text-muted-foreground mr-1 shrink-0" />
                <SelectValue placeholder="Member / Self" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {teamFilter === "all" ? "All Members (Organization)" : "All Members in Team"}
                </SelectItem>
                {scopedMembers.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name} {m.role ? `(${m.role.replace("_", " ")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="accommodation">Accommodation</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="client_entertainment">Client Entertainment</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="office">Office Supplies</SelectItem>
                <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted / Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="reimbursed">Reimbursed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">From:</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs w-32"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">To:</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-xs w-32"
              />
            </div>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 py-3 shrink-0">
          <Card className="border shadow-2xs">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Total Claims</p>
                <p className="text-lg font-bold text-foreground leading-tight mt-0.5">{summary.totalCount}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-muted shrink-0">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-2xs">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Total Amount</p>
                <p className="text-lg font-bold text-blue-600 leading-tight mt-0.5">₹{summary.totalAmount.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-50 shrink-0">
                <IndianRupee className="h-4 w-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-2xs">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Approved Amount</p>
                <p className="text-lg font-bold text-green-600 leading-tight mt-0.5">₹{summary.approvedAmount.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-green-50 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-2xs">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Pending Review</p>
                <p className="text-lg font-bold text-amber-600 leading-tight mt-0.5">{summary.pendingCount}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50 shrink-0">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabular List */}
        <div className="flex-1 overflow-auto rounded-lg border bg-card shadow-2xs min-h-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Employee</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Category & Subcategory</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Description</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Approved By</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.map((exp: Expense) => (
                  <tr key={exp._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-medium">
                      <span>{exp.employeeId?.name || "Employee"}</span>
                      <span className="text-[10px] text-muted-foreground block capitalize">{exp.employeeId?.role?.replace("_", " ")}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatPlanDate(exp.expenseDate)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-semibold capitalize text-foreground">{exp.category?.replace("_", " ")}</span>
                      {exp.subcategory && (
                        <span className="text-muted-foreground block text-[10px]">{exp.subcategory}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold text-foreground">
                      ₹{exp.amount?.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate" title={exp.description}>
                      {exp.description || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {exp.approval?.approvedBy?.name ? (
                        <div>
                          <span className="font-medium text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {exp.approval.approvedBy.name}
                          </span>
                          {exp.approval.approvedAt && (
                            <span className="text-[10px] text-muted-foreground block">
                              {formatPlanDate(exp.approval.approvedAt)}
                            </span>
                          )}
                        </div>
                      ) : exp.approval?.rejectedBy?.name ? (
                        <div>
                          <span className="font-medium text-destructive flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Rejected by {exp.approval.rejectedBy.name}
                          </span>
                          {exp.approval?.rejectionReason && (
                            <span className="text-[10px] text-destructive/80 block truncate max-w-[150px]" title={exp.approval.rejectionReason}>
                              {exp.approval.rejectionReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Pending / N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {renderExpenseStatusBadge(exp.status)}
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No expenses match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <PdfPreviewModal
          open={showPdfPreview}
          onClose={() => setShowPdfPreview(false)}
          pdfBlob={pdfPreviewBlob}
          title="Expense Claim Report — Official Letterhead"
          filename={expenseReportPdfFilename()}
          isLoading={isGeneratingPdf}
        />
      </DialogContent>
    </Dialog>
  );
}

export { DownloadExpensesModal as ExpenseReportModal };


