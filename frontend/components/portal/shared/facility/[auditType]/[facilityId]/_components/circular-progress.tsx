"use client";

import { cn } from "@/components/portal/lib/utils";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/portal/ui/hover-card";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  breakdown?: {
    label: string;
    isDone: boolean;
  }[];
}

export function CircularProgress({
  percentage,
  size = 40,
  strokeWidth = 4,
  className,
  breakdown,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const progressRing = (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track circle */}
        <circle
          className="text-muted/20 stroke-current"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={cn(
            "stroke-current transition-all duration-500 ease-out",
            percentage === 100
              ? "text-emerald-500"
              : percentage > 50
                ? "text-primary"
                : "text-amber-500"
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Center text */}
      <span className="absolute text-[9px] font-bold text-foreground">
        {percentage}%
      </span>
    </div>
  );

  if (!breakdown || breakdown.length === 0) {
    return progressRing;
  }

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild onClick={(e) => e.stopPropagation()}>
        <div className="cursor-help shrink-0">{progressRing}</div>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-64 select-none"
        align="end"
        side="top"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-foreground border-b pb-1 uppercase tracking-wide">
            Section Checklist
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px] leading-normal">
                <span className="text-muted-foreground font-medium truncate max-w-[180px]">
                  {item.label}
                </span>
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    item.isDone ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
