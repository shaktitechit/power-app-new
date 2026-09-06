"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { Button } from "@/components/portal/ui/button";
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
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Building2,
  Briefcase,
  Home,
  Palmtree,
  User as UserIcon,
  Users,
  Eye,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ListChecks,
  Sparkles,
  Filter,
  X,
  Maximize2,
  Send,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import {
  useGetWorkPlansQuery,
  useApproveWorkPlanMutation,
  useSubmitWorkPlanMutation,
  type WorkPlan,
} from "@/store/slices/workPlannerApiSlice";
import { useGetTeamUsersQuery } from "@/store/slices/teamManagerApiSlice";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";
import { renderPlanStatusBadge, renderPlanTypeBadge, formatPlanDate, PLAN_TYPE_CONFIG } from "../workPlanUtils";
import { CreatePlanModal } from "./CreatePlanModal";

interface WorkPlannerCalendarModalProps {
  open: boolean;
  onClose: () => void;
}

export function WorkPlannerCalendarModal({ open, onClose }: WorkPlannerCalendarModalProps) {
  const router = useRouter();
  const currentUser = useAppSelector((s) => s.auth.user);
  const rolePrefix = currentUser?.role ? `/${currentUser.role.replace("_", "-")}` : "";

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isSeniorOrManager = isSuperAdmin || currentUser?.role === "admin" || currentUser?.role === "manager";

  // State: Navigation & View mode
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // State: Filters
  // Default owner filter: "all" for super admin, "team" for manager, "my" for staff
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(
    isSuperAdmin ? "all" : isSeniorOrManager ? "team" : "my"
  );
  const [selectedPlanType, setSelectedPlanType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Detail Popover / Dialog state
  const [selectedPlan, setSelectedPlan] = useState<WorkPlan | null>(null);

  // Create plan modal state from calendar
  const [createDate, setCreateDate] = useState<string | null>(null);

  // Fetch Team Members for user selector
  const { data: teamData } = useGetTeamUsersQuery({ limit: 200 }, { skip: !isSeniorOrManager });
  const teamUsers = teamData?.users || [];

  // Compute start and end dates for visible range based on viewMode
  const { startDateStr, endDateStr, monthTitle, weekTitle } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "month") {
      // First day of current month
      const firstDayOfMonth = new Date(year, month, 1);
      // Offset to start from Sunday/Monday of the first week
      const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
      const gridStartDate = new Date(firstDayOfMonth);
      gridStartDate.setDate(gridStartDate.getDate() - startDayOfWeek);

      // Last day of month
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const endDayOfWeek = lastDayOfMonth.getDay();
      const gridEndDate = new Date(lastDayOfMonth);
      gridEndDate.setDate(gridEndDate.getDate() + (6 - endDayOfWeek));

      const formatIso = (d: Date) => d.toISOString().split("T")[0];
      const mName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

      return {
        startDateStr: formatIso(gridStartDate),
        endDateStr: formatIso(gridEndDate),
        monthTitle: mName,
        weekTitle: "",
      };
    } else {
      // Week View: calculate Sun - Sat range
      const dayOfWeek = currentDate.getDay();
      const gridStartDate = new Date(currentDate);
      gridStartDate.setDate(currentDate.getDate() - dayOfWeek);

      const gridEndDate = new Date(gridStartDate);
      gridEndDate.setDate(gridStartDate.getDate() + 6);

      const formatIso = (d: Date) => d.toISOString().split("T")[0];
      const startFmt = gridStartDate.toLocaleDateString("default", { month: "short", day: "numeric" });
      const endFmt = gridEndDate.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" });

      return {
        startDateStr: formatIso(gridStartDate),
        endDateStr: formatIso(gridEndDate),
        monthTitle: currentDate.toLocaleString("default", { month: "long", year: "numeric" }),
        weekTitle: `${startFmt} – ${endFmt}`,
      };
    }
  }, [currentDate, viewMode]);

  // Fetch Work Plans for the computed date range and filters
  const { data: plansData, isLoading, refetch } = useGetWorkPlansQuery(
    {
      startDate: startDateStr,
      endDate: endDateStr,
      ownerId: selectedOwnerId !== "all" ? selectedOwnerId : undefined,
      planType: selectedPlanType !== "all" ? selectedPlanType : undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      limit: 500,
    },
    { skip: !open }
  );

  const plans = plansData?.plans || [];

  // Mutations
  const [approvePlan] = useApproveWorkPlanMutation();
  const [submitPlan] = useSubmitWorkPlanMutation();

  const handleApprove = async (id: string) => {
    try {
      await approvePlan({ id }).unwrap();
      toast.success("Plan approved.");
      if (selectedPlan?._id === id) {
        setSelectedPlan((prev) => prev ? { ...prev, status: "approved" } : null);
      }
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to approve.");
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await submitPlan(id).unwrap();
      toast.success("Plan submitted.");
      if (selectedPlan?._id === id) {
        setSelectedPlan((prev) => prev ? { ...prev, status: currentUser?.role === "super_admin" ? "approved" : "submitted" } : null);
      }
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to submit.");
    }
  };

  // Map plans by YYYY-MM-DD key for fast lookup
  const plansByDate = useMemo(() => {
    const map: Record<string, WorkPlan[]> = {};
    for (const plan of plans) {
      let dateKey = "";
      if (plan.date) {
        dateKey = new Date(plan.date).toISOString().split("T")[0];
      } else if (plan.period?.startDate) {
        dateKey = new Date(plan.period.startDate).toISOString().split("T")[0];
      }
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(plan);
      }
    }
    return map;
  }, [plans]);

  // Statistics calculation for visible period
  const stats = useMemo(() => {
    let visitsCount = 0;
    let wfoCount = 0;
    let wfhCount = 0;
    let leaveCount = 0;

    for (const p of plans) {
      if (p.planType === "visits") visitsCount++;
      else if (p.planType === "work_from_office") wfoCount++;
      else if (p.planType === "work_from_home") wfhCount++;
      else if (p.planType === "leave") leaveCount++;
    }

    return { total: plans.length, visitsCount, wfoCount, wfhCount, leaveCount };
  }, [plans]);

  // Calendar Grid Days Builder (Month View)
  const monthDays = useMemo(() => {
    if (viewMode !== "month") return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();

    const days: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }> = [];
    const todayStr = new Date().toISOString().split("T")[0];

    // Grid starts startDayOfWeek days prior
    const cursor = new Date(firstDayOfMonth);
    cursor.setDate(cursor.getDate() - startDayOfWeek);

    // Render 5 or 6 weeks (35 or 42 cells)
    const totalCells = 42;
    for (let i = 0; i < totalCells; i++) {
      const dStr = cursor.toISOString().split("T")[0];
      days.push({
        date: new Date(cursor),
        dateStr: dStr,
        isCurrentMonth: cursor.getMonth() === month,
        isToday: dStr === todayStr,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [currentDate, viewMode]);

  // Calendar Grid Days Builder (Week View)
  const weekDays = useMemo(() => {
    if (viewMode !== "week") return [];
    const dayOfWeek = currentDate.getDay();
    const cursor = new Date(currentDate);
    cursor.setDate(currentDate.getDate() - dayOfWeek);

    const todayStr = new Date().toISOString().split("T")[0];
    const days: Array<{ date: Date; dateStr: string; isToday: boolean }> = [];

    for (let i = 0; i < 7; i++) {
      const dStr = cursor.toISOString().split("T")[0];
      days.push({
        date: new Date(cursor),
        dateStr: dStr,
        isToday: dStr === todayStr,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [currentDate, viewMode]);

  // Navigation handlers
  const handlePrev = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === "month") {
      nextDate.setMonth(nextDate.getMonth() - 1);
    } else {
      nextDate.setDate(nextDate.getDate() - 7);
    }
    setCurrentDate(nextDate);
  };

  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (viewMode === "month") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + 7);
    }
    setCurrentDate(nextDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent fullscreen showCloseButton={false} className="fixed inset-0 z-50 w-screen h-screen max-w-none max-h-screen p-0 flex flex-col gap-0 overflow-hidden bg-background rounded-none border-0 shadow-none sm:p-0">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b bg-card/80 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold">Work Planner Calendar</DialogTitle>
                {isSuperAdmin ? (
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-[10px]">Super Admin View</Badge>
                ) : isSeniorOrManager ? (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">Team Senior View</Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {viewMode === "month" ? monthTitle : weekTitle} · Comprehensive team schedule & work plans
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="hidden lg:flex items-center gap-2">
            <Badge variant="outline" className="bg-muted/40 px-2.5 py-1 text-xs font-normal">
              Total Plans: <strong className="ml-1 text-foreground">{stats.total}</strong>
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-2.5 py-1 text-xs font-normal">
              Visits: <strong className="ml-1">{stats.visitsCount}</strong>
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-2.5 py-1 text-xs font-normal">
              Office: <strong className="ml-1">{stats.wfoCount}</strong>
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-1 text-xs font-normal">
              WFH: <strong className="ml-1">{stats.wfhCount}</strong>
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-1 text-xs font-normal">
              Leave: <strong className="ml-1">{stats.leaveCount}</strong>
            </Badge>
          </div>

          {/* Controls: Nav, View Switch & Close */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border">
              <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 text-xs px-3 font-medium">
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className="h-8 text-xs px-3"
              >
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className="h-8 text-xs px-3"
              >
                Week
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="px-6 py-2.5 border-b bg-card/30 flex items-center gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Filter className="h-3.5 w-3.5" /> Filters:
          </div>

          {/* User / Scope Filter (Super Admin & Team Managers) */}
          {isSeniorOrManager && (
            <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
              <SelectTrigger className="w-52 h-8 text-xs">
                <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Team Filter" />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && (
                  <SelectItem value="all">🌐 All System Teams & Members</SelectItem>
                )}
                <SelectItem value="team">👥 Me & My Direct/Indirect Team</SelectItem>
                <SelectItem value="my">👤 My Plans Only</SelectItem>
                {teamUsers.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name} ({u.role ? u.role.replace("_", " ") : "Member"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Plan Type Filter */}
          <Select value={selectedPlanType} onValueChange={setSelectedPlanType}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Plan Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plan Types</SelectItem>
              <SelectItem value="visits">Site Visits</SelectItem>
              <SelectItem value="work_from_office">Work From Office</SelectItem>
              <SelectItem value="work_from_home">Work From Home</SelectItem>
              <SelectItem value="leave">On Leave</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {(selectedOwnerId !== (isSuperAdmin ? "all" : isSeniorOrManager ? "team" : "my") ||
            selectedPlanType !== "all" ||
            selectedStatus !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedOwnerId(isSuperAdmin ? "all" : isSeniorOrManager ? "team" : "my");
                setSelectedPlanType("all");
                setSelectedStatus("all");
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setCreateDate(new Date().toISOString().split("T")[0])}
            >
              <Plus className="h-3.5 w-3.5" /> New Plan
            </Button>
          </div>
        </div>

        {/* Calendar Main Grid Area */}
        <div className="flex-1 overflow-auto bg-muted/10 p-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="space-y-4 text-center">
                <Skeleton className="h-10 w-48 mx-auto rounded-xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            </div>
          ) : viewMode === "month" ? (
            /* Month View Grid */
            <div className="h-full flex flex-col min-w-[700px]">
              {/* Day Name Header */}
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground py-2 border-b">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 flex-1 mt-1 auto-rows-fr">
                {monthDays.map((dayItem, idx) => {
                  const dayPlans = plansByDate[dayItem.dateStr] || [];
                  return (
                    <div
                      key={dayItem.dateStr + idx}
                      className={`group relative p-1.5 rounded-xl border transition-all flex flex-col gap-1 overflow-hidden min-h-[90px] ${
                        dayItem.isCurrentMonth
                          ? "bg-card hover:border-primary/50 hover:shadow-sm"
                          : "bg-muted/30 text-muted-foreground/50 border-transparent"
                      } ${dayItem.isToday ? "ring-2 ring-primary ring-offset-1 border-primary/60 bg-primary/5" : ""}`}
                    >
                      {/* Day Cell Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                            dayItem.isToday
                              ? "bg-primary text-primary-foreground font-bold"
                              : dayItem.isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {dayItem.date.getDate()}
                        </span>

                        {/* Hover Quick Create */}
                        <button
                          onClick={() => setCreateDate(dayItem.dateStr)}
                          title="Add plan for this date"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-primary/10 text-primary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Day Plans List */}
                      <div className="flex-1 space-y-1 overflow-y-auto max-h-[110px] pr-0.5 scrollbar-none">
                        {dayPlans.slice(0, 3).map((plan) => (
                          <div
                            key={plan._id}
                            onClick={() => setSelectedPlan(plan)}
                            className={`p-1.5 rounded-lg border text-[11px] cursor-pointer hover:scale-[1.01] transition-transform ${
                              PLAN_TYPE_CONFIG[plan.planType]?.color || "bg-muted text-foreground"
                            } shadow-xs`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold truncate max-w-[120px]">
                                {plan.owner?.name || "User"}
                              </span>
                              {renderPlanStatusBadge(plan.status)}
                            </div>
                            <p className="text-[10px] opacity-90 truncate mt-0.5">
                              {plan.title || PLAN_TYPE_CONFIG[plan.planType]?.label || "Work Plan"}
                            </p>
                          </div>
                        ))}

                        {dayPlans.length > 3 && (
                          <div
                            onClick={() => setSelectedPlan(dayPlans[0])}
                            className="text-[10px] text-center text-primary font-medium hover:underline cursor-pointer py-0.5"
                          >
                            +{dayPlans.length - 3} more plans
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Week View Grid */
            <div className="h-full grid grid-cols-7 gap-3 min-w-[900px]">
              {weekDays.map((dayItem) => {
                const dayPlans = plansByDate[dayItem.dateStr] || [];
                const dayName = dayItem.date.toLocaleDateString("default", { weekday: "short" });
                const dateNum = dayItem.date.getDate();

                return (
                  <div
                    key={dayItem.dateStr}
                    className={`flex flex-col rounded-2xl border p-2.5 bg-card ${
                      dayItem.isToday ? "ring-2 ring-primary border-primary/50" : ""
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase">{dayName}</span>
                        <div className="text-lg font-bold leading-none mt-0.5">{dateNum}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setCreateDate(dayItem.dateStr)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Plans List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {dayPlans.map((plan) => (
                        <Card
                          key={plan._id}
                          onClick={() => setSelectedPlan(plan)}
                          className="hover:shadow-md transition-all cursor-pointer border hover:border-primary/50"
                        >
                          <CardContent className="p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <Badge variant="outline" className="text-[10px] truncate">
                                {plan.owner?.name}
                              </Badge>
                              {renderPlanStatusBadge(plan.status)}
                            </div>

                            {renderPlanTypeBadge(plan.planType)}

                            <p className="text-xs font-medium line-clamp-2">{plan.title || "Daily Plan"}</p>

                            {plan.planType === "visits" && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-purple-600" />
                                {plan.visits?.length || 0} Site Visit(s)
                              </p>
                            )}

                            {["work_from_office", "work_from_home"].includes(plan.planType) && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <ListChecks className="h-3 w-3 text-blue-600" />
                                {plan.works?.length || 0} Work Item(s)
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}

                      {!dayPlans.length && (
                        <div className="py-8 text-center text-xs text-muted-foreground/60 italic">
                          No plans
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Plan Detail Quick Modal */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={(v) => !v && setSelectedPlan(null)}>
          <DialogContent className="max-w-xl rounded-2xl p-6">
            <DialogHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {renderPlanTypeBadge(selectedPlan.planType)}
                  {renderPlanStatusBadge(selectedPlan.status)}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`${rolePrefix}/work-planner/${selectedPlan._id}`)}
                  className="gap-1.5 text-xs text-primary"
                >
                  <Eye className="h-3.5 w-3.5" /> View Full Page
                </Button>
              </div>
              <DialogTitle className="text-lg font-bold mt-2">
                {selectedPlan.title || `Work Plan (${selectedPlan.planType})`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Owner & Date Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/40 text-xs">
                <div>
                  <span className="text-muted-foreground">Owner:</span>
                  <p className="font-semibold">{selectedPlan.owner?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedPlan.owner?.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-semibold">{formatPlanDate(selectedPlan.date || selectedPlan.period?.startDate)}</p>
                </div>
                {selectedPlan.approval?.approvedBy?.name && (
                  <div>
                    <span className="text-muted-foreground">Approved By:</span>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedPlan.approval.approvedBy.name}
                    </p>
                  </div>
                )}
              </div>

              {selectedPlan.description && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm bg-card p-2.5 rounded-lg border">{selectedPlan.description}</p>
                </div>
              )}

              {/* Site Visits Section */}
              {selectedPlan.planType === "visits" && selectedPlan.visits && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Site Visits ({selectedPlan.visits.length})</span>
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedPlan.visits.map((v, i) => (
                      <div key={v._id || i} className="p-2.5 rounded-lg border bg-card text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {v.facility?.name || v.facilityName || "Site Visit"}
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {v.status}
                          </Badge>
                        </div>
                        {v.clientName && <p className="text-muted-foreground">Client: {v.clientName}</p>}
                        {v.purpose && <p className="text-muted-foreground">Purpose: {v.purpose}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Items Section */}
              {["work_from_office", "work_from_home"].includes(selectedPlan.planType) && selectedPlan.works && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    Work Items ({selectedPlan.works.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedPlan.works.map((w, i) => (
                      <div key={w._id || i} className="p-2.5 rounded-lg border bg-card text-xs flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{w.title}</p>
                          {w.category && <p className="text-muted-foreground text-[10px]">{w.category}</p>}
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {w.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlan.approval?.rejectionReason && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  <strong>Rejection Reason:</strong> {selectedPlan.approval.rejectionReason}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              {["draft", "rejected"].includes(selectedPlan.status) && String(selectedPlan.owner?._id) === String(currentUser?._id) && (
                <Button size="sm" className="gap-1 text-xs" onClick={() => handleSubmit(selectedPlan._id)}>
                  <Send className="h-3.5 w-3.5" /> Submit for Approval
                </Button>
              )}

              {selectedPlan.status === "submitted" && isSeniorOrManager && String(selectedPlan.owner?._id) !== String(currentUser?._id) && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs" onClick={() => handleApprove(selectedPlan._id)}>
                  <ThumbsUp className="h-3.5 w-3.5" /> Approve Plan
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={() => setSelectedPlan(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Plan Modal triggered from calendar */}
      {createDate && (
        <CreatePlanModal
          open={!!createDate}
          onClose={() => setCreateDate(null)}
          initialDate={createDate}
        />
      )}
    </Dialog>
  );
}
