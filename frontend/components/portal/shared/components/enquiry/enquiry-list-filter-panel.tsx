"use client";

import { FilterX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Label } from "@/components/portal/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import {
  ENQUIRY_PIPELINE_STEPS,
  REQUESTED_AUDIT_TYPE_OPTIONS,
} from "@/components/portal/lib/enquiryConstants";
import {
  countActiveEnquiryListFilters,
  DEFAULT_ENQUIRY_LIST_FILTERS,
  type EnquiryListFilters,
  type EnquiryPipelineTab,
} from "@/components/portal/lib/enquiryListFilters";

type AssignableUser = { _id: string; name: string };

type EnquiryListFilterPanelProps = {
  filters: EnquiryListFilters;
  onChange: (next: EnquiryListFilters) => void;
  assignableAuditors: AssignableUser[];
  assignableManagers: AssignableUser[];
  assignableAdmins: AssignableUser[];
  showSearch?: boolean;
  showPipeline?: boolean;
  className?: string;
};

export function EnquiryListFilterPanel({
  filters,
  onChange,
  assignableAuditors,
  assignableManagers,
  assignableAdmins,
  showSearch = false,
  showPipeline = false,
  className,
}: EnquiryListFilterPanelProps) {
  const patch = (partial: Partial<EnquiryListFilters>) => {
    onChange({ ...filters, ...partial });
  };

  const activeCount = countActiveEnquiryListFilters(filters);

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {activeCount} active
            </span>
          ) : null}
        </div>
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_ENQUIRY_LIST_FILTERS)}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <FilterX className="mr-1.5 h-3.5 w-3.5" />
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {showSearch ? (
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Search
            </Label>
            <Input
              value={filters.searchQuery}
              onChange={(event) => patch({ searchQuery: event.target.value })}
              placeholder="Name, city, status, contacts, notes…"
              className="h-9 bg-background"
            />
          </div>
        ) : null}

        {showPipeline ? (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pipeline stage
            </Label>
            <Select
              value={filters.pipelineTab}
              onValueChange={(value) =>
                patch({ pipelineTab: value as EnquiryPipelineTab })
              }
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {ENQUIRY_PIPELINE_STEPS.map((step) => (
                  <SelectItem key={step.key} value={step.key}>
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Audit Type
          </Label>
          <Select
            value={filters.filterAuditType}
            onValueChange={(value) => patch({ filterAuditType: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Audit Types</SelectItem>
              {REQUESTED_AUDIT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned Auditor
          </Label>
          <Select
            value={filters.filterAssignedTo}
            onValueChange={(value) => patch({ filterAssignedTo: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Auditors</SelectItem>
              {assignableAuditors.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned Manager
          </Label>
          <Select
            value={filters.filterAssignedManager}
            onValueChange={(value) => patch({ filterAssignedManager: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Managers</SelectItem>
              {assignableManagers.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned Admin
          </Label>
          <Select
            value={filters.filterAssignedAdmin}
            onValueChange={(value) => patch({ filterAssignedAdmin: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assigned Admins</SelectItem>
              {assignableAdmins.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Next Follow Up
          </Label>
          <Select
            value={filters.filterFollowUpRange}
            onValueChange={(value) => patch({ filterFollowUpRange: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="this_week">This Week (Next 7 Days)</SelectItem>
              <SelectItem value="next_week">Next 2 Weeks (Next 14 Days)</SelectItem>
              <SelectItem value="custom">Custom Range…</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Created At
          </Label>
          <Select
            value={filters.filterCreatedAtRange}
            onValueChange={(value) => patch({ filterCreatedAtRange: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_week">Last 7 Days</SelectItem>
              <SelectItem value="last_month">Last 30 Days</SelectItem>
              <SelectItem value="3_months">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range…</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(filters.filterFollowUpRange === "custom" ||
        filters.filterCreatedAtRange === "custom") && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filters.filterFollowUpRange === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Follow-up From</Label>
                <Input
                  type="date"
                  value={filters.filterFollowUpFrom}
                  onChange={(event) =>
                    patch({ filterFollowUpFrom: event.target.value })
                  }
                  className="mt-1 h-9 bg-background text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Follow-up To</Label>
                <Input
                  type="date"
                  value={filters.filterFollowUpTo}
                  onChange={(event) =>
                    patch({ filterFollowUpTo: event.target.value })
                  }
                  className="mt-1 h-9 bg-background text-xs"
                />
              </div>
            </div>
          )}
          {filters.filterCreatedAtRange === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Created From</Label>
                <Input
                  type="date"
                  value={filters.filterCreatedAtFrom}
                  onChange={(event) =>
                    patch({ filterCreatedAtFrom: event.target.value })
                  }
                  className="mt-1 h-9 bg-background text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Created To</Label>
                <Input
                  type="date"
                  value={filters.filterCreatedAtTo}
                  onChange={(event) =>
                    patch({ filterCreatedAtTo: event.target.value })
                  }
                  className="mt-1 h-9 bg-background text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
