import type { StructuredAuditAiResponse } from "./audit-ai-types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").slice(0, 80) || "audit_analysis";
}

export function buildPlainTextResponse(args: {
  response: StructuredAuditAiResponse;
  questionLabel?: string;
  facilityName?: string;
  userPrompt?: string;
}): string {
  const { response, questionLabel, facilityName, userPrompt } = args;
  const lines: string[] = [];

  if (questionLabel) lines.push(`Question: ${questionLabel}`);
  if (facilityName) lines.push(`Facility: ${facilityName}`);
  if (userPrompt) lines.push(`Follow-up: ${userPrompt}`);
  if (questionLabel || facilityName || userPrompt) lines.push("");

  if (response.data_availability) {
    lines.push("DATA AVAILABILITY", response.data_availability, "");
  }

  if (response.summary) {
    lines.push("SUMMARY", response.summary, "");
  }

  if (response.metrics.length > 0) {
    lines.push("KEY METRICS");
    for (const m of response.metrics) {
      lines.push(`  • ${m.label}: ${m.value}${m.data_reference ? ` (${m.data_reference})` : ""}`);
    }
    lines.push("");
  }

  for (const table of response.tables) {
    lines.push(table.title.toUpperCase());
    if (table.columns.length > 0) {
      lines.push(table.columns.join(" | "));
      lines.push(table.columns.map(() => "---").join(" | "));
    }
    for (const row of table.rows) {
      lines.push(row.map((c) => (c === null || c === undefined ? "—" : String(c))).join(" | "));
    }
    lines.push("");
  }

  for (const chart of response.charts) {
    lines.push(chart.title.toUpperCase(), `Chart type: ${chart.type}`);
    for (const point of chart.data) {
      const label = point[chart.xKey];
      const values = chart.series.map((s) => `${s.label}: ${point[s.key] ?? "—"}`).join(", ");
      lines.push(`  • ${label}: ${values}`);
    }
    lines.push("");
  }

  if (response.findings.length > 0) {
    lines.push("FINDINGS");
    for (const f of response.findings) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.title}`);
      lines.push(`    ${f.detail}`);
      if (f.data_reference) lines.push(`    Ref: ${f.data_reference}`);
    }
    lines.push("");
  }

  if (response.recommendations.length > 0) {
    lines.push("RECOMMENDATIONS");
    response.recommendations.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`));
    lines.push("");
  }

  lines.push(`Generated: ${new Date().toLocaleString()}`);
  return lines.join("\n").trim();
}

