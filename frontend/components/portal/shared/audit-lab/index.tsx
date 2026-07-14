"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Button } from "@/components/portal/ui/button";
import { Label } from "@/components/portal/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/portal/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/portal/ui/command";
import {
  type Facility,
  useGetFacilitiesQuery,
} from "@/store/slices/facilityApiSlice";
import {
  AUDIT_TYPE_OPTIONS,
  type AuditTypeOption,
} from "@/components/portal/lib/facilityConstants";
import { Check, ChevronsUpDown, Loader2, FlaskConical } from "lucide-react";
import { cn } from "@/components/portal/lib/utils";

// ─── Sub-modules imports ───
import ElectricalEnergyLab from "./_components/electrical-energy";
import ElectricalSafetyLab from "./_components/electrical-safety";
import LighteningArresterLab from "./_components/lightening-arresters-audit";
import ThermalLab from "./_components/thermal-audit";

/** Returns true if the facility audit is closed. */
function isFacilityClosed(facility: Facility): boolean {
  return Boolean(facility.audit_closure?.closed_at);
}

/** Inline status badge showing if audit is Open or Closed. */
function AuditStatusBadge({ closed }: { closed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        closed
          ? "border-destructive/30 bg-destructive/15 text-destructive dark:border-destructive/40 dark:bg-destructive/20"
          : "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current")} />
      {closed ? "Closed" : "Open"}
    </span>
  );
}

export default function AuditLabPage() {
  const { data: facilitiesResponse, isLoading: facilitiesLoading } =
    useGetFacilitiesQuery();

  const facilities: Facility[] = useMemo(() => {
    const raw = facilitiesResponse?.data ?? facilitiesResponse ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [facilitiesResponse]);

  const [auditType, setAuditType] = useState<AuditTypeOption>("Electrical Energy Audit");
  const [facilityId, setFacilityId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadedData, setLoadedData] = useState<{
    auditType: AuditTypeOption;
    facility: Facility;
  } | null>(null);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);

  // Keep popover width in sync with the trigger button
  useEffect(() => {
    if (!popoverOpen) return;
    const el = triggerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setPopoverWidth(el.offsetWidth);
    });
    observer.observe(el);
    setPopoverWidth(el.offsetWidth);
    return () => observer.disconnect();
  }, [popoverOpen]);

  // Filter facilities as per selected audit type
  const facilitiesForAuditType = useMemo(
    () => facilities.filter((f) => f.audit_type === auditType),
    [facilities, auditType],
  );

  // Reset selected facility if it is no longer valid for the selected audit type
  useEffect(() => {
    if (!facilityId) return;
    const stillValid = facilitiesForAuditType.some((f) => f._id === facilityId);
    if (!stillValid) {
      setFacilityId("");
    }
  }, [auditType, facilitiesForAuditType, facilityId]);

  const selectedFacility = facilitiesForAuditType.find((f) => f._id === facilityId);
  const isFacilityDisabled = facilitiesLoading || facilitiesForAuditType.length === 0;

  const triggerPlaceholder = facilitiesLoading
    ? "Loading facilities…"
    : facilitiesForAuditType.length === 0
      ? "No facilities for this program"
      : "Select facility…";

  const handleLoad = () => {
    if (!selectedFacility) return;
    setIsLoading(true);
    // Simulate snapshot load/initialization
    setTimeout(() => {
      setLoadedData({
        auditType,
        facility: selectedFacility,
      });
      setIsLoading(false);
    }, 600);
  };

  return (
    <DashboardLayout
      title="Audit Lab"
      subtitle="Advanced audit data explorer"
      isFullscreen
    >
      <div className="flex flex-col min-h-screen">
        {/* ── Top Strip Control Panel (Flush layout with zero outer padding/margin) ── */}
        <div className="border-b border-border bg-card/60 backdrop-blur-md px-4 sm:px-6 py-3 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 md:max-w-3xl">
              {/* Select Audit Type */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Audit Type
                </Label>
                <Select
                  value={auditType}
                  onValueChange={(v) => setAuditType(v as AuditTypeOption)}
                  disabled={facilitiesLoading}
                >
                  <SelectTrigger className="h-9 w-full bg-background/50">
                    <SelectValue placeholder="Select audit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Searchable Facility Combobox */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Facility
                </Label>
                <Popover
                  open={popoverOpen}
                  onOpenChange={isFacilityDisabled ? undefined : setPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      ref={triggerRef}
                      type="button"
                      role="combobox"
                      aria-expanded={popoverOpen}
                      disabled={isFacilityDisabled}
                      onClick={() => !isFacilityDisabled && setPopoverOpen((p) => !p)}
                      className={cn(
                        "flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm shadow-sm ring-offset-background",
                        "transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        popoverOpen && "ring-2 ring-ring ring-offset-2",
                      )}
                    >
                      {selectedFacility ? (
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-left">
                            {selectedFacility.name}
                            {selectedFacility.city ? ` · ${selectedFacility.city}` : ""}
                          </span>
                          <AuditStatusBadge closed={isFacilityClosed(selectedFacility)} />
                        </span>
                      ) : (
                        <span className="truncate text-left text-muted-foreground">
                          {triggerPlaceholder}
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="start"
                    className="p-0"
                    style={{ width: popoverWidth ? `${popoverWidth}px` : undefined }}
                  >
                    <Command>
                      <CommandInput placeholder="Search facility…" />
                      <CommandList>
                        <CommandEmpty>No facilities found.</CommandEmpty>
                        <CommandGroup>
                          {facilitiesForAuditType.map((f) => {
                            const closed = isFacilityClosed(f);
                            return (
                              <CommandItem
                                key={f._id}
                                value={`${f.name} ${f.city ?? ""}`}
                                onSelect={() => {
                                  setFacilityId(f._id === facilityId ? "" : f._id);
                                  setPopoverOpen(false);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Check
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    facilityId === f._id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {f.name}
                                  {f.city ? (
                                    <span className="text-muted-foreground"> · {f.city}</span>
                                  ) : null}
                                </span>
                                <AuditStatusBadge closed={closed} />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Load Button */}
            <Button
              type="button"
              className="h-9 w-full md:w-auto min-w-[100px]"
              disabled={!selectedFacility || isLoading}
              onClick={handleLoad}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load"
              )}
            </Button>
          </div>
        </div>

        {/* ── Workspace / Loaded Content Area ── */}
        <div className="flex-1 min-h-[50vh]">
          {loadedData ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {loadedData.auditType === "Electrical Energy Audit" && (
                <ElectricalEnergyLab facility={loadedData.facility} />
              )}
              {loadedData.auditType === "Electrical Safety Audit" && (
                <ElectricalSafetyLab facility={loadedData.facility} />
              )}
              {loadedData.auditType === "Lightning Arrester Audit" && (
                <LighteningArresterLab facility={loadedData.facility} />
              )}
              {loadedData.auditType === "Thermal Audit" && (
                <ThermalLab facility={loadedData.facility} />
              )}
            </div>
          ) : (
            <div className="h-full min-h-[45vh] rounded-xl border border-dashed border-border/60 bg-muted/5 p-8 flex flex-col items-center justify-center text-center">
              <div className="space-y-4 max-w-md">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
                  <FlaskConical className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Ready to Load Workspace</h3>
                  <p className="text-sm text-muted-foreground">
                    Select an audit program and a facility above, then click Load to initialize the workspace sandbox.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
