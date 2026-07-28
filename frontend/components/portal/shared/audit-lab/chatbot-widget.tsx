"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useChatCompletionMutation } from "@/store/slices/openRouterApiSlice";
import {
  useLazyGetElectricalEnergyAuditSnapshotQuery,
  useLazyGetElectricalSafetyAuditSnapshotQuery,
} from "@/store/slices/auditApiSlice";
import {
  type Facility,
  useGetFacilitiesQuery,
} from "@/store/slices/facilityApiSlice";
import {
  AUDIT_TYPE_OPTIONS,
  type AuditTypeOption,
} from "@/components/portal/lib/facilityConstants";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
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
import { cn } from "@/components/portal/lib/utils";
import {
  AUDIT_AI_SYSTEM_PROMPT,
  buildAnalysisMessages,
  parseStructuredAuditAiResponse,
  type StructuredAuditAiResponse,
} from "./lib/audit-ai-types";
import {
  extractQuestionPayload,
  getQuestionsForAuditType,
  serializeAuditPayload,
  type AuditQuestionDefinition,
  type LoadedAuditContext,
} from "./lib/audit-questions";
import { StructuredAiResponse } from "./components/structured-ai-response";

type WizardStep = "setup" | "analysis";

interface AnalysisTurn {
  id: string;
  userText: string;
  response: StructuredAuditAiResponse | null;
  rawFallback: string | null;
  error: string | null;
}

interface QuestionSession {
  turns: AnalysisTurn[];
  isLoading: boolean;
}

function LadyAvatar({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="32" cy="32" r="30" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5" />
      <path d="M16 34C16 20 24 12 32 12C40 12 48 20 48 34" fill="#374151" />
      <path d="M22 34C22 41 26 46 32 46C38 46 42 41 42 34V28H22V34Z" fill="#FDE047" />
      <circle cx="28" cy="31" r="2" fill="#1F2937" />
      <circle cx="36" cy="31" r="2" fill="#1F2937" />
      <path d="M28 38C29.5 40 34.5 40 36 38" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
      <circle cx="25" cy="35" r="1.5" fill="#F87171" opacity="0.6" />
      <circle cx="39" cy="35" r="1.5" fill="#F87171" opacity="0.6" />
      <path d="M16 28C20 24 25 22 32 24C39 22 44 24 48 28C48 28 49 20 44 16C39 12 25 12 20 16C15 20 16 28 16 28Z" fill="#1F2937" />
      <path d="M24 54C24 50 28 47 32 47C36 47 40 50 40 54" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
      <path d="M19 32C19 23 23 18 32 18C41 18 45 23 45 32" stroke="#4B5563" strokeWidth="2" fill="none" />
      <path d="M44 32C44 35 41 37 39 37" stroke="#4B5563" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="37" r="1.5" fill="#EF4444" />
    </svg>
  );
}

function isFacilityClosed(facility: Facility): boolean {
  return Boolean(facility.audit_closure?.closed_at);
}

