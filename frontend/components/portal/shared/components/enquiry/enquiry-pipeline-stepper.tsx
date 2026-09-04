"use client";

import {
  ENQUIRY_PIPELINE_STEPS,
  decisionStatusLabel,
  pipelineStepIndex,
  TERMINAL_ENQUIRY_STATUSES,
  pipelineStatusValue,
} from "@/components/portal/lib/enquiryConstants";
import { Check } from "lucide-react";

export function EnquiryPipelineStepper({ status }: { status: string }) {
  const current = pipelineStepIndex(status);
  const canonical = pipelineStatusValue(status);
  const isDecision = TERMINAL_ENQUIRY_STATUSES.has(canonical);

  return (
    <ol className="flex w-full min-w-0 items-start gap-1 overflow-x-auto pb-1">
      {ENQUIRY_PIPELINE_STEPS.map((step, index) => {
        const done = index < current || (index === current && isDecision && step.key === "decision");
        const active = index === current;
        const label =
          step.key === "decision" && isDecision
            ? decisionStatusLabel(status)
            : step.label;

        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1">
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span
                className={[
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "border-2 border-primary bg-background text-primary"
                      : "border border-border bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span
                className={[
                  "max-w-[4.5rem] text-center text-[10px] leading-tight sm:max-w-none",
                  active || done
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {index < ENQUIRY_PIPELINE_STEPS.length - 1 ? (
              <span
                className={[
                  "mb-4 hidden h-px min-w-3 flex-1 sm:block",
                  index < current ? "bg-primary" : "bg-border",
                ].join(" ")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
