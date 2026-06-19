import { DEPARTMENTS, monthName, type ReportSummary } from "@shared/departments";
import {
  getDepartmentData,
  upsertDepartmentData,
  updateReport,
  getReport,
  findReportByPeriod,
  createReport,
  getItemsByReport,
  getPulseMasterData,
  upsertPulseMetricValue,
} from "./db";
import {
  summaryFromItems,
  deptMetricsFromItems,
  type ItemRow,
} from "@shared/aggregation";
import { ITEMS } from "@shared/items";

/* ----------------- Summary computation ----------------- */

export function computeSummary(
  deptRows: { departmentKey: string; metrics: unknown }[]
): ReportSummary {
  let totalBeneficiaries = 0;
  let programsExecuted = 0;
  let volunteers = 0;
  let contentProduced = 0;
  let totalTarget = 0;
  let totalAchieved = 0;

  for (const row of deptRows) {
    const m = (row.metrics ?? {}) as Record<string, number>;
    totalBeneficiaries += Number(m.beneficiaries ?? 0) || 0;
    programsExecuted += Number(m.programs ?? 0) || 0;
    if (row.departmentKey === "volunteer_office") {
      volunteers += Number(m.volunteers ?? 0) || 0;
    }
    if (row.departmentKey === "media_communications") {
      contentProduced += Number(m.contentProduced ?? 0) || 0;
    }
    totalTarget += Number(m.goalTarget ?? 0) || 0;
    totalAchieved += Number(m.goalAchieved ?? 0) || 0;
  }

  const goalAchievementRate =
    totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  return {
    totalBeneficiaries,
    programsExecuted,
    volunteers,
    contentProduced,
    goalAchievementRate,
  };
}

export function computeTrends(
  current: ReportSummary,
  previous: ReportSummary | undefined
): ReportSummary["trends"] {
  if (!previous) return {};
  const pct = (cur: number, prev: number) => {
    if (!prev) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };
  return {
    totalBeneficiaries: pct(current.totalBeneficiaries, previous.totalBeneficiaries),
    programsExecuted: pct(current.programsExecuted, previous.programsExecuted),
    volunteers: pct(current.volunteers, previous.volunteers),
    contentProduced: pct(current.contentProduced, previous.contentProduced),
    goalAchievementRate: current.goalAchievementRate - previous.goalAchievementRate,
  };
}

/**
 * Sync department_data rows from the report's item rows. This keeps the
 * department-level metrics (beneficiaries, programs, ...) consistent so that
 * the compare page, dashboard and infographic keep working.
 * Goal target/achieved values already stored on department_data are preserved.
 */
export async function syncDepartmentDataFromItems(reportId: number): Promise<void> {
  const items = (await getItemsByReport(reportId)) as ItemRow[];
  const existing = await getDepartmentData(reportId);
  const existingMap = new Map<string, Record<string, number>>();
  for (const row of existing) {
    existingMap.set(row.departmentKey, (row.metrics ?? {}) as Record<string, number>);
  }
  const deptKeys = Object.keys(ITEMS);
  for (const dept of deptKeys) {
    const deptItems = items.filter((i) => i.departmentKey === dept);
    if (deptItems.length === 0) continue;
    const rolled = deptMetricsFromItems(dept, items);
    const prev = existingMap.get(dept) ?? {};
    // Preserve goal target/achieved which are entered at department level.
    const merged: Record<string, number> = {
      ...prev,
      ...rolled,
    };
    if (prev.goalTarget !== undefined) merged.goalTarget = Number(prev.goalTarget) || 0;
    if (prev.goalAchieved !== undefined) merged.goalAchieved = Number(prev.goalAchieved) || 0;
    await upsertDepartmentData({
      reportId,
      departmentKey: dept,
      metrics: merged,
      achievements: [],
      notes: null,
    });
  }
}

export async function refreshSummary(
  ownerId: number,
  reportId: number
): Promise<ReportSummary> {
  // Roll department rows up from items first so everything is consistent.
  await syncDepartmentDataFromItems(reportId);
  const items = (await getItemsByReport(reportId)) as ItemRow[];
  const deptRows = await getDepartmentData(reportId);
  // Prefer item-based summary; fall back to flat dept metrics when no items.
  const summary = items.length > 0 ? summaryFromItems(items) : computeSummary(deptRows);
  // Goal achievement is always derived from department-level goal fields.
  let totalTarget = 0;
  let totalAchieved = 0;
  for (const row of deptRows) {
    const m = (row.metrics ?? {}) as Record<string, number>;
    totalTarget += Number(m.goalTarget ?? 0) || 0;
    totalAchieved += Number(m.goalAchieved ?? 0) || 0;
  }
  summary.goalAchievementRate =
    totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
  const report = await getReport(ownerId, reportId);
  let previous: ReportSummary | undefined;
  if (report) {
    let prevMonth = report.month - 1;
    let prevYear = report.year;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevReport = await findReportByPeriod(ownerId, prevYear, prevMonth);
    if (prevReport?.summary) {
      previous = prevReport.summary as ReportSummary;
    }
  }
  summary.trends = computeTrends(summary, previous);
  await updateReport(ownerId, reportId, { summary });
  return summary;
}

