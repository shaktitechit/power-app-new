"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/portal/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/portal/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/portal/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/components/portal/lib/utils";
import type { FacilityAuditEnergyUtilityNest } from "@/store/slices/auditApiSlice";

interface AccountSelectorPopoverProps {
  utilityAccounts: FacilityAuditEnergyUtilityNest[];
  activeAccountIndex: number;
  onSelectAccountIndex: (index: number) => void;
}

export function AccountSelectorPopover({
  utilityAccounts,
  activeAccountIndex,
  onSelectAccountIndex,
}: AccountSelectorPopoverProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>(undefined);

  const activeAccount = activeAccountIndex === -1 ? null : (utilityAccounts[activeAccountIndex] || null);
  const activeAccDetails = activeAccount?.utility_account as any;

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

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={popoverOpen}
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background/50 px-3 py-1.5 text-sm shadow-sm ring-offset-background",
            "transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            popoverOpen && "ring-2 ring-ring ring-offset-2"
          )}
        >
          {activeAccountIndex === -1 ? (
            <span className="flex min-w-0 flex-1 items-center justify-between pr-2">
              <span className="truncate font-semibold text-left text-primary">
                All Connected Accounts
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  · Aggregate View ({utilityAccounts.length})
                </span>
              </span>
            </span>
          ) : activeAccDetails ? (
            <span className="flex min-w-0 flex-1 items-center justify-between pr-2">
              <span className="truncate font-semibold text-left">
                No. {activeAccDetails.account_number}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">
                  · {activeAccDetails.location || "No Location"}
                </span>
              </span>
              <Badge
                variant={activeAccDetails.connection_type === "HT" ? "destructive" : "secondary"}
                className="text-[9px] px-1.5 py-0.2 shrink-0 ml-2"
              >
                {activeAccDetails.connection_type || "LT"}
              </Badge>
            </span>
          ) : (
            <span className="text-muted-foreground">Select utility account…</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="p-0"
        style={{ width: popoverWidth ? `${popoverWidth}px` : undefined }}
      >
        <Command>
          <CommandInput placeholder="Search account number or location…" />
          <CommandList>
            <CommandEmpty>No accounts found.</CommandEmpty>
            <CommandGroup>
              {/* Option to select All Accounts */}
              <CommandItem
                value="all accounts connected aggregate view"
                onSelect={() => {
                  onSelectAccountIndex(-1);
                  setPopoverOpen(false);
                }}
                className="flex items-center justify-between font-semibold text-primary"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      activeAccountIndex === -1 ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>All Connected Accounts ({utilityAccounts.length})</span>
                </div>
              </CommandItem>

              {utilityAccounts.map((nest, idx) => {
                const acc = nest.utility_account as any;
                return (
                  <CommandItem
                    key={acc?._id || idx}
                    value={`${acc?.account_number || ""} ${acc?.location || ""}`}
                    onSelect={() => {
                      onSelectAccountIndex(idx);
                      setPopoverOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          activeAccountIndex === idx ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate font-medium">
                        No. {acc?.account_number || "—"}
                        {acc?.location && (
                          <span className="text-muted-foreground font-normal"> · {acc.location}</span>
                        )}
                      </span>
                    </div>
                    <Badge
                      variant={acc?.connection_type === "HT" ? "destructive" : "secondary"}
                      className="text-[9px] px-1.5 py-0.2 shrink-0 ml-2"
                    >
                      {acc?.connection_type || "LT"}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
