"use client";

import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/portal/ui/card";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Badge } from "@/components/portal/ui/badge";
import { Avatar, AvatarFallback } from "@/components/portal/ui/avatar";
import { Skeleton } from "@/components/portal/ui/skeleton";
import { Checkbox } from "@/components/portal/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/portal/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import {
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  UserCheck,
  UserX,
  UserMinus,
  Plus,
  MoveRight,
  Building2,
  Network,
  BarChart3,
  Shield,
  ShieldAlert,
  Crown,
  Layers,
  Edit,
  Trash2,
  UserCog,
  FolderTree,
  Maximize2,
  Sparkles,
} from "lucide-react";
import {
  useGetOrgHierarchyQuery,
  useGetTeamUsersQuery,
  useGetTeamReportQuery,
  useAssignUserMutation,
  useMoveUserMutation,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
  type OrgNode,
  type TeamUser,
} from "@/store/slices/teamManagerApiSlice";
import { useAppSelector } from "@/store/hooks";
import { formatRoleLabel } from "@/components/portal/lib/authRoles";
import { toast } from "sonner";

// ------------------------------------------------------------------
// Authority Rank Mapping
// ------------------------------------------------------------------
const ROLE_RANKS: Record<string, number> = {
  super_admin: 40,
  admin: 30,
  manager: 20,
  auditor: 10,
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  manager: "bg-green-100 text-green-700 border-green-200",
  auditor: "bg-orange-100 text-orange-700 border-orange-200",
};

// Helper function to count total descendants in an OrgNode
function countSubtree(node: OrgNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + node.children.reduce((acc, child) => acc + countSubtree(child), 0);
}

