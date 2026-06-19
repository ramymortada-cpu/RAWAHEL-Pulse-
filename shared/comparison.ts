import { DEPARTMENTS } from "./departments";

/**
 * Pure, dependency-free month-to-month comparison helpers.
 * Safe to import from both the client bundle and the server.
 */

export function computeDelta(
  a: number,
  b: number,
  isPercent = false
): { diff: number; pct: number; direction: "up" | "down" | "flat" } {
  const diff = b - a;
  let pct: number;
  if (isPercent) {
    pct = diff; // percentage points
  } else if (a === 0) {
    pct = b > 0 ? 100 : 0;
  } else {
    pct = Math.round(((b - a) / a) * 100);
  }
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return { diff, pct, direction };
}

export function computeDepartmentComparison(
  depsA: { departmentKey: string; metrics: unknown }[],
  depsB: { departmentKey: string; metrics: unknown }[]
): {
  key: string;
  beneficiariesA: number;
  beneficiariesB: number;
  delta: ReturnType<typeof computeDelta>;
}[] {
  const mapA = new Map<string, Record<string, number>>();
  const mapB = new Map<string, Record<string, number>>();
  for (const r of depsA)
    mapA.set(r.departmentKey, (r.metrics ?? {}) as Record<string, number>);
  for (const r of depsB)
    mapB.set(r.departmentKey, (r.metrics ?? {}) as Record<string, number>);
  return DEPARTMENTS.map((d) => {
    const a = Number(mapA.get(d.key)?.beneficiaries ?? 0) || 0;
    const b = Number(mapB.get(d.key)?.beneficiaries ?? 0) || 0;
    return {
      key: d.key,
      beneficiariesA: a,
      beneficiariesB: b,
      delta: computeDelta(a, b),
    };
  });
}
