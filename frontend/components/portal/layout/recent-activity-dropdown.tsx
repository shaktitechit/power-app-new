"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/portal/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/portal/ui/dropdown-menu";
import { useGetDashboardRecentActivitiesQuery } from "@/store/slices/dashboardApiSlice";
import { formatRelativeTime } from "./header-utils";

export function RecentActivityDropdown() {
  const { data, isLoading, isFetching } = useGetDashboardRecentActivitiesQuery(
    undefined,
    {
      pollingInterval: 30000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );

  const recentActivities = useMemo(() => {
    const list = data?.data || [];
    if (!Array.isArray(list)) return [];
    return [...list]
      .sort((a, b) => {
        const tb = new Date(b.createdAt || 0).getTime();
        const ta = new Date(a.createdAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 10);
  }, [data?.data]);

  const isLoadingState = isLoading || isFetching;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Activity className="h-5 w-5" />
          {recentActivities.length > 0 ? (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {recentActivities.length > 9 ? "9+" : recentActivities.length}
            </span>
          ) : null}
          <span className="sr-only">Recent activity</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[30rem] overflow-y-auto">
        <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          Latest actions in your workspace
        </p>
        <DropdownMenuSeparator />

        {isLoadingState ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading activities…
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          recentActivities.map((activity) => (
            <div
              key={activity._id}
              className="flex items-start gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
            >
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {activity.message || activity.entity_name || "Activity"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {activity.facility?.name || "No facility"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.actor?.name || "User"} •{" "}
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
