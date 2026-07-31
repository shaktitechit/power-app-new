"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Copy, Download, Check } from "lucide-react";
import { Badge } from "@/components/portal/ui/badge";
import { Button } from "@/components/portal/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/portal/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/portal/ui/chart";
import { toast } from "@/components/portal/hooks/use-toast";
import type {
  AuditAiChart,
  AuditAiSeverity,
  StructuredAuditAiResponse,
} from "../lib/audit-ai-types";
import { copyResponseToClipboard, downloadResponseAsWord } from "../lib/audit-ai-export";
import { formatContextCoverage, type AuditContextMeta } from "../lib/audit-ai-budget";
import { cn } from "@/components/portal/lib/utils";

const severityStyles: Record<AuditAiSeverity, string> = {
  high: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  info: "border-border bg-muted/40 text-muted-foreground",
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#10B981",
  "#6366F1",
];

function AuditChartBlock({ chart }: { chart: AuditAiChart }) {
  const config = Object.fromEntries(
    chart.series.map((s, i) => [
      s.key,
      { label: s.label, color: CHART_COLORS[i % CHART_COLORS.length] },
    ]),
  );

  if (chart.type === "pie") {
    const pieKey = chart.series[0]?.key ?? "value";
    const nameKey = chart.xKey;
    return (
      <ChartContainer config={config} className="min-h-[260px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={chart.data}
            dataKey={pieKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, value }) => `${name}: ${value}`}
          >
            {chart.data.map((_, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
    );
  }

  if (chart.type === "line") {
    return (
      <ChartContainer config={config} className="min-h-[260px] w-full">
        <LineChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {chart.series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={`var(--color-${s.key})`}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={config} className="min-h-[260px] w-full">
      <BarChart data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={chart.xKey} tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {chart.series.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

interface StructuredAiResponseProps {
  response: StructuredAuditAiResponse;
  questionLabel?: string;
  facilityName?: string;
  userPrompt?: string;
  compact?: boolean;
  contextMeta?: AuditContextMeta;
}

function ResponseActions({
  response,
  questionLabel,
  facilityName,
  userPrompt,
}: {
  response: StructuredAuditAiResponse;
  questionLabel?: string;
  facilityName?: string;
  userPrompt?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const exportArgs = { response, questionLabel, facilityName, userPrompt };

  const handleCopy = async () => {
    try {
      await copyResponseToClipboard(exportArgs);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    setDownloading(true);
    try {
      downloadResponseAsWord(exportArgs);
      toast({ title: "Word document downloaded" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleDownload}
        disabled={downloading}
      >
        <Download className="h-3.5 w-3.5" />
        {downloading ? "Preparing…" : "Download Word"}
      </Button>
    </div>
  );
}

export function StructuredAiResponse({
  response,
  questionLabel,
  facilityName,
  userPrompt,
  compact = false,
  contextMeta,
}: StructuredAiResponseProps) {
  return (
    <div className={cn("space-y-4", !compact && "animate-in fade-in slide-in-from-bottom-2 duration-300")}>
      {contextMeta ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            contextMeta.truncated
              ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : "border-border/60 bg-muted/30 text-muted-foreground",
          )}
        >
          <span className="font-semibold uppercase tracking-wider">Data coverage: </span>
          {formatContextCoverage(contextMeta)}
          {contextMeta.truncated ? (
            <span className="block mt-1 text-[11px] opacity-90">
              Analysis uses the newest included records only. Aggregates in stats reflect full dataset when present.
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {!compact && (questionLabel || facilityName) ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Analysis Result</p>
            {questionLabel ? (
              <h2 className="text-base font-semibold text-foreground mt-1">{questionLabel}</h2>
            ) : null}
            {facilityName ? (
              <p className="text-xs text-muted-foreground mt-0.5">{facilityName}</p>
            ) : null}
          </div>
        ) : compact ? (
          <div className="flex-1 min-w-0" />
        ) : null}
        <ResponseActions
          response={response}
          questionLabel={questionLabel}
          facilityName={facilityName}
          userPrompt={userPrompt}
        />
      </div>

      {userPrompt ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Question</p>
          <p className="text-sm text-foreground mt-1">{userPrompt}</p>
        </div>
      ) : null}

      {response.data_availability ? (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Data Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{response.data_availability}</p>
          </CardContent>
        </Card>
      ) : null}

      {response.summary ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{response.summary}</p>
          </CardContent>
        </Card>
      ) : null}

      {response.metrics.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {response.metrics.map((metric, idx) => (
                <div
                  key={`${metric.label}-${idx}`}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-1">{metric.value}</p>
                  {metric.data_reference ? (
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                      {metric.data_reference}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {response.tables.length > 0 ? (
        <div className="space-y-4">
          {response.tables.map((table, idx) => (
            <Card key={`${table.title}-${idx}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{table.title}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-sm">
                  {table.columns.length > 0 ? (
                    <thead>
                      <tr className="border-b border-border">
                        {table.columns.map((col, colIdx) => (
                          <th
                            key={colIdx}
                            className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {table.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-border/40 last:border-0">
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 text-foreground/90 whitespace-nowrap">
                            {cell === null || cell === undefined ? "—" : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {response.charts.length > 0 ? (
        <div className="space-y-4">
          {response.charts.map((chart, idx) => (
            <Card key={`${chart.title}-${idx}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{chart.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditChartBlock chart={chart} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {response.findings.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {response.findings.map((finding, idx) => (
              <div
                key={`${finding.title}-${idx}`}
                className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{finding.title}</h4>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] uppercase shrink-0", severityStyles[finding.severity])}
                  >
                    {finding.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{finding.detail}</p>
                {finding.data_reference ? (
                  <p className="text-[10px] font-mono text-muted-foreground">{finding.data_reference}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {response.recommendations.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recommendations (data-supported only)</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal pl-5">
              {response.recommendations.map((item, idx) => (
                <li key={idx} className="text-sm text-foreground/90 leading-relaxed">
                  {item}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
