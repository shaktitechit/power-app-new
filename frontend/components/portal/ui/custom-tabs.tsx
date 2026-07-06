"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/components/portal/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
  /** When true, shows a blue tick before the label (audit step submitted) */
  completed?: boolean;
  /** Rendered after the tab label (e.g. audit submit); not part of the tab click target */
  trailingAction?: ReactNode;
  /** Optional icon to display, especially useful on mobile */
  icon?: React.ElementType;
}

interface CustomTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  /** Deprecated for flex layout, kept for backwards compatibility */
  tabGridClassName?: string;
  /** Tab strip placement; bottom uses a top border and active indicator above labels */
  position?: "top" | "bottom";
}

export function CustomTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  tabGridClassName,
  position = "top",
}: CustomTabsProps) {
  const isBottom = position === "bottom";

  return (
    <div
      className={cn(
        isBottom
          ? "border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          : "touch-pan-x overscroll-x-contain border-b border-border [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <nav
        aria-label="Tabs"
        className="flex min-w-0 flex-nowrap overflow-x-auto overflow-y-hidden scrollbar-hide no-scrollbar"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={cn(
                "flex shrink-0 items-stretch justify-center gap-0.5",
                isBottom ? "border-t-2" : "border-b-2",
                activeTab === tab.id
                  ? "border-primary"
                  : "border-transparent",
              )}
            >
              <button
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative min-w-0 flex-1 px-3 py-2 text-center text-xs font-medium transition-colors sm:px-4 sm:py-2.5 sm:text-sm whitespace-nowrap",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                  {Icon && <Icon className="h-4 w-4 shrink-0 sm:hidden" aria-hidden />}
                  {tab.completed ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                      aria-hidden
                    />
                  ) : null}
                  <span className={cn("truncate", Icon && "hidden sm:inline")}>{tab.label}</span>

                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] sm:text-xs",
                        activeTab === tab.id
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
              {tab.trailingAction ? (
                <div
                  className="flex shrink-0 items-center pr-1 sm:pr-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {tab.trailingAction}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
