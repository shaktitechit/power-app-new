"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/portal/ui/dropdown-menu";
import { usePresenceMap } from "@/components/portal/hooks/presenceMap";
import {
  type DashboardUserAppearance,
  useGetDashboardUserAppearanceQuery,
} from "@/store/slices/dashboardApiSlice";
import { formatRelativeTime, getPresenceDotClass } from "./header-utils";

function getMergedPresenceStatus(
  member: DashboardUserAppearance,
  presenceMap: Record<string, string>,
) {
  return presenceMap[member._id] || member.appearance?.status || "offline";
}

function getMergedPresenceTime(
  member: DashboardUserAppearance,
  presenceMap: Record<string, string>,
) {
  const liveStatus = presenceMap[member._id];

  if (liveStatus === "online" || liveStatus === "away") {
    return "Live now";
  }

  return formatRelativeTime(member.appearance?.lastSeen);
}

export function TeamPresenceDropdown() {
  const presenceMap = usePresenceMap();
  const { data, isLoading, isFetching } = useGetDashboardUserAppearanceQuery(
    undefined,
    {
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const teamMembers = data?.data || [];

  const onlineCount = useMemo(
    () =>
      teamMembers.filter(
        (member) => getMergedPresenceStatus(member, presenceMap) === "online",
      ).length,
    [teamMembers, presenceMap],
  );

  const isLoadingState = isLoading || isFetching;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Users className="h-5 w-5" />
          {onlineCount > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] font-medium text-white">
              {onlineCount > 9 ? "9+" : onlineCount}
            </span>
          ) : null}
          <span className="sr-only">Team presence</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[30rem] overflow-y-auto">
        <DropdownMenuLabel>Team presence</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          Who is online right now
        </p>
        <DropdownMenuSeparator />

        {isLoadingState ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading presence…
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No presence data
          </div>
        ) : (
          teamMembers.map((member) => {
            const mergedStatus = getMergedPresenceStatus(member, presenceMap);
            const mergedTime = getMergedPresenceTime(member, presenceMap);

            return (
              <div
                key={member._id}
                className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${getPresenceDotClass(
                      mergedStatus,
                    )}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.name}
                    </p>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {member.role}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs font-medium capitalize text-foreground">
                    {mergedStatus}
                  </p>
                  <p className="text-xs text-muted-foreground">{mergedTime}</p>
                </div>
              </div>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