function AuditStatusBadge({ closed }: { closed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        closed
          ? "border-destructive/30 bg-destructive/15 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {closed ? "Closed" : "Open"}
    </span>
  );
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("setup");

  const [auditType, setAuditType] = useState<AuditTypeOption>("Electrical Energy Audit");
  const [facilityId, setFacilityId] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | undefined>();

  const [loadedContext, setLoadedContext] = useState<LoadedAuditContext | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, QuestionSession>>({});
  const [followUpInput, setFollowUpInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const contentEndRef = useRef<HTMLDivElement>(null);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const { data: facilitiesResponse, isLoading: facilitiesLoading } = useGetFacilitiesQuery();
  const [fetchEnergySnapshot, { isFetching: energyLoading }] =
    useLazyGetElectricalEnergyAuditSnapshotQuery();
  const [fetchSafetySnapshot, { isFetching: safetyLoading }] =
    useLazyGetElectricalSafetyAuditSnapshotQuery();
  const [chatCompletion] = useChatCompletionMutation();

  const facilities: Facility[] = useMemo(() => {
    const raw = facilitiesResponse?.data ?? facilitiesResponse ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [facilitiesResponse]);

  const facilitiesForAuditType = useMemo(
    () => facilities.filter((f) => f.audit_type === auditType),
    [facilities, auditType],
  );

  const selectedFacility = facilitiesForAuditType.find((f) => f._id === facilityId);
  const isFacilityDisabled = facilitiesLoading || facilitiesForAuditType.length === 0;
  const dataLoading = energyLoading || safetyLoading;

  const questions = useMemo(
    () => (loadedContext ? getQuestionsForAuditType(loadedContext.auditType) : []),
    [loadedContext],
  );

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) ?? questions[0] ?? null;
  const activeSession = activeQuestion ? sessions[activeQuestion.id] : undefined;
  const isAnalyzing = activeSession?.isLoading ?? false;

  useEffect(() => {
    if (!facilityId) return;
    const stillValid = facilitiesForAuditType.some((f) => f._id === facilityId);
    if (!stillValid) setFacilityId("");
  }, [auditType, facilitiesForAuditType, facilityId]);

  useEffect(() => {
    if (!popoverOpen) return;
    const el = triggerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setPopoverWidth(el.offsetWidth));
    observer.observe(el);
    setPopoverWidth(el.offsetWidth);
    return () => observer.disconnect();
  }, [popoverOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (step === "analysis") {
      contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [step, activeSession?.turns.length, isAnalyzing]);

  const resetWizard = () => {
    setStep("setup");
    setLoadedContext(null);
    setActiveQuestionId(null);
    setSessions({});
    setFollowUpInput("");
    setError(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetWizard();
  };

  const runAnalysis = useCallback(
    async (
      question: AuditQuestionDefinition,
      options: { followUpText?: string; isInitial?: boolean } = {},
      contextOverride?: LoadedAuditContext,
    ) => {
      const ctx = contextOverride ?? loadedContext;
      if (!ctx) return;

      const turnId = `${question.id}-${Date.now()}`;
      const userText = options.isInitial
        ? question.label
        : (options.followUpText?.trim() ?? "");

      if (!userText) return;

      setSessions((prev) => ({
        ...prev,
        [question.id]: {
          turns: options.isInitial ? [] : (prev[question.id]?.turns ?? []),
          isLoading: true,
        },
      }));

      const payload = extractQuestionPayload(ctx, question);
      const dataJson = serializeAuditPayload(payload);

      const priorSession = options.isInitial ? undefined : sessionsRef.current[question.id];
      const priorTurns = (priorSession?.turns ?? []).flatMap((turn) => {
        const msgs: { role: "user" | "assistant"; content: string }[] = [
          { role: "user", content: turn.userText },
        ];
        if (turn.response) {
          msgs.push({ role: "assistant", content: JSON.stringify(turn.response) });
        } else if (turn.rawFallback) {
          msgs.push({ role: "assistant", content: turn.rawFallback });
        }
        return msgs;
      });

      const userMessages = buildAnalysisMessages({
        questionPrompt: question.prompt,
        auditDataJson: dataJson,
        priorTurns,
        followUpText: options.isInitial ? undefined : options.followUpText,
      });

      try {
        const response = await chatCompletion({
          messages: [
            { role: "system", content: AUDIT_AI_SYSTEM_PROMPT },
            ...userMessages,
          ],
          options: { temperature: 0.1, max_tokens: 4096 },
        }).unwrap();

        const content = response.choices?.[0]?.message?.content ?? "";
        const parsed = parseStructuredAuditAiResponse(content);

        setSessions((prev) => {
          const existing = prev[question.id] ?? { turns: [], isLoading: false };
          const newTurn: AnalysisTurn = {
            id: turnId,
            userText,
            response: parsed,
            rawFallback: parsed ? null : content || "No response received.",
            error: null,
          };
          return {
            ...prev,
            [question.id]: {
              turns: [...existing.turns, newTurn],
              isLoading: false,
            },
          };
        });
      } catch (err: unknown) {
        const message =
          (err as { data?: { message?: string }; message?: string })?.data?.message ||
          (err as { message?: string })?.message ||
          "Failed to reach AI service.";

        setSessions((prev) => {
          const existing = prev[question.id] ?? { turns: [], isLoading: false };
          const newTurn: AnalysisTurn = {
            id: turnId,
            userText,
            response: null,
            rawFallback: null,
            error: message,
          };
          return {
            ...prev,
            [question.id]: {
              turns: [...existing.turns, newTurn],
              isLoading: false,
            },
          };
        });
      }
    },
    [loadedContext, chatCompletion],
  );

  const handleLoadData = async () => {
    if (!selectedFacility) return;
    setError(null);
    setSessions({});
    setFollowUpInput("");

    try {
      let context: LoadedAuditContext;

      if (auditType === "Electrical Energy Audit") {
        const res = await fetchEnergySnapshot({ facility_id: selectedFacility._id }).unwrap();
        context = { auditType, facility: selectedFacility, snapshot: res.data };
      } else if (auditType === "Electrical Safety Audit") {
        const res = await fetchSafetySnapshot({ facility_id: selectedFacility._id }).unwrap();
        context = { auditType, facility: selectedFacility, snapshot: res.data };
      } else {
        context = { auditType, facility: selectedFacility, snapshot: null };
      }

      setLoadedContext(context);
      const qs = getQuestionsForAuditType(context.auditType);
      const first = qs[0];
      if (first) {
        setActiveQuestionId(first.id);
        setStep("analysis");
        await runAnalysis(first, { isInitial: true }, context);
      } else {
        setStep("analysis");
      }
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as { message?: string })?.message ||
        "Failed to load audit data.";
      setError(message);
    }
  };

  const handleSelectQuestion = async (question: AuditQuestionDefinition) => {
    setActiveQuestionId(question.id);
    setFollowUpInput("");
    const session = sessions[question.id];
    if (!session?.turns.length && !session?.isLoading) {
      await runAnalysis(question, { isInitial: true });
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !followUpInput.trim() || isAnalyzing) return;
    const text = followUpInput.trim();
    setFollowUpInput("");
    await runAnalysis(activeQuestion, { followUpText: text });
  };

  const triggerPlaceholder = facilitiesLoading
    ? "Loading facilities…"
    : facilitiesForAuditType.length === 0
      ? "No facilities for this program"
      : "Select facility…";

  const fab = (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:shadow-primary/30 hover:shadow-lg overflow-hidden"
      aria-label="Open Shakti AI"
    >
      <span className="absolute -inset-0.5 -z-10 rounded-full bg-primary/40 animate-ping opacity-75" />
      <LadyAvatar className="h-10 w-10" />
    </button>
  );

  if (!isOpen) {
    return mounted ? createPortal(fab, document.body) : fab;
  }

  const overlay = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <header className="shrink-0 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          {step !== "setup" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setStep("setup");
                setLoadedContext(null);
                setActiveQuestionId(null);
                setSessions({});
                setFollowUpInput("");
              }}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
            <LadyAvatar className="h-9 w-9" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">Shakti AI</h1>
            <p className="text-xs text-muted-foreground truncate">
              {step === "setup" && "Select audit type & facility to begin"}
              {step === "analysis" &&
                loadedContext &&
                `${loadedContext.auditType} · ${loadedContext.facility.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={resetWizard} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={handleClose} aria-label="Close Shakti AI">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {step === "setup" ? (
        <main className="flex-1 min-h-0 overflow-y-auto bg-muted/10">
          <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
            <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Audit Analysis Setup</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose an audit program and facility. The first analysis question loads automatically
                  in the sidebar. All answers are based strictly on recorded audit data.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Audit Type
                  </Label>
                  <Select
                    value={auditType}
                    onValueChange={(v) => setAuditType(v as AuditTypeOption)}
                    disabled={facilitiesLoading}
                  >
                    <SelectTrigger className="h-10 w-full bg-background">
                      <SelectValue placeholder="Select audit type" />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      {AUDIT_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Facility
                  </Label>
                  <Popover
                    open={popoverOpen}
                    onOpenChange={(open) => {
                      if (!isFacilityDisabled) setPopoverOpen(open);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        ref={triggerRef}
                        type="button"
                        role="combobox"
                        aria-expanded={popoverOpen}
                        disabled={isFacilityDisabled}
                        className={cn(
                          "flex h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                          "transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          "disabled:cursor-not-allowed disabled:opacity-50",
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
                      className="z-[200] p-0"
                      style={{ width: popoverWidth ? `${popoverWidth}px` : undefined }}
                    >
                      <Command>
                        <CommandInput placeholder="Search facility…" />
                        <CommandList>
                          <CommandEmpty>No facilities found.</CommandEmpty>
                          <CommandGroup>
                            {facilitiesForAuditType.map((f) => (
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
                                <AuditStatusBadge closed={isFacilityClosed(f)} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {error ? (
                <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                  {error}
                </p>
              ) : null}

              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={!selectedFacility || dataLoading}
                onClick={handleLoadData}
              >
                {dataLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading audit data…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Load audit data
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Questions sidebar */}
          <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-border bg-card/40">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Analysis Questions
              </p>
              <p className="text-xs text-muted-foreground mt-1">Data-only answers · no assumptions</p>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {questions.map((question, idx) => {
                const session = sessions[question.id];
                const isActive = activeQuestion?.id === question.id;
                const hasAnswer = (session?.turns.length ?? 0) > 0;
                const loading = session?.isLoading;

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => handleSelectQuestion(question)}
                    disabled={loading}
                    className={cn(
                      "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-primary/10 border border-primary/30 text-primary"
                        : "hover:bg-muted/60 border border-transparent text-foreground",
                      loading && "opacity-60 cursor-wait",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{question.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {question.description}
                        </p>
                        {loading ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary mt-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analyzing…
                          </span>
                        ) : hasAnswer ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 inline-block">
                            {session!.turns.length} response{session!.turns.length > 1 ? "s" : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Mobile question picker */}
          <div className="md:hidden shrink-0 border-b border-border bg-card/40 px-4 py-2">
            <Select
              value={activeQuestion?.id ?? ""}
              onValueChange={(id) => {
                const q = questions.find((item) => item.id === id);
                if (q) handleSelectQuestion(q);
              }}
            >
              <SelectTrigger className="h-9 w-full bg-background">
                <SelectValue placeholder="Select question" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {questions.map((q, idx) => (
                  <SelectItem key={q.id} value={q.id}>
                    {idx + 1}. {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Main analysis panel */}
          <div className="flex flex-1 min-w-0 flex-col min-h-0">
            <main className="flex-1 min-h-0 overflow-y-auto bg-muted/10">
              <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
                {activeQuestion && loadedContext ? (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        Active Question
                      </p>
                      <h2 className="text-base font-semibold text-foreground mt-1">
                        {activeQuestion.label}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">{activeQuestion.description}</p>
                    </div>

                    {activeSession?.turns.map((turn, turnIdx) => (
                      <div key={turn.id} className="space-y-3">
                        {turnIdx > 0 ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MessageSquarePlus className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Follow-up</span>
                          </div>
                        ) : null}

                        {turn.error ? (
                          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                            {turn.error}
                          </div>
                        ) : null}

                        {turn.response ? (
                          <StructuredAiResponse
                            response={turn.response}
                            userPrompt={turnIdx > 0 ? turn.userText : undefined}
                            facilityName={turnIdx === 0 ? loadedContext.facility.name : undefined}
                            compact={turnIdx > 0}
                          />
                        ) : null}

                        {turn.rawFallback ? (
                          <div className="rounded-xl border border-border bg-card p-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                              Response
                            </p>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                              {turn.rawFallback}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}

                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Analyzing audit data…</p>
                      </div>
                    ) : null}

                    <div ref={contentEndRef} />
                  </div>
                ) : null}
              </div>
            </main>

            {/* Follow-up composer */}
            {activeQuestion ? (
              <footer className="shrink-0 border-t border-border bg-card/90 backdrop-blur-md px-4 py-3 sm:px-6">
                <form
                  onSubmit={handleFollowUp}
                  className="mx-auto flex w-full max-w-4xl items-center gap-2"
                >
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    disabled={isAnalyzing}
                    placeholder="Ask a follow-up (answered only from loaded audit data)…"
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    disabled={isAnalyzing || !followUpInput.trim()}
                    className="h-10 w-10 shrink-0 rounded-xl p-0"
                    aria-label="Send follow-up"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </footer>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );

  return mounted ? createPortal(overlay, document.body) : overlay;
}
