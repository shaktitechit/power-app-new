import { cn } from "@/components/portal/lib/utils";
import { Card, CardContent } from "@/components/portal/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("gap-0 border-border bg-card py-0", className)}>
      <CardContent className="flex min-w-0 items-center gap-3 p-3 sm:gap-3 sm:p-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
              {title}
            </p>
            <p className="break-words text-xl font-bold leading-tight text-card-foreground sm:text-2xl">
              {value}
            </p>
            {description && (
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {trend && (
              <div className="flex flex-wrap items-center gap-1">
                <span
                  className={cn(
                    "text-xs font-medium sm:text-sm",
                    trend.isPositive ? "text-primary" : "text-destructive",
                  )}
                >
                  {trend.isPositive ? "+" : "-"}
                  {Math.abs(trend.value)}%
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline sm:text-sm">
                  vs last month
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
