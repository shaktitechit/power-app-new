"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CircleSlash,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react";
import {
  FOLLOW_UP_MODE_OPTIONS,
  FOLLOW_UP_OUTCOME_OPTIONS,
} from "@/components/portal/lib/enquiryConstants";
import { cn } from "@/components/portal/lib/utils";
import type { FollowUp } from "@/store/slices/enquiryApiSlice";

export type FollowUpMode = NonNullable<FollowUp["mode"]>;
export type FollowUpOutcome = NonNullable<FollowUp["outcome"]>;

const MODE_ICON: Record<FollowUpMode, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  whatsapp: MessageCircle,
};

const OUTCOME_ICON: Record<FollowUpOutcome, LucideIcon> = {
  no_response: CircleSlash,
  interested: ThumbsUp,
  not_interested: ThumbsDown,
  callback_later: Clock,
  meeting_scheduled: CalendarClock,
};

const OUTCOME_PILL: Record<FollowUpOutcome, string> = {
  no_response: "bg-muted text-muted-foreground border border-border",
  interested:
    "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  not_interested:
    "bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-red-200",
  callback_later:
    "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  meeting_scheduled:
    "bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
};

export function followUpModeLabel(mode?: string | null) {
  return (
    FOLLOW_UP_MODE_OPTIONS.find((option) => option.value === mode)?.label ??
    (mode ? mode.replace(/_/g, " ") : "")
  );
}

export function followUpOutcomeLabel(outcome?: string | null) {
  return (
    FOLLOW_UP_OUTCOME_OPTIONS.find((option) => option.value === outcome)
      ?.label ?? (outcome ? outcome.replace(/_/g, " ") : "")
  );
}

const OPTION_BUTTON =
  "flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

function OptionButton({
  active,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        OPTION_BUTTON,
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-input bg-background text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Mode of contact as a button group — click the active one again to clear it. */
export function FollowUpModePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {FOLLOW_UP_MODE_OPTIONS.map((option) => (
        <OptionButton
          key={option.value}
          active={value === option.value}
          disabled={disabled}
          icon={MODE_ICON[option.value]}
          label={option.label}
          onClick={() => onChange(value === option.value ? "" : option.value)}
        />
      ))}
    </div>
  );
}

/** Reply outcome as a button group — click the active one again to clear it. */
export function FollowUpOutcomePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FOLLOW_UP_OUTCOME_OPTIONS.map((option) => (
        <OptionButton
          key={option.value}
          active={value === option.value}
          disabled={disabled}
          icon={OUTCOME_ICON[option.value]}
          label={option.label}
          onClick={() => onChange(value === option.value ? "" : option.value)}
        />
      ))}
    </div>
  );
}

export function FollowUpModeBadge({ mode }: { mode?: string | null }) {
  if (!mode) return <span className="text-sm text-muted-foreground">—</span>;
  const Icon = MODE_ICON[mode as FollowUpMode];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
      {followUpModeLabel(mode)}
    </span>
  );
}

export function FollowUpOutcomePill({ outcome }: { outcome?: string | null }) {
  if (!outcome) {
    return <span className="text-sm text-muted-foreground">Awaiting reply</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        OUTCOME_PILL[outcome as FollowUpOutcome] ??
          "bg-muted text-muted-foreground border border-border",
      )}
    >
      {followUpOutcomeLabel(outcome)}
    </span>
  );
}
