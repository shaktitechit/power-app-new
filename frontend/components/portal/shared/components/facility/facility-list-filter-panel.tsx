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
import { AUDIT_TYPE_OPTIONS } from "@/components/portal/lib/facilityConstants";
import {
  countActiveFacilityListFilters,
  DEFAULT_FACILITY_LIST_FILTERS,
  type FacilityListFilters,
} from "@/components/portal/lib/facilityListFilters";

type FacilityListFilterPanelProps = {
  filters: FacilityListFilters;
  onChange: (next: FacilityListFilters) => void;
  uniqueAuditors: { key: string; name: string }[];
  className?: string;
};

export function FacilityListFilterPanel({
  filters,
  onChange,
  uniqueAuditors,
  className,
}: FacilityListFilterPanelProps) {
  const patch = (partial: Partial<FacilityListFilters>) => {
    onChange({ ...filters, ...partial });
  };

  const activeCount = countActiveFacilityListFilters(filters);

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
            onClick={() => onChange(DEFAULT_FACILITY_LIST_FILTERS)}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <FilterX className="mr-1.5 h-3.5 w-3.5" />
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Audit type</Label>
          <Select
            value={filters.auditTypeFilter}
            onValueChange={(value) => patch({ auditTypeFilter: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="All audits" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audits</SelectItem>
              {AUDIT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Auditor / team</Label>
          <Select
            value={filters.auditorFilter}
            onValueChange={(value) => patch({ auditorFilter: value })}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="All auditors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All auditors</SelectItem>
              {uniqueAuditors.map((auditor) => (
                <SelectItem key={auditor.key} value={auditor.key}>
                  {auditor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start date (from)</Label>
          <Input
            type="date"
            className="h-9 bg-background"
            value={filters.startDateFrom}
            onChange={(e) => patch({ startDateFrom: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start date (to)</Label>
          <Input
            type="date"
            className="h-9 bg-background"
            value={filters.startDateTo}
            onChange={(e) => patch({ startDateTo: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Closure (from)</Label>
          <Input
            type="date"
            className="h-9 bg-background"
            value={filters.closureDateFrom}
            onChange={(e) => patch({ closureDateFrom: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Closure (to)</Label>
          <Input
            type="date"
            className="h-9 bg-background"
            value={filters.closureDateTo}
            onChange={(e) => patch({ closureDateTo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
