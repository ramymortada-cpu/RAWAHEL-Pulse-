/**
 * End-to-end integrity tests that simulate the full data path:
 *   catalog baseline -> item rows -> department roll-up -> report summary
 *   -> infographic item lists.
 *
 * Also validates that every icon name we reference actually exists in
 * lucide-react and that every icon-override key maps to a real catalog item.
 */
import { describe, it, expect } from "vitest";
import * as Icons from "lucide-react";
import {
  ITEMS,
  getItemDef,
  itemBeneficiaries,
  itemIconName,
  ITEM_TYPE_ICON,
} from "../shared/items";
import {
  rollupDepartment,
  summaryFromItems,
  deptMetricsFromItems,
  type ItemRow,
} from "../shared/aggregation";

/** Build item rows from catalog baselines, mimicking a freshly seeded report. */
function seededRows(): ItemRow[] {
  const rows: ItemRow[] = [];
  for (const [departmentKey, defs] of Object.entries(ITEMS)) {
    for (const def of defs) {
      rows.push({ departmentKey, itemKey: def.key, metrics: { ...def.baseline } });
    }
  }
  return rows;
}

describe("profile baseline integrity", () => {
  it("seeds every catalog item into a row", () => {
    const rows = seededRows();
    const catalogCount = Object.values(ITEMS).reduce((n, d) => n + d.length, 0);
    expect(rows.length).toBe(catalogCount);
  });

  it("matches the known headline numbers from the profile", () => {
    // معهد أذن خير = 191,967 مستفيد
    expect(itemBeneficiaries("institutes", "othon_khair", ITEMS.institutes[0].baseline)).toBe(191967);
    // بيّنات = 118,974
    const bayyinat = getItemDef("institutes", "bayyinat")!;
    expect(itemBeneficiaries("institutes", "bayyinat", bayyinat.baseline)).toBe(118974);
    // معهد المحطات السبع = 158,927 (only the beneficiaries-flagged field counts)
    const mahattat = getItemDef("educational_initiatives", "mahattat_sabaa")!;
    expect(itemBeneficiaries("educational_initiatives", "mahattat_sabaa", mahattat.baseline)).toBe(158927);
    // افتح لي قلبك reach = 1,200,000
    const iftah = getItemDef("educational_initiatives", "iftah_li_qalbak")!;
    expect(itemBeneficiaries("educational_initiatives", "iftah_li_qalbak", iftah.baseline)).toBe(1200000);
  });

  it("rolls up institutes beneficiaries as the sum of its items", () => {
    const rows = seededRows();
    const r = rollupDepartment("institutes", rows);
    const expected = ITEMS.institutes.reduce(
      (s, d) => s + itemBeneficiaries("institutes", d.key, d.baseline),
      0
    );
    expect(r.beneficiaries).toBe(expected);
    expect(expected).toBeGreaterThan(300000); // sanity: institutes are large
  });

  it("produces a report summary with positive totals from baseline", () => {
    const s = summaryFromItems(seededRows());
    expect(s.totalBeneficiaries).toBeGreaterThan(1000000);
    expect(s.programsExecuted).toBeGreaterThan(0);
  });

  it("keeps department_data.metrics in sync (beneficiaries + programs)", () => {
    const rows = seededRows();
    const m = deptMetricsFromItems("institutes", rows);
    expect(m.beneficiaries).toBe(rollupDepartment("institutes", rows).beneficiaries);
    expect(typeof m.programs).toBe("number");
  });

  it("does NOT count social platform views/followers as beneficiaries", () => {
    const rows = seededRows();
    const media = rollupDepartment("media_communications", rows);
    // none of the social platform items are beneficiary-flagged
    expect(media.beneficiaries).toBe(0);
  });
});

describe("icon integrity", () => {
  it("every item-type icon exists in lucide-react", () => {
    for (const name of Object.values(ITEM_TYPE_ICON)) {
      expect((Icons as any)[name], `missing icon ${name}`).toBeTruthy();
    }
  });

  it("every resolved item icon exists in lucide-react", () => {
    for (const [departmentKey, defs] of Object.entries(ITEMS)) {
      for (const def of defs) {
        const name = itemIconName(departmentKey, def.key, def.type);
        expect((Icons as any)[name], `missing icon ${name} for ${departmentKey}:${def.key}`).toBeTruthy();
      }
    }
  });

  it("each well-known item resolves to a NON-fallback icon", () => {
    // These items have explicit overrides; ensure the override keys actually match.
    const checks: Array<[string, string]> = [
      ["institutes", "othon_khair"],
      ["institutes", "alqurani_aldaawi"],
      ["educational_initiatives", "sabbeh_tafrah"],
      ["educational_initiatives", "fi_arbaeen_yatini"],
      ["educational_initiatives", "qabl_alashr_biashr"],
      ["educational_initiatives", "mahattat_sabaa"],
      ["media_communications", "social_youtube"],
      ["media_communications", "social_tiktok"],
      ["media_communications", "social_all"],
    ];
    for (const [dept, key] of checks) {
      const name = itemIconName(dept, key);
      expect(name).not.toBe("CircleDot");
      expect(name).not.toBe(ITEM_TYPE_ICON[getItemDef(dept, key)!.type]);
    }
  });
});
