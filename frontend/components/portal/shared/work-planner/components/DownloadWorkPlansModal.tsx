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
import {
  Download,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Layers,
  MapPin,
  ChevronDown,
  ChevronRight,
  Users,
  User,
  CheckSquare,
  Building2,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useGetWorkPlansQuery, type WorkPlan, type VisitItem, type WorkItem } from "@/store/slices/workPlannerApiSlice";
import { useGetOrgHierarchyQuery, type OrgNode } from "@/store/slices/teamManagerApiSlice";
import { useGetDefaultCompanyQuery } from "@/store/slices/companyApiSlice";
import { useAppSelector } from "@/store/hooks";
import { formatPlanDate, renderPlanStatusBadge, renderPlanTypeBadge } from "../workPlanUtils";
import { buildWorkPlanReportPdfBlob, workPlanReportPdfFilename } from "@/components/portal/lib/workPlanReportPdf";
import { PdfPreviewModal } from "./PdfPreviewModal";

export interface DownloadWorkPlansModalProps {
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
  let ids: string[] = [];
  if (node._id) ids.push(String(node._id));
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

export function DownloadWorkPlansModal({ open, onClose }: DownloadWorkPlansModalProps) {
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planTypeFilter, setPlanTypeFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Record<string, boolean>>({});

  const { data: orgNodes } = useGetOrgHierarchyQuery(undefined, { skip: !open });
  const { data: companyRes } = useGetDefaultCompanyQuery(undefined, { skip: !open });
  const defaultCompany = companyRes?.data;

  const { data, isLoading } = useGetWorkPlansQuery(
    {
      status: statusFilter !== "all" ? statusFilter : undefined,
      planType: planTypeFilter !== "all" ? planTypeFilter : undefined,
      limit: 300,
    },
    { skip: !open }
  );

  const allPlans = data?.plans || [];

  // Team scope user IDs map
  const teamMemberMap = useMemo(() => {
    const map = new Map<string, string[]>();
    (orgNodes || []).forEach((node) => {
      const nodeKey = node.teamId || node._id;
      map.set(nodeKey, getMemberIdsFromNode(node));
    });
    return map;
  }, [orgNodes]);

  // All accessible members in hierarchy scope + plan owners
  const allMembers = useMemo(() => {
    const list = extractMembersWithTeam(orgNodes || []);

    // Ensure plan owners are included
    allPlans.forEach((p: WorkPlan) => {
      if (p.owner && p.owner._id) {
        const pId = String(p.owner._id);
        if (!list.some((m) => String(m._id) === pId)) {
          list.push({
            _id: pId,
            name: p.owner.name,
            role: p.owner.role || "",
            email: p.owner.email || "",
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
  }, [orgNodes, allPlans, user]);

  // Dynamically filter member choices based on selected team scope
  const scopedMembers = useMemo(() => {
    if (teamFilter === "all") return allMembers;
    const allowedMemberIds = teamMemberMap.get(teamFilter) || [];
    return allMembers.filter((m) => allowedMemberIds.includes(String(m._id)));
  }, [allMembers, teamFilter, teamMemberMap]);

  const filteredPlans = useMemo(() => {
    return allPlans.filter((p: WorkPlan) => {
      const ownerId = String(p.owner?._id || "");

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (p.title || "").toLowerCase().includes(q);
        const ownerMatch = (p.owner?.name || "").toLowerCase().includes(q);
        if (!titleMatch && !ownerMatch) return false;
      }

      if (teamFilter !== "all") {
        const allowedMemberIds = teamMemberMap.get(teamFilter) || [];
        if (!allowedMemberIds.includes(ownerId)) return false;
      }

      if (memberFilter !== "all") {
        if (ownerId !== String(memberFilter)) return false;
      }

      if (dateFrom) {
        const pDate = new Date(p.date || p.period?.startDate);
        if (pDate < new Date(dateFrom)) return false;
      }

      if (dateTo) {
        const pDate = new Date(p.date || p.period?.startDate);
        const endD = new Date(dateTo);
        endD.setHours(23, 59, 59, 999);
        if (pDate > endD) return false;
      }
      return true;
    });
  }, [allPlans, searchQuery, teamFilter, teamMemberMap, memberFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    let visits = 0;
    let approved = 0;
    let pending = 0;
    filteredPlans.forEach((p: WorkPlan) => {
      visits += p.visits?.length || 0;
      if (p.status === "approved") approved++;
      if (["submitted", "under_review"].includes(p.status)) pending++;
    });
    return { total: filteredPlans.length, visits, approved, pending };
  }, [filteredPlans]);

  const toggleExpandRow = (id: string) => {
    setExpandedPlanIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePreviewPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      if (filteredPlans.length === 0) {
        toast.error("No work plans found for the selected criteria.");
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

      const planTypeFilterLabel =
        planTypeFilter === "all" ? "All Plan Types" : planTypeFilter.replace(/_/g, " ").toUpperCase();

      const generatedBy = user?.name
        ? `${user.name} (${(user.role || "").replace(/_/g, " ")})`
        : "Authorized Staff";

      const blob = await buildWorkPlanReportPdfBlob({
        plans: filteredPlans,
        company: defaultCompany,
        dateFrom,
        dateTo,
        teamFilterLabel,
        memberFilterLabel,
        statusFilterLabel,
        planTypeFilterLabel,
        generatedBy,
      });
      setPdfPreviewBlob(blob);
      setShowPdfPreview(true);
    } catch (err: any) {
      console.error("PDF generation failed", err);
      toast.error("Failed to generate PDF report: " + (err.message || "Unknown error"));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (filteredPlans.length === 0) {
        toast.error("No work plans found for the selected criteria.");
        setIsExporting(false);
        return;
      }

      const headers = [
        "Plan Title",
        "Owner",
        "Role",
        "Date",
        "Plan Type",
        "Status",
        "Approved By",
        "Approved At / Reason",
        "Site Visits Summary (Details, Status & Remarks)",
        "Work Tasks Summary (Details, Status & Remarks)",
      ];

      const rows = filteredPlans.map((p: WorkPlan) => {
        const approvedBy = p.approval?.approvedBy?.name || (p.status === "rejected" ? "Rejected" : "Pending");
        const approvedAtOrReason = p.approval?.approvedAt
          ? formatPlanDate(p.approval.approvedAt)
          : p.approval?.rejectionReason || "";

        const visitsSummary = (p.visits || [])
          .map(
            (v: VisitItem) =>
              `${v.facilityName || v.clientName || "Visit"} [Status: ${v.status}, Purpose: ${v.purpose || "-"}, Remarks: ${
                v.notes || v.expectedOutcome || "-"
              }]`
          )
          .join(" | ");

        const tasksSummary = (p.works || [])
          .map((w: WorkItem) => `${w.title} [Status: ${w.status}, Remarks: ${w.notes || w.description || "-"}]`)
          .join(" | ");

        return [
          `"${(p.title || "").replace(/"/g, '""')}"`,
          `"${(p.owner?.name || "").replace(/"/g, '""')}"`,
          `"${(p.owner?.role || "").replace(/"/g, '""')}"`,
          `"${formatPlanDate(p.date || p.period?.startDate)}"`,
          `"${p.planType}"`,
          `"${p.status}"`,
          `"${approvedBy.replace(/"/g, '""')}"`,
          `"${approvedAtOrReason.replace(/"/g, '""')}"`,
          `"${visitsSummary.replace(/"/g, '""')}"`,
          `"${tasksSummary.replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Work_Plans_Report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Work plans report exported successfully.");
    } catch (e: any) {
      toast.error("Failed to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  const renderVisitStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Scheduled</Badge>;
    }
  };

  const renderWorkStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isExporting && onClose()}>
      <DialogContent fullscreen className="p-4 sm:p-6 flex flex-col gap-0 overflow-hidden bg-background">
        <DialogHeader className="pb-3 border-b shrink-0 flex flex-row items-center justify-between gap-4 pr-10">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Work Plan Report
            </DialogTitle>
            <DialogDescription className="text-xs">
              Comprehensive report of daily work plans, team scope, individual members, site visits, tasks, and approval history.
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

        {/* Filter Controls & Search Toolbar */}
        <div className="py-3 flex flex-col sm:flex-row gap-2.5 justify-between border-b shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search owner/title..."
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted / Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planTypeFilter} onValueChange={setPlanTypeFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
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

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 py-3 shrink-0">
          <Card className="border shadow-2xs">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Total Plans</p>
                <p className="text-lg font-bold text-foreground leading-tight mt-0.5">{summary.total}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-muted shrink-0">
                <Layers className="h-4 w-4 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-2xs">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Site Visits</p>
                <p className="text-lg font-bold text-purple-600 leading-tight mt-0.5">{summary.visits}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-purple-50 shrink-0">
                <MapPin className="h-4 w-4 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-2xs">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Approved</p>
                <p className="text-lg font-bold text-green-600 leading-tight mt-0.5">{summary.approved}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-green-50 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-2xs">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-lg font-bold text-amber-600 leading-tight mt-0.5">{summary.pending}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-amber-50 shrink-0">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabular List Section */}
        <div className="flex-1 overflow-auto rounded-lg border bg-card shadow-2xs min-h-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted/50 border-b sticky top-0 z-10">
                <tr>
                  <th className="w-8 px-2 py-2.5"></th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Plan Title & Type</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Owner</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Visits / Items</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Approved By</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPlans.map((plan: WorkPlan) => {
                  const isExpanded = !!expandedPlanIds[plan._id];
                  const hasVisitsOrWorks = (plan.visits?.length || 0) > 0 || (plan.works?.length || 0) > 0;

                  return (
                    <React.Fragment key={plan._id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="px-2 py-2 text-center">
                          {hasVisitsOrWorks && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0"
                              onClick={() => toggleExpandRow(plan._id)}
                            >
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {renderPlanTypeBadge(plan.planType)}
                            <span className="font-medium text-foreground truncate max-w-[240px]">
                              {plan.title || `Work Plan (${plan.planType})`}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-medium">
                          <span>{plan.owner?.name || "Employee"}</span>
                          <span className="text-[10px] text-muted-foreground block capitalize">{plan.owner?.role?.replace("_", " ")}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatPlanDate(plan.date || plan.period?.startDate)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-semibold">{plan.visits?.length || 0}</span> visits ·{" "}
                          <span className="font-semibold">{plan.works?.length || 0}</span> tasks
                        </td>
                        <td className="px-3 py-2">
                          {plan.approval?.approvedBy?.name ? (
                            <div>
                              <span className="font-medium text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> {plan.approval.approvedBy.name}
                              </span>
                              {plan.approval.approvedAt && (
                                <span className="text-[10px] text-muted-foreground block">
                                  {formatPlanDate(plan.approval.approvedAt)}
                                </span>
                              )}
                            </div>
                          ) : plan.status === "rejected" ? (
                            <div>
                              <span className="font-medium text-destructive flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Rejected
                              </span>
                              {plan.approval?.rejectionReason && (
                                <span className="text-[10px] text-destructive/80 block truncate max-w-[150px]" title={plan.approval.rejectionReason}>
                                  {plan.approval.rejectionReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Pending / N/A</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {renderPlanStatusBadge(plan.status)}
                        </td>
                      </tr>

                      {/* Expandable Visits and Tasks Breakdown in Nested Tabular Format */}
                      {isExpanded && (
                        <tr className="bg-muted/15 border-b">
                          <td colSpan={7} className="px-6 py-3">
                            <div className="space-y-4">
                              {/* Site Visits Sub-Table */}
                              {plan.visits && plan.visits.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="p-1 rounded bg-purple-100 text-purple-700">
                                      <MapPin className="h-3.5 w-3.5" />
                                    </span>
                                    <h4 className="text-xs font-bold text-foreground">
                                      Scheduled Site Visits ({plan.visits.length})
                                    </h4>
                                  </div>
                                  <div className="rounded-md border bg-card overflow-hidden shadow-2xs">
                                    <table className="w-full text-xs">
                                      <thead className="bg-muted/70 border-b text-[11px] font-semibold text-muted-foreground">
                                        <tr>
                                          <th className="text-left px-3 py-1.5 w-8">#</th>
                                          <th className="text-left px-3 py-1.5">Facility / Client</th>
                                          <th className="text-left px-3 py-1.5">Location</th>
                                          <th className="text-left px-3 py-1.5">Purpose</th>
                                          <th className="text-left px-3 py-1.5">Status</th>
                                          <th className="text-left px-3 py-1.5">Remarks / Outcome</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/60">
                                        {plan.visits.map((v: VisitItem, idx: number) => (
                                          <tr key={v._id || idx} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-3 py-1.5 font-medium text-muted-foreground">{idx + 1}</td>
                                            <td className="px-3 py-1.5 font-semibold text-foreground">
                                              <span className="flex items-center gap-1.5">
                                                <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                                {v.facilityName || v.facility?.name || v.clientName || "Site Visit"}
                                              </span>
                                            </td>
                                            <td className="px-3 py-1.5 text-muted-foreground">{v.location || v.facility?.city || "-"}</td>
                                            <td className="px-3 py-1.5 text-foreground max-w-[200px] truncate" title={v.purpose || ""}>
                                              {v.purpose || "-"}
                                            </td>
                                            <td className="px-3 py-1.5">{renderVisitStatusBadge(v.status)}</td>
                                            <td className="px-3 py-1.5 text-muted-foreground italic max-w-[220px] truncate" title={v.notes || v.expectedOutcome || ""}>
                                              {v.notes || v.expectedOutcome || "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Work Tasks Sub-Table */}
                              {plan.works && plan.works.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="p-1 rounded bg-blue-100 text-blue-700">
                                      <CheckSquare className="h-3.5 w-3.5" />
                                    </span>
                                    <h4 className="text-xs font-bold text-foreground">
                                      Work Tasks ({plan.works.length})
                                    </h4>
                                  </div>
                                  <div className="rounded-md border bg-card overflow-hidden shadow-2xs">
                                    <table className="w-full text-xs">
                                      <thead className="bg-muted/70 border-b text-[11px] font-semibold text-muted-foreground">
                                        <tr>
                                          <th className="text-left px-3 py-1.5 w-8">#</th>
                                          <th className="text-left px-3 py-1.5">Task Title</th>
                                          <th className="text-left px-3 py-1.5">Category / Description</th>
                                          <th className="text-left px-3 py-1.5">Est. Hours</th>
                                          <th className="text-left px-3 py-1.5">Status</th>
                                          <th className="text-left px-3 py-1.5">Remarks / Notes</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/60">
                                        {plan.works.map((w: WorkItem, idx: number) => (
                                          <tr key={w._id || idx} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-3 py-1.5 font-medium text-muted-foreground">{idx + 1}</td>
                                            <td className="px-3 py-1.5 font-semibold text-foreground">{w.title}</td>
                                            <td className="px-3 py-1.5 text-muted-foreground max-w-[220px] truncate" title={w.description || w.category || ""}>
                                              {w.category ? `${w.category}: ` : ""}{w.description || "-"}
                                            </td>
                                            <td className="px-3 py-1.5 text-muted-foreground">{w.estimatedHours ? `${w.estimatedHours} hrs` : "-"}</td>
                                            <td className="px-3 py-1.5">{renderWorkStatusBadge(w.status)}</td>
                                            <td className="px-3 py-1.5 text-muted-foreground italic max-w-[220px] truncate" title={w.notes || ""}>
                                              {w.notes || "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredPlans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No work plans match the selected filters.
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
          title="Work Plan Report — Official Letterhead"
          filename={workPlanReportPdfFilename()}
          isLoading={isGeneratingPdf}
        />
      </DialogContent>
    </Dialog>
  );
}

export { DownloadWorkPlansModal as WorkPlanReportModal };