// ------------------------------------------------------------------
// Org Tree Node Component
// ------------------------------------------------------------------
function OrgTreeNode({
  node,
  depth = 0,
  onRemoveFromTeam,
}: {
  node: OrgNode;
  depth?: number;
  onRemoveFromTeam?: (user: TeamUser) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children?.length > 0;

  return (
    <div className="ml-4 border-l border-border/60 pl-4 py-1">
      <div
        className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted/50 rounded-lg px-2 transition-colors group"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="w-4" />
          )}
        </button>

        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
            {node.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{node.name}</p>
            {depth === 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-amber-100 text-amber-800 border-amber-200">
                Team Head
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{node.email}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={`text-xs ${ROLE_COLORS[node.role || "auditor"] || "bg-muted text-muted-foreground"}`}
          >
            {formatRoleLabel(node.role || "auditor")}
          </Badge>
          {node.status === "inactive" && (
            <Badge variant="destructive" className="text-xs">Inactive</Badge>
          )}

          {depth > 0 && onRemoveFromTeam && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
              title={`Remove ${node.name} from team`}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromTeam(node);
              }}
            >
              <UserMinus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="space-y-0.5">
          {node.children.map((child) => (
            <OrgTreeNode
              key={child._id}
              node={child}
              depth={depth + 1}
              onRemoveFromTeam={onRemoveFromTeam}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Static Team Card Component
// ------------------------------------------------------------------
function TeamCard({
  rootNode,
  teamIndex,
  onRemoveFromTeam,
  onChangeHead,
  onEditTeam,
  onDeleteTeam,
}: {
  rootNode: OrgNode;
  teamIndex: number;
  onRemoveFromTeam?: (user: TeamUser) => void;
  onChangeHead: (team: OrgNode) => void;
  onEditTeam: (team: OrgNode) => void;
  onDeleteTeam: (team: OrgNode) => void;
}) {
  const memberCount = countSubtree(rootNode);
  const headName = rootNode.lead ? rootNode.lead.name : rootNode.name;
  const headRole = rootNode.lead ? rootNode.lead.role : rootNode.role;

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-muted/40 to-muted/10 border-b py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {rootNode.name}
            </CardTitle>
            <CardDescription className="text-xs">
              Head: <strong>{headName}</strong> ({formatRoleLabel(headRole || "manager")})
              {rootNode.description && <span className="ml-2 italic text-muted-foreground">— {rootNode.description}</span>}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="gap-1 text-xs h-7 px-2">
            <Users className="h-3 w-3" /> {memberCount} {memberCount === 1 ? "Member" : "Members"}
          </Badge>

          <Button variant="outline" size="sm" onClick={() => onChangeHead(rootNode)} className="gap-1 text-xs h-7 px-2">
            <UserCog className="h-3.5 w-3.5 text-primary" /> Change Head
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEditTeam(rootNode)} className="gap-1 text-xs h-7 px-2">
            <Edit className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDeleteTeam(rootNode)} className="gap-1 text-xs h-7 px-2">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3 pb-4 px-2">
        <OrgTreeNode node={rootNode} depth={0} onRemoveFromTeam={onRemoveFromTeam} />
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------
// Create Team Tree Builder Full Screen Modal Component
// ------------------------------------------------------------------
interface TreeAssignment {
  userId: string;
  reportsToId: string;
}

interface DraftTreeNode {
  user: TeamUser;
  children: DraftTreeNode[];
}

function buildDraftTree(
  lead: TeamUser,
  assignments: TreeAssignment[],
  allUsers: TeamUser[]
): DraftTreeNode {
  const userMap = new Map<string, TeamUser>();
  for (const u of allUsers) {
    userMap.set(u._id, u);
  }

  function getChildren(managerId: string): DraftTreeNode[] {
    const directAssigned = assignments.filter((a) => a.reportsToId === managerId);
    return directAssigned
      .map((a) => {
        const u = userMap.get(a.userId);
        if (!u) return null;
        return {
          user: u,
          children: getChildren(u._id),
        };
      })
      .filter(Boolean) as DraftTreeNode[];
  }

  return {
    user: lead,
    children: getChildren(lead._id),
  };
}

function DraftTreeNodeView({
  node,
  depth = 0,
  allUsers,
  treeAssignments,
  onAddSubordinate,
  onRemoveSubordinate,
  onReassignManager,
  availableTreeManagers,
}: {
  node: DraftTreeNode;
  depth?: number;
  allUsers: TeamUser[];
  treeAssignments: TreeAssignment[];
  onAddSubordinate: (managerId: string, memberId: string) => void;
  onRemoveSubordinate: (memberId: string) => void;
  onReassignManager: (memberId: string, newManagerId: string) => void;
  availableTreeManagers: TeamUser[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");

  const managerRank = ROLE_RANKS[node.user.role] || 0;
  const assignedSet = useMemo(() => new Set(treeAssignments.map((a) => a.userId)), [treeAssignments]);

  const eligibleSubordinates = useMemo(() => {
    return allUsers.filter((u) => {
      if (u._id === node.user._id) return false;
      if (assignedSet.has(u._id)) return false;
      const r = ROLE_RANKS[u.role] || 0;
      return r <= managerRank;
    });
  }, [allUsers, assignedSet, managerRank, node.user._id]);

  const filteredSubordinates = useMemo(() => {
    if (!search.trim()) return eligibleSubordinates;
    const q = search.toLowerCase();
    return eligibleSubordinates.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [eligibleSubordinates, search]);

  const canHaveSubordinates = ["super_admin", "admin", "manager"].includes(node.user.role);

  return (
    <div className={`space-y-2.5 ${depth > 0 ? "ml-6 pl-4 border-l-2 border-primary/25 pt-2" : ""}`}>
      {/* Node Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-card gap-3 text-xs shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback
              className={`text-xs font-bold ${
                depth === 0 ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"
              }`}
            >
              {node.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-foreground text-sm truncate">{node.user.name}</p>
              {depth === 0 ? (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-800 border-amber-200 font-semibold">
                  Team Head (Root)
                </Badge>
              ) : (
                <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[node.user.role] || ""}`}>
                  {formatRoleLabel(node.user.role)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{node.user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {depth > 0 && (
            <Select
              value={treeAssignments.find((a) => a.userId === node.user._id)?.reportsToId}
              onValueChange={(v) => onReassignManager(node.user._id, v)}
            >
              <SelectTrigger className="h-8 text-xs px-2.5 w-36">
                <SelectValue placeholder="Reports to..." />
              </SelectTrigger>
              <SelectContent>
                {availableTreeManagers.map((m) => (
                  <SelectItem key={m._id} value={m._id} disabled={m._id === node.user._id}>
                    {m.name} ({formatRoleLabel(m.role)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {canHaveSubordinates && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3 gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary font-medium"
              onClick={() => setIsAdding(!isAdding)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Subordinate
            </Button>
          )}

          {depth > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              title={`Remove ${node.user.name} from tree`}
              onClick={() => onRemoveSubordinate(node.user._id)}
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Subordinate Search & Picker Drawer for this Node */}
      {isAdding && (
        <div className="p-3 rounded-xl border bg-muted/50 space-y-2.5 text-xs shadow-inner">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-primary" /> Select Subordinates reporting directly to <strong>{node.user.name}</strong>
            </p>
            <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" onClick={() => setIsAdding(false)}>
              Close
            </Button>
          </div>

          <Input
            placeholder="Search subordinate by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs bg-background"
          />

          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 border rounded-lg bg-background p-1.5">
            {filteredSubordinates.map((sub) => (
              <div
                key={sub._id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                onClick={() => {
                  onAddSubordinate(node.user._id, sub._id);
                  setSearch("");
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{sub.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{sub.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${ROLE_COLORS[sub.role] || ""}`}>
                  {formatRoleLabel(sub.role)}
                </Badge>
              </div>
            ))}

            {filteredSubordinates.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                No eligible subordinates found matching criteria.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Render Nested Subordinate Child Nodes */}
      {node.children.length > 0 && (
        <div className="space-y-2.5">
          {node.children.map((childNode) => (
            <DraftTreeNodeView
              key={childNode.user._id}
              node={childNode}
              depth={depth + 1}
              allUsers={allUsers}
              treeAssignments={treeAssignments}
              onAddSubordinate={onAddSubordinate}
              onRemoveSubordinate={onRemoveSubordinate}
              onReassignManager={onReassignManager}
              availableTreeManagers={availableTreeManagers}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function extractTreeAssignmentsFromTeam(team: OrgNode): { leadId: string; assignments: TreeAssignment[] } {
  const leadId = team.lead?._id || (team.children && team.children[0] ? team.children[0]._id : "");
  const assignments: TreeAssignment[] = [];

  function recurse(nodes: OrgNode[], parentId: string) {
    if (!nodes || !Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (n._id && n._id !== leadId) {
        assignments.push({ userId: n._id, reportsToId: parentId });
        if (n.children && n.children.length > 0) {
          recurse(n.children, n._id);
        }
      } else if (n._id === leadId && n.children && n.children.length > 0) {
        recurse(n.children, leadId);
      }
    }
  }

  if (team.children && team.children.length > 0) {
    recurse(team.children, leadId);
  }

  return { leadId, assignments };
}

function CreateTeamModal({
  open,
  onOpenChange,
  allUsers,
  initialTeam = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: TeamUser[];
  initialTeam?: OrgNode | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [treeAssignments, setTreeAssignments] = useState<TreeAssignment[]>([]);

  const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();
  const [updateTeam, { isLoading: isUpdating }] = useUpdateTeamMutation();
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      if (initialTeam) {
        setName(initialTeam.name || "");
        setDescription(initialTeam.description || "");
        const { leadId, assignments } = extractTreeAssignmentsFromTeam(initialTeam);
        setSelectedLeadId(leadId);
        setTreeAssignments(assignments);
      } else {
        setName("");
        setDescription("");
        setSelectedLeadId("");
        setTreeAssignments([]);
      }
    }
  }, [open, initialTeam]);

  const potentialLeads = useMemo(() => {
    return allUsers.filter((u) => ["super_admin", "admin", "manager"].includes(u.role));
  }, [allUsers]);

  const selectedLead = useMemo(() => {
    return allUsers.find((u) => u._id === selectedLeadId);
  }, [allUsers, selectedLeadId]);

  const availableTreeManagers = useMemo(() => {
    if (!selectedLead) return [];
    const list = [selectedLead];
    for (const a of treeAssignments) {
      const u = allUsers.find((user) => user._id === a.userId);
      if (u && ["super_admin", "admin", "manager"].includes(u.role)) {
        if (!list.some((existing) => existing._id === u._id)) {
          list.push(u);
        }
      }
    }
    return list;
  }, [selectedLead, treeAssignments, allUsers]);

  const draftTree = useMemo(() => {
    if (!selectedLead) return null;
    return buildDraftTree(selectedLead, treeAssignments, allUsers);
  }, [selectedLead, treeAssignments, allUsers]);

  const handleLeadChange = (val: string) => {
    setSelectedLeadId(val);
    setTreeAssignments([]);
  };

  const handleAddSubordinate = (managerId: string, memberId: string) => {
    const member = allUsers.find((u) => u._id === memberId);
    const manager = availableTreeManagers.find((m) => m._id === managerId) || selectedLead;

    if (member && manager) {
      const memberRank = ROLE_RANKS[member.role] || 0;
      const managerRank = ROLE_RANKS[manager.role] || 0;
      if (memberRank > managerRank) {
        toast.error(
          `Authority rule: ${member.name} (${formatRoleLabel(
            member.role
          )}) cannot report to ${manager.name} (${formatRoleLabel(manager.role)}).`
        );
        return;
      }
    }

    setTreeAssignments((prev) => [...prev, { userId: memberId, reportsToId: managerId }]);
  };

  const handleRemoveSubordinate = (userId: string) => {
    setTreeAssignments((prev) => {
      const filtered = prev.filter((a) => a.userId !== userId);
      return filtered.map((a) =>
        a.reportsToId === userId ? { ...a, reportsToId: selectedLeadId } : a
      );
    });
  };

  const handleReassignManager = (userId: string, newManagerId: string) => {
    const member = allUsers.find((u) => u._id === userId);
    const parentManager = availableTreeManagers.find((m) => m._id === newManagerId);

    if (member && parentManager) {
      const memberRank = ROLE_RANKS[member.role] || 0;
      const managerRank = ROLE_RANKS[parentManager.role] || 0;
      if (memberRank > managerRank) {
        toast.error(
          `Authority rule: ${member.name} (${formatRoleLabel(
            member.role
          )}) cannot report to ${parentManager.name} (${formatRoleLabel(parentManager.role)}).`
        );
        return;
      }
    }

    setTreeAssignments((prev) =>
      prev.map((a) => (a.userId === userId ? { ...a, reportsToId: newManagerId } : a))
    );
  };

  const handleSave = async () => {
    if (!selectedLeadId) return;
    try {
      if (initialTeam) {
        const res = await updateTeam({
          id: initialTeam.teamId || initialTeam._id,
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          teamLeadId: selectedLeadId,
          members: treeAssignments,
        }).unwrap();
        toast.success(res.message || "Team tree updated successfully!");
      } else {
        const res = await createTeam({
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          teamLeadId: selectedLeadId,
          members: treeAssignments,
        }).unwrap();
        toast.success(res.message || "Team tree created successfully!");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.data?.message || `Failed to ${initialTeam ? "update" : "create"} team tree.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullscreen className="p-0 gap-0 border-0 flex flex-col h-dvh max-h-dvh w-screen overflow-hidden font-sans bg-background">
        {/* Full Screen Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FolderTree className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {initialTeam ? "Edit Team Tree Workspace" : "Create Team Tree Workspace"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {initialTeam
                  ? "Edit team settings, update Team Head, or re-arrange reporting subordinates in the hierarchy canvas."
                  : "Configure team settings, designate Team Head, and search/add direct subordinates across hierarchy levels."}
              </DialogDescription>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs bg-primary/5 text-primary border-primary/20">
            <Maximize2 className="h-3.5 w-3.5" /> Full Screen Canvas
          </Badge>
        </div>

        {/* Dual-Pane Body Workspace */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Panel: Form Controls */}
          <div className="lg:col-span-4 border-r flex flex-col overflow-y-auto p-6 space-y-5 bg-card/40">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Team Name *</label>
              <Input
                placeholder="e.g. Audit Team 1, Sales Team, Team Alpha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1.5 block">Description (Optional)</label>
              <Input
                placeholder="Brief description of team responsibility..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9"
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1.5 block">Select Team Head (Root Level) *</label>
              <Select value={selectedLeadId} onValueChange={handleLeadChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose Team Head manager..." />
                </SelectTrigger>
                <SelectContent>
                  {potentialLeads.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name} ({formatRoleLabel(u.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLead && (
              <Card className="border bg-gradient-to-br from-primary/5 to-transparent shadow-none">
                <CardHeader className="py-3 px-4 pb-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> Tree Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Team Head:</span>
                    <strong className="text-foreground">{selectedLead.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Subordinates Added:</span>
                    <strong className="text-primary font-bold">{treeAssignments.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Managers:</span>
                    <strong className="text-foreground">{availableTreeManagers.length}</strong>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Database Assignment Guarantee
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Submitting will atomically set <code className="font-mono bg-background/50 px-1 rounded">team_id</code> and <code className="font-mono bg-background/50 px-1 rounded">reportsTo</code> for all assigned members in MongoDB.
              </p>
            </div>
          </div>

          {/* Right Panel: Interactive Tree Canvas Workspace */}
          <div className="lg:col-span-8 flex flex-col overflow-hidden bg-muted/10">
            <div className="px-6 py-3 border-b bg-card flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Network className="h-4 w-4 text-primary" /> Visual Team Tree Canvas
              </span>
              {selectedLead && (
                <Badge variant="secondary" className="text-xs">
                  {treeAssignments.length} Subordinates in Hierarchy
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!draftTree ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <FolderTree className="h-12 w-12 mb-3 text-muted-foreground/40" />
                  <h3 className="text-base font-semibold text-foreground mb-1">No Team Head Selected</h3>
                  <p className="text-xs max-w-sm">
                    Select a Team Head on the left panel to begin building your visual multi-tier team tree.
                  </p>
                </div>
              ) : (
                <div className="border rounded-2xl p-5 bg-card shadow-sm space-y-4 min-h-[400px]">
                  <DraftTreeNodeView
                    node={draftTree}
                    depth={0}
                    allUsers={allUsers}
                    treeAssignments={treeAssignments}
                    onAddSubordinate={handleAddSubordinate}
                    onRemoveSubordinate={handleRemoveSubordinate}
                    onReassignManager={handleReassignManager}
                    availableTreeManagers={availableTreeManagers}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full Screen Footer */}
        <div className="px-6 py-3.5 border-t flex items-center justify-end gap-3 bg-card shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selectedLeadId || isLoading} className="gap-2">
            {isLoading ? "Saving Team Tree..." : initialTeam ? "Save Team Tree Changes" : "Create Team Tree"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------
// Change Team Head Modal Component
// ------------------------------------------------------------------
function ChangeHeadModal({
  team,
  onOpenChange,
  allUsers,
}: {
  team: OrgNode | null;
  onOpenChange: (open: boolean) => void;
  allUsers: TeamUser[];
}) {
  const [newLeadId, setNewLeadId] = useState("");
  const [updateTeam, { isLoading }] = useUpdateTeamMutation();

  const potentialLeads = useMemo(() => {
    return allUsers.filter((u) => ["super_admin", "admin", "manager"].includes(u.role));
  }, [allUsers]);

  const currentHeadId = team?.lead?._id || team?._id;

  const handleSave = async () => {
    if (!team || !newLeadId) return;
    try {
      const res = await updateTeam({
        id: team.teamId || team._id,
        newLeadId,
      }).unwrap();
      toast.success(res.message || `Team Head updated for "${team.name}"!`);
      onOpenChange(false);
      setNewLeadId("");
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to update Team Head.");
    }
  };

  return (
    <Dialog open={!!team} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" /> Change Team Head
          </DialogTitle>
          <DialogDescription>
            Reassign the Team Head for <strong>{team?.name}</strong>. The static team name and member list will remain intact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Current Team Head</label>
            <p className="text-sm text-muted-foreground font-medium">
              {team?.lead ? `${team.lead.name} (${formatRoleLabel(team.lead.role)})` : team?.name}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Select New Team Head *</label>
            <Select value={newLeadId} onValueChange={setNewLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Select new Team Head..." />
              </SelectTrigger>
              <SelectContent>
                {potentialLeads.map((u) => (
                  <SelectItem key={u._id} value={u._id} disabled={u._id === currentHeadId}>
                    <div className="flex items-center justify-between gap-2">
                      <span>{u.name}</span>
                      <span className="text-xs text-muted-foreground">({formatRoleLabel(u.role)})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
            <p className="font-semibold mb-0.5">Static Team Preservation</p>
            <p>
              Changing the Team Head will update the leadership of <strong>{team?.name}</strong> without destroying or renaming the team.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!newLeadId || isLoading}>
            {isLoading ? "Saving..." : "Change Team Head"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



// ------------------------------------------------------------------
// Users Tab Component
// ------------------------------------------------------------------
function UsersTab({
  onRemoveFromTeam,
}: {
  onRemoveFromTeam: (user: TeamUser) => void;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [moveTarget, setMoveTarget] = useState<TeamUser | null>(null);
  const [newManagerId, setNewManagerId] = useState("");

  const { data, isLoading } = useGetTeamUsersQuery({
    search: search || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    teamRootId: teamFilter !== "all" ? teamFilter : undefined,
    page,
    limit: 20,
  });

  const [moveUser, { isLoading: isMoving }] = useMoveUserMutation();
  const [activateUser] = useActivateUserMutation();
  const [deactivateUser] = useDeactivateUserMutation();

  const { data: allUsersData } = useGetTeamUsersQuery({ limit: 200 });
  const allUsers = allUsersData?.users || [];

  const availableTeams = useMemo(() => {
    const teamsMap = new Map<string, { id: string; name: string }>();
    for (const u of allUsers) {
      if (u.teamRoot) {
        teamsMap.set(u.teamRoot._id, {
          id: u.teamRoot._id,
          name: u.teamRoot.name,
        });
      }
    }
    return Array.from(teamsMap.values());
  }, [allUsers]);

  const targetRank = moveTarget ? (ROLE_RANKS[moveTarget.role] || 0) : 0;
  const potentialManagers = useMemo(() => {
    if (!moveTarget) return [];
    return allUsers.filter((u) => {
      if (u._id === moveTarget._id) return false;
      const managerRank = ROLE_RANKS[u.role] || 0;
      return managerRank >= targetRank;
    });
  }, [allUsers, moveTarget, targetRank]);

  const handleMove = async () => {
    if (!moveTarget || !newManagerId) return;
    try {
      await moveUser({ id: moveTarget._id, newManagerId }).unwrap();
      toast.success(`${moveTarget.name} assigned to new manager.`);
      setMoveTarget(null);
      setNewManagerId("");
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to move user.");
    }
  };

  const [statusConfirmTarget, setStatusConfirmTarget] = useState<TeamUser | null>(null);

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    try {
      if (statusConfirmTarget.status === "active") {
        await deactivateUser(statusConfirmTarget._id).unwrap();
        toast.success(`${statusConfirmTarget.name} deactivated.`);
      } else {
        await activateUser(statusConfirmTarget._id).unwrap();
        toast.success(`${statusConfirmTarget.name} activated.`);
      }
      setStatusConfirmTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || "Action failed.");
    }
  };

  const handleStatus = (user: TeamUser) => {
    setStatusConfirmTarget(user);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={teamFilter} onValueChange={(v) => { setTeamFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {availableTeams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="auditor">Auditor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Team</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Reports To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.users || []).map((u) => (
                <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {u.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] || ""}`}>
                      {formatRoleLabel(u.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {u.teamRoot ? (
                      <Badge variant="secondary" className="text-xs bg-muted/80 text-foreground font-normal">
                        <Layers className="h-3 w-3 mr-1 text-primary" />
                        {u.teamRoot.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {u.reportsTo ? (
                      <span className="text-muted-foreground font-medium">
                        {(u.reportsTo as any).name}{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          ({formatRoleLabel((u.reportsTo as any).role)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">None (Root)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === "active" ? "outline" : "destructive"} className="text-xs">
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.reportsTo && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Remove from team"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => onRemoveFromTeam(u)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Move user"
                        onClick={() => setMoveTarget(u)}
                      >
                        <MoveRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={u.status === "active" ? "Deactivate" : "Activate"}
                        onClick={() => handleStatus(u)}
                      >
                        {u.status === "active" ? (
                          <UserX className="h-4 w-4 text-destructive" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.users?.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No users found matching criteria.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <p className="text-muted-foreground">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of <strong>{data.total}</strong> users
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>

            <span className="px-2 font-medium">
              Page {page} of {Math.ceil(data.total / 20) || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={page * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Move User Dialog */}
      <Dialog open={!!moveTarget} onOpenChange={(o) => { if (!o) { setMoveTarget(null); setNewManagerId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move User</DialogTitle>
            <DialogDescription>
              Reassign <strong>{moveTarget?.name}</strong> ({formatRoleLabel(moveTarget?.role)}) to a manager.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold mb-0.5">Authority Hierarchy Rule</p>
                <p>
                  As a <strong>{formatRoleLabel(moveTarget?.role)}</strong>, this user can only report to a manager with equal or higher authority level (<strong>{formatRoleLabel(moveTarget?.role)}</strong> or higher). Lower authority roles are hidden.
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Current Manager</p>
              <p className="text-sm text-muted-foreground">
                {moveTarget?.reportsTo ? (
                  <span>
                    {(moveTarget.reportsTo as any).name} ({formatRoleLabel((moveTarget.reportsTo as any).role)})
                  </span>
                ) : (
                  "None (Root)"
                )}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Select New Manager</p>
              <Select value={newManagerId} onValueChange={setNewManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select compliant manager..." />
                </SelectTrigger>
                <SelectContent>
                  {potentialManagers.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{m.name}</span>
                        <span className="text-xs text-muted-foreground">({formatRoleLabel(m.role)})</span>
                      </div>
                    </SelectItem>
                  ))}
                  {potentialManagers.length === 0 && (
                    <div className="py-2 px-3 text-xs text-muted-foreground text-center">
                      No eligible managers with sufficient authority level found.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setMoveTarget(null); setNewManagerId(""); }}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!newManagerId || isMoving}>
              {isMoving ? "Saving..." : "Assign Manager"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate / Deactivate Confirmation Dialog */}
      <Dialog open={!!statusConfirmTarget} onOpenChange={(o) => { if (!o) setStatusConfirmTarget(null); }}>
        <DialogContent className="max-w-sm rounded-xl p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-base">
              {statusConfirmTarget?.status === "active" ? (
                <span className="text-destructive flex items-center gap-1.5"><UserX className="h-4 w-4" /> Deactivate User</span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1.5"><UserCheck className="h-4 w-4" /> Activate User</span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to {statusConfirmTarget?.status === "active" ? "deactivate" : "activate"} user <strong>{statusConfirmTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3">
            <Button variant="outline" size="sm" onClick={() => setStatusConfirmTarget(null)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              variant={statusConfirmTarget?.status === "active" ? "destructive" : "default"}
              className={`h-8 text-xs ${statusConfirmTarget?.status !== "active" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
              onClick={handleConfirmStatusChange}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------
// Team Report Tab Component
// ------------------------------------------------------------------
function TeamReportTab() {
  const { data, isLoading } = useGetTeamReportQuery();

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );

  const summary = data?.summary;
  const teamsList = Object.values(summary?.teams || {});

  return (
    <div className="space-y-6">
      {/* Role Breakdown Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["super_admin", "admin", "manager", "auditor"].map((role) => (
          <Card key={role} className="text-center">
            <CardContent className="pt-6 pb-4">
              <p className={`text-3xl font-bold ${role === "super_admin" ? "text-purple-600" :
                  role === "admin" ? "text-blue-600" :
                    role === "manager" ? "text-green-600" : "text-orange-600"
                }`}>
                {summary?.byRole?.[role] || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{formatRoleLabel(role)}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total & Active Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Organization Members</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{summary?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active / Inactive Status</CardTitle></CardHeader>
          <CardContent className="flex gap-6 items-center">
            <div>
              <p className="text-3xl font-bold text-green-600">{summary?.byStatus?.active || 0}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-destructive">{summary?.byStatus?.inactive || 0}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multiple Teams Breakdown Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Teams Overview ({teamsList.length} Teams)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamsList.map((t) => (
            <Card key={t.id} className="border shadow-sm">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-600 shrink-0" />
                    {t.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {t.total} {t.total === 1 ? "Member" : "Members"}
                  </Badge>
                </div>
                {t.teamLead && (
                  <CardDescription className="text-xs mt-1">
                    Head: <strong>{t.teamLead.name}</strong> ({formatRoleLabel(t.teamLead.role)})
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-3 text-xs space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Active / Inactive:</span>
                  <span className="font-medium">
                    <span className="text-green-600 font-semibold">{t.active}</span> active /{" "}
                    <span className="text-destructive font-semibold">{t.inactive}</span> inactive
                  </span>
                </div>
                <div className="py-1">
                  <p className="text-muted-foreground mb-1 font-semibold text-foreground">Role Composition:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(t.byRole).map(([r, count]) => (
                      <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                        {formatRoleLabel(r)}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main Team Manager Content Component
// ------------------------------------------------------------------
export function TeamManagerContent() {
  const user = useAppSelector((state) => state.auth.user);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [changeHeadTarget, setChangeHeadTarget] = useState<OrgNode | null>(null);
  const [editTeamTarget, setEditTeamTarget] = useState<OrgNode | null>(null);
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<OrgNode | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamUser | null>(null);

  const { data: hierarchy, isLoading: hierarchyLoading } = useGetOrgHierarchyQuery(undefined, {
    skip: user?.role !== "super_admin" && user?.role !== "admin",
  });

  const { data: allUsersData } = useGetTeamUsersQuery({ limit: 200 });
  const allUsers = allUsersData?.users || [];

  const [assignUser, { isLoading: isRemoving }] = useAssignUserMutation();
  const [deleteTeam, { isLoading: isDeletingTeam }] = useDeleteTeamMutation();

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await assignUser({ id: removeTarget._id, newManagerId: null }).unwrap();
      toast.success(`${removeTarget.name} removed from team.`);
      setRemoveTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to remove user from team.");
    }
  };

  const handleConfirmDeleteTeam = async () => {
    if (!deleteTeamTarget) return;
    try {
      await deleteTeam(deleteTeamTarget.teamId || deleteTeamTarget._id).unwrap();
      toast.success(`Team "${deleteTeamTarget.name}" deleted successfully.`);
      setDeleteTeamTarget(null);
    } catch (e: any) {
      toast.error(e?.data?.message || "Failed to delete team.");
    }
  };

  const hierarchyList: OrgNode[] = Array.isArray(hierarchy) ? hierarchy : hierarchy ? [hierarchy] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Network className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Team Manager</h1>
            <p className="text-sm text-muted-foreground">Manage organization teams, create multi-level team trees, and manage member hierarchy</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-50 text-amber-800 border-amber-200">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            Authority Reporting Policy Active
          </Badge>
          <Button className="gap-2" onClick={() => { setEditTeamTarget(null); setCreateModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Create Team Tree
          </Button>
        </div>
      </div>

      <Tabs defaultValue="org-tree">
        <TabsList className="flex-wrap">
          <TabsTrigger value="org-tree" className="gap-2">
            <Building2 className="h-4 w-4" /> Teams ({hierarchyList.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Users & Hierarchy
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Team Reports
          </TabsTrigger>
        </TabsList>

        {/* Static Teams Tree Tab */}
        <TabsContent value="org-tree" className="mt-4 space-y-4">
          {hierarchyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {hierarchyList.map((rootNode, index) => (
                <TeamCard
                  key={rootNode.teamId || rootNode._id}
                  rootNode={rootNode}
                  teamIndex={index}
                  onRemoveFromTeam={(u) => setRemoveTarget(u)}
                  onChangeHead={(t) => setChangeHeadTarget(t)}
                  onEditTeam={(t) => { setEditTeamTarget(t); setCreateModalOpen(true); }}
                  onDeleteTeam={(t) => setDeleteTeamTarget(t)}
                />
              ))}

              {!hierarchyList.length && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No teams available. Click &quot;Create Team Tree&quot; above to build a new team tree.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Team Members & Hierarchy
              </CardTitle>
              <CardDescription className="text-xs">
                Reassign reporting relationships or remove users from teams under strict authority rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTab onRemoveFromTeam={(u) => setRemoveTarget(u)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Teams Summary Report
              </CardTitle>
              <CardDescription className="text-xs">
                Aggregated statistics and breakdown across all organization teams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamReportTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateTeamModal
        open={createModalOpen || !!editTeamTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCreateModalOpen(false);
            setEditTeamTarget(null);
          }
        }}
        allUsers={allUsers}
        initialTeam={editTeamTarget}
      />

      <ChangeHeadModal
        team={changeHeadTarget}
        onOpenChange={(o) => { if (!o) setChangeHeadTarget(null); }}
        allUsers={allUsers}
      />

      {/* Delete Team Modal */}
      <Dialog open={!!deleteTeamTarget} onOpenChange={(o) => { if (!o) setDeleteTeamTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Team
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete static team <strong>{deleteTeamTarget?.name}</strong>? Members of this team will be unassigned to standalone status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeamTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteTeam} disabled={isDeletingTeam}>
              {isDeletingTeam ? "Deleting..." : "Delete Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserMinus className="h-5 w-5" /> Remove from Team
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.name}</strong> from their team? They will become a standalone user with no manager assigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} disabled={isRemoving}>
              {isRemoving ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TeamManagerPage() {
  const user = useAppSelector((state) => state.auth.user);

  if (user && user.role !== "super_admin" && user.role !== "admin") {
    return (
      <DashboardLayout title="Access Denied" subtitle="Super Admin & Admin feature">
        <div className="py-12 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 text-destructive opacity-80" />
          <h2 className="text-lg font-semibold mb-1 text-foreground">Access Denied</h2>
          <p className="text-sm">Team Manager is only accessible to Super Admin and Admin users.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Team Manager" subtitle="Manage organizational teams, team heads, and member tree hierarchy">
      <TeamManagerContent />
    </DashboardLayout>
  );
}