/* ----------------- Google Sheets parsing ----------------- */

export function parseSheetUrl(url: string): { sheetId?: string; gid?: string } {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
  return { sheetId: idMatch?.[1], gid: gidMatch?.[1] };
}

export async function fetchSheetRows(
  sheetId: string,
  gid: string
): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) {
    throw new Error(
      "تعذّر قراءة الجدول. تأكد أن الصلاحية: أي شخص لديه الرابط يمكنه الاطلاع."
    );
  }
  const text = await resp.text();
  return parseCsv(text);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(field);
        field = "";
      } else if (c === "\n") {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = "";
      } else if (c === "\r") {
        // ignore
      } else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

/**
 * Import sheet rows into report data.
 * Supports the Pulse format (period | entity_key | metric_key | value | notes | source),
 * legacy long department format (department_key | metric_key | value), and legacy wide format.
 */
export async function importSheetRows(
  reportId: number,
  rows: string[][]
): Promise<number> {
  if (rows.length === 0) return 0;
  const header = rows[0].map((h) => h.trim().toLowerCase());

  const isPulseLong =
    header.includes("entity_key") &&
    header.includes("metric_key") &&
    header.includes("value");

  if (isPulseLong) {
    const entityIndex = header.indexOf("entity_key");
    const metricIndex = header.indexOf("metric_key");
    const valueIndex = header.indexOf("value");
    const notesIndex = header.indexOf("notes");
    const sourceIndex = header.indexOf("source");
    const masterData = await getPulseMasterData();
    const entitiesByKey = new Map(masterData.entities.map((entity) => [entity.key, entity]));
    const metricsByKey = new Map(masterData.metricDefinitions.map((metric) => [metric.key, metric]));
    let imported = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const entity = entitiesByKey.get((row[entityIndex] ?? "").trim());
      const metric = metricsByKey.get((row[metricIndex] ?? "").trim());
      if (!entity || !metric) continue;
      const rawValue = (row[valueIndex] ?? "").trim();
      const parsedNumber = rawValue === "" ? null : Number(rawValue);
      const hasNumericValue = parsedNumber !== null && Number.isFinite(parsedNumber);
      await upsertPulseMetricValue({
        reportId,
        entityId: entity.id,
        metricDefinitionId: metric.id,
        valueNumber: hasNumericValue ? parsedNumber : null,
        valueText: hasNumericValue ? null : rawValue || null,
        notes: notesIndex >= 0 ? (row[notesIndex] ?? "").trim() || null : null,
        source: sourceIndex >= 0 ? (row[sourceIndex] ?? "").trim() || null : null,
      });
      imported++;
    }

    return imported;
  }

  const validKeys = new Set(DEPARTMENTS.map((d) => d.key));
  const deptAccum: Record<string, Record<string, number>> = {};

  const isLong =
    header.includes("department_key") &&
    header.includes("metric_key") &&
    header.includes("value");

  if (isLong) {
    const di = header.indexOf("department_key");
    const mi = header.indexOf("metric_key");
    const vi = header.indexOf("value");
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const dk = (row[di] ?? "").trim();
      const mk = (row[mi] ?? "").trim();
      const val = Number((row[vi] ?? "").trim()) || 0;
      if (!validKeys.has(dk) || !mk) continue;
      deptAccum[dk] = deptAccum[dk] || {};
      deptAccum[dk][mk] = val;
    }
  } else {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const dk = (row[0] ?? "").trim();
      if (!validKeys.has(dk)) continue;
      deptAccum[dk] = deptAccum[dk] || {};
      for (let c = 1; c < header.length; c++) {
        const mk = header[c];
        if (!mk) continue;
        deptAccum[dk][mk] = Number((row[c] ?? "").trim()) || 0;
      }
    }
  }

  let count = 0;
  for (const [dk, metrics] of Object.entries(deptAccum)) {
    await upsertDepartmentData({
      reportId,
      departmentKey: dk,
      metrics,
      achievements: [],
      notes: null,
    });
    count++;
  }
  return count;
}

/**
 * Ensure a report exists for the given period, returning its id.
 * Used by the monthly auto-sync to create the current month's report automatically.
 */
export async function ensureReportForPeriod(
  ownerId: number,
  year: number,
  month: number
): Promise<number> {
  const existing = await findReportByPeriod(ownerId, year, month);
  if (existing) return existing.id;
  const title = `تقرير ${monthName(month)} ${year}`;
  return createReport({ ownerId, title, year, month, status: "draft" });
}

/* ----------------- Month-to-month comparison ----------------- */
// Comparison helpers live in shared/comparison.ts (dependency-free, used by client too).
export { computeDelta, computeDepartmentComparison } from "@shared/comparison";
