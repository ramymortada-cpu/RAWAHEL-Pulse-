/**
 * Pure, dependency-light aggregation helpers that roll up named item metrics
 * into department-level metrics and an overall report summary.
 *
 * Safe to import from both client and server.
 */
import { itemBeneficiaries, getItemDef } from "./items";
import type { ReportSummary } from "./departments";

export type ItemRow = {
  departmentKey: string;
  itemKey: string;
  metrics: unknown;
};

export type DeptRollup = {
  departmentKey: string;
  beneficiaries: number;
  // pass-through aggregate of selected metric keys used by the summary
  programs: number;
  volunteers: number;
  contentProduced: number;
};

/**
 * Roll up one department's metrics from its item rows.
 * - beneficiaries = sum of each item's beneficiary-flagged fields
 * - programs = sum of any `programs`/`courses`/`seasons`/`tracks`/`trips` style counters
 * - volunteers = sum of `volunteers` fields (volunteer_office)
 * - contentProduced = sum of `contentProduced` fields (media_communications)
 */
export function rollupDepartment(
  departmentKey: string,
  items: ItemRow[]
): DeptRollup {
  let beneficiaries = 0;
  let programs = 0;
  let volunteers = 0;
  let contentProduced = 0;

  for (const it of items) {
    if (it.departmentKey !== departmentKey) continue;
    const m = (it.metrics ?? {}) as Record<string, number>;
    beneficiaries += itemBeneficiaries(departmentKey, it.itemKey, m);

    const def = getItemDef(departmentKey, it.itemKey);
    // Count "activity" counters as programs for the org-wide programs KPI.
    const programLikeKeys = ["programs", "courses", "seasons", "tracks", "trips", "batches"];
    if (def) {
      for (const f of def.metrics) {
        if (programLikeKeys.includes(f.key)) {
          programs += Number(m[f.key] ?? 0) || 0;
        }
      }
    }
    volunteers += Number(m.volunteers ?? 0) || 0;
    contentProduced += Number(m.contentProduced ?? 0) || 0;
  }

  return { departmentKey, beneficiaries, programs, volunteers, contentProduced };
}

/**
 * Build the department-level metrics object that gets stored in
 * department_data.metrics so existing consumers (compare, infographic,
 * dashboard) keep working. We always include `beneficiaries` and `programs`.
 */
export function deptMetricsFromItems(
  departmentKey: string,
  items: ItemRow[]
): Record<string, number> {
  const r = rollupDepartment(departmentKey, items);
  const metrics: Record<string, number> = {
    beneficiaries: r.beneficiaries,
    programs: r.programs,
  };
  if (departmentKey === "volunteer_office") metrics.volunteers = r.volunteers;
  if (departmentKey === "media_communications") metrics.contentProduced = r.contentProduced;
  return metrics;
}

/**
 * Compute the report summary directly from all item rows of a report.
 */
export function summaryFromItems(items: ItemRow[]): ReportSummary {
  let totalBeneficiaries = 0;
  let programsExecuted = 0;
  let volunteers = 0;
  let contentProduced = 0;

  const byDept = new Map<string, ItemRow[]>();
  for (const it of items) {
    const list = byDept.get(it.departmentKey) ?? [];
    list.push(it);
    byDept.set(it.departmentKey, list);
  }

  for (const dept of Array.from(byDept.keys())) {
    const list = byDept.get(dept) ?? [];
    const r = rollupDepartment(dept, list);
    totalBeneficiaries += r.beneficiaries;
    programsExecuted += r.programs;
    volunteers += r.volunteers;
    contentProduced += r.contentProduced;
  }

  return {
    totalBeneficiaries,
    programsExecuted,
    volunteers,
    contentProduced,
    goalAchievementRate: 0,
  };
}
