export type AuditAiSeverity = "high" | "medium" | "low" | "info";
export type AuditAiChartType = "bar" | "line" | "pie";

export interface AuditAiFinding {
  title: string;
  detail: string;
  severity: AuditAiSeverity;
  /** Field path or record reference from supplied JSON, e.g. billing_records[2].kwh */
  data_reference?: string;
}

export interface AuditAiMetric {
  label: string;
  value: string;
  data_reference?: string;
}

export interface AuditAiTable {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
}

export interface AuditAiChartSeries {
  key: string;
  label: string;
}

export interface AuditAiChart {
  title: string;
  type: AuditAiChartType;
  xKey: string;
  data: Record<string, string | number>[];
  series: AuditAiChartSeries[];
}

export interface StructuredAuditAiResponse {
  summary: string;
  data_availability: string;
  findings: AuditAiFinding[];
  recommendations: string[];
  metrics: AuditAiMetric[];
  tables: AuditAiTable[];
  charts: AuditAiChart[];
}

export interface AnalysisChatMessage {
  role: "user" | "assistant";
  content: string;
}

function normalizeSeverity(value: unknown): AuditAiSeverity {
  const s = String(value ?? "info").toLowerCase();
  if (s === "high" || s === "medium" || s === "low" || s === "info") return s;
  return "info";
}

function normalizeChartType(value: unknown): AuditAiChartType {
  const t = String(value ?? "bar").toLowerCase();
  if (t === "line" || t === "pie" || t === "bar") return t;
  return "bar";
}

function normalizeTable(table: Partial<AuditAiTable>): AuditAiTable | null {
  const columns = Array.isArray(table.columns)
    ? table.columns.map((c) => String(c))
    : [];
  const rows = Array.isArray(table.rows)
    ? table.rows
        .filter((row) => Array.isArray(row))
        .map((row) => row.map((cell) => (cell === null || cell === undefined ? null : cell)))
    : [];
  if (!columns.length && !rows.length) return null;
  return {
    title: String(table.title ?? "Data Table"),
    columns,
    rows,
  };
}

function normalizeChart(chart: Partial<AuditAiChart>): AuditAiChart | null {
  const data = Array.isArray(chart.data)
    ? chart.data.filter((d) => d && typeof d === "object")
    : [];
  const series = Array.isArray(chart.series)
    ? chart.series
        .filter((s) => s?.key)
        .map((s) => ({ key: String(s.key), label: String(s.label ?? s.key) }))
    : [];
  if (!data.length || !series.length) return null;
  return {
    title: String(chart.title ?? "Chart"),
    type: normalizeChartType(chart.type),
    xKey: String(chart.xKey ?? "label"),
    data: data as Record<string, string | number>[],
    series,
  };
}

export function parseStructuredAuditAiResponse(raw: string): StructuredAuditAiResponse | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();

  try {
    const parsed = JSON.parse(candidate) as Partial<StructuredAuditAiResponse>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      summary: String(parsed.summary ?? "").trim(),
      data_availability: String(parsed.data_availability ?? "").trim(),
      findings: Array.isArray(parsed.findings)
        ? parsed.findings.map((f) => ({
            title: String(f?.title ?? "Finding"),
            detail: String(f?.detail ?? ""),
            severity: normalizeSeverity(f?.severity),
            data_reference: f?.data_reference ? String(f.data_reference) : undefined,
          }))
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map((r) => String(r)).filter(Boolean)
        : [],
      metrics: Array.isArray(parsed.metrics)
        ? parsed.metrics.map((m) => ({
            label: String(m?.label ?? ""),
            value: String(m?.value ?? ""),
            data_reference: m?.data_reference ? String(m.data_reference) : undefined,
          }))
        : [],
      tables: Array.isArray(parsed.tables)
        ? parsed.tables.map(normalizeTable).filter((t): t is AuditAiTable => t !== null)
        : [],
      charts: Array.isArray(parsed.charts)
        ? parsed.charts.map(normalizeChart).filter((c): c is AuditAiChart => c !== null)
        : [],
    };
  } catch {
    return null;
  }
}

export const AUDIT_AI_SYSTEM_PROMPT = `You are Shakti AI, an expert electrical audit analyst for the Power Audit application.

CRITICAL RULES — YOU MUST FOLLOW:
1. Answer ONLY using values explicitly present in the supplied audit JSON. Do NOT guess, assume, hypothesize, extrapolate, or use industry benchmarks unless those exact values appear in the JSON.
2. If a field is missing, empty, or null, state "Not available in audit data" — do NOT fill gaps with estimates.
3. Every finding, metric, table row, and chart data point MUST come directly from the JSON. Include "data_reference" (JSON path) where possible.
4. Recommendations must be limited to actions directly supported by observed data (e.g. recorded non-compliance, measured inefficiency). Do NOT recommend actions based on speculation.
5. Use tables when comparing multiple records (billing months, equipment list, checklist items).
6. When audit_records or records are in the JSON, tables.rows MUST include one row per included record (use stats.included_count; do not sample rows).
7. If stats.truncated is true, state that analysis covers included_count of record_count rows only.
8. Use charts (bar, line, pie) ONLY when numeric time-series or categorical data exists in the JSON to plot. Chart "data" arrays must contain only values extracted from the audit JSON.
9. If insufficient data exists for the question, return a short summary stating what is missing and empty findings/recommendations/charts/tables as appropriate.

Respond ONLY with valid JSON (no markdown fences, no prose outside JSON):
{
  "summary": "2-4 sentences citing only facts from the data",
  "data_availability": "What records/sections were present or absent in the JSON",
  "findings": [
    { "title": "...", "detail": "...", "severity": "high|medium|low|info", "data_reference": "optional JSON path" }
  ],
  "recommendations": ["Only if directly supported by recorded data"],
  "metrics": [{ "label": "...", "value": "...", "data_reference": "optional JSON path" }],
  "tables": [
    { "title": "...", "columns": ["Col1", "Col2"], "rows": [["val1", "val2"]] }
  ],
  "charts": [
    {
      "title": "...",
      "type": "bar|line|pie",
      "xKey": "category_field_name",
      "data": [{ "category_field_name": "Jan", "value_key": 1200 }],
      "series": [{ "key": "value_key", "label": "Display Label" }]
    }
  ]
}`;

export function summarizeResponseForHistory(response: StructuredAuditAiResponse): string {
  return JSON.stringify({
    summary: response.summary,
    data_availability: response.data_availability,
    findings_count: response.findings.length,
    metrics: response.metrics.slice(0, 8),
    recommendations_count: response.recommendations.length,
  });
}

export function buildAnalysisMessages(args: {
  questionPrompt: string;
  auditDataJson?: string;
  priorTurns: AnalysisChatMessage[];
  followUpText?: string;
  isFollowUp?: boolean;
}): AnalysisChatMessage[] {
  const messages: AnalysisChatMessage[] = [];

  if (!args.isFollowUp && args.auditDataJson) {
    messages.push({
      role: "user",
      content: `${args.questionPrompt}\n\nAudit data (JSON):\n${args.auditDataJson}`,
    });
  } else if (args.isFollowUp) {
    messages.push({
      role: "user",
      content: `${args.questionPrompt}\n\n[Audit data was provided in the first message of this thread. Use that data only.]`,
    });
  }

  for (const turn of args.priorTurns) {
    messages.push(turn);
  }

  if (args.followUpText?.trim()) {
    messages.push({
      role: "user",
      content: `${args.followUpText.trim()}\n\nReminder: Answer ONLY from the audit JSON in the first message. No assumptions or hypotheses.`,
    });
  }

  return messages;
}