export function buildWordHtmlResponse(args: {
  response: StructuredAuditAiResponse;
  questionLabel?: string;
  facilityName?: string;
  userPrompt?: string;
}): string {
  const { response, questionLabel, facilityName, userPrompt } = args;
  const title = questionLabel ?? "Audit Analysis";
  const sections: string[] = [];

  if (facilityName) {
    sections.push(`<p class="meta"><strong>Facility:</strong> ${escapeHtml(facilityName)}</p>`);
  }
  if (userPrompt) {
    sections.push(`<p class="meta"><strong>Follow-up:</strong> ${escapeHtml(userPrompt)}</p>`);
  }

  if (response.data_availability) {
    sections.push(`
      <h2>Data Availability</h2>
      <p>${escapeHtml(response.data_availability)}</p>
    `);
  }

  if (response.summary) {
    sections.push(`
      <h2>Summary</h2>
      <p>${escapeHtml(response.summary)}</p>
    `);
  }

  if (response.metrics.length > 0) {
    const metricRows = response.metrics
      .map(
        (m) =>
          `<tr>
            <td style="border:1px solid #cbd5e1;padding:6pt;font-weight:bold;">${escapeHtml(m.label)}</td>
            <td style="border:1px solid #cbd5e1;padding:6pt;">${escapeHtml(m.value)}</td>
            <td style="border:1px solid #cbd5e1;padding:6pt;color:#64748b;font-size:8pt;">${escapeHtml(m.data_reference ?? "")}</td>
          </tr>`,
      )
      .join("");
    sections.push(`
      <h2>Key Metrics</h2>
      <table>
        <thead>
          <tr>
            <th style="border:1px solid #cbd5e1;padding:6pt;background:#eff6ff;">Metric</th>
            <th style="border:1px solid #cbd5e1;padding:6pt;background:#eff6ff;">Value</th>
            <th style="border:1px solid #cbd5e1;padding:6pt;background:#eff6ff;">Reference</th>
          </tr>
        </thead>
        <tbody>${metricRows}</tbody>
      </table>
    `);
  }

  for (const table of response.tables) {
    const headerCells = table.columns
      .map(
        (col) =>
          `<th style="border:1px solid #cbd5e1;padding:6pt;background:#eff6ff;font-weight:bold;">${escapeHtml(col)}</th>`,
      )
      .join("");
    const bodyRows = table.rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #cbd5e1;padding:6pt;">${escapeHtml(cell === null || cell === undefined ? "—" : String(cell))}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("");
    sections.push(`
      <h2>${escapeHtml(table.title)}</h2>
      <table>
        ${headerCells ? `<thead><tr>${headerCells}</tr></thead>` : ""}
        <tbody>${bodyRows}</tbody>
      </table>
    `);
  }

  for (const chart of response.charts) {
    const headerCells = [
      `<th style="border:1px solid #cbd5e1;padding:6pt;background:#eff6ff;">${escapeHtml(chart.xKey)}</th>`,
      ...chart.series.map(
        (s) =>
          `<th style="border:1px solid #cbd5e1;padding:6pt;background:#eff6ff;">${escapeHtml(s.label)}</th>`,
      ),
    ].join("");
    const bodyRows = chart.data
      .map(
        (point) =>
          `<tr>
            <td style="border:1px solid #cbd5e1;padding:6pt;">${escapeHtml(String(point[chart.xKey] ?? ""))}</td>
            ${chart.series
              .map(
                (s) =>
                  `<td style="border:1px solid #cbd5e1;padding:6pt;">${escapeHtml(String(point[s.key] ?? "—"))}</td>`,
              )
              .join("")}
          </tr>`,
      )
      .join("");
    sections.push(`
      <h2>${escapeHtml(chart.title)} (${escapeHtml(chart.type)} chart)</h2>
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    `);
  }

  if (response.findings.length > 0) {
    const findingBlocks = response.findings
      .map(
        (f) => `
        <div style="margin-bottom:10pt;padding:8pt;border:1px solid #e2e8f0;border-radius:4pt;">
          <p style="margin:0 0 4pt;font-weight:bold;">[${escapeHtml(f.severity.toUpperCase())}] ${escapeHtml(f.title)}</p>
          <p style="margin:0;color:#475569;">${escapeHtml(f.detail)}</p>
          ${f.data_reference ? `<p style="margin:4pt 0 0;font-size:8pt;color:#94a3b8;">Ref: ${escapeHtml(f.data_reference)}</p>` : ""}
        </div>`,
      )
      .join("");
    sections.push(`<h2>Findings</h2>${findingBlocks}`);
  }

  if (response.recommendations.length > 0) {
    const items = response.recommendations
      .map((r, i) => `<li style="margin-bottom:4pt;">${escapeHtml(r)}</li>`)
      .join("");
    sections.push(`<h2>Recommendations</h2><ol>${items}</ol>`);
  }

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: A4; margin: 0.75in; }
    body { font-family: Calibri, Arial, sans-serif; color: #111827; font-size: 11pt; }
    h1 { font-size: 18pt; color: #1e3a8a; margin-bottom: 6pt; }
    h2 { font-size: 13pt; color: #1e40af; margin: 16pt 0 8pt; }
    p.meta { font-size: 10pt; color: #64748b; margin-bottom: 4pt; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 12pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Shakti AI · Exported ${escapeHtml(new Date().toLocaleString())}</p>
  ${sections.join("\n")}
</body>
</html>`;
}

export function downloadResponseAsWord(args: {
  response: StructuredAuditAiResponse;
  questionLabel?: string;
  facilityName?: string;
  userPrompt?: string;
}): void {
  const title = args.questionLabel ?? "Audit_Analysis";
  const htmlContent = buildWordHtmlResponse(args);
  const blob = new Blob(["\ufeff" + htmlContent], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(title)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyResponseToClipboard(args: {
  response: StructuredAuditAiResponse;
  questionLabel?: string;
  facilityName?: string;
  userPrompt?: string;
}): Promise<void> {
  const text = buildPlainTextResponse(args);
  await navigator.clipboard.writeText(text);
}
