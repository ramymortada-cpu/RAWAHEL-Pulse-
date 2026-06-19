/**
 * End-to-end flow test (logic-level, no browser).
 *
 * Simulates the real way the app is used across two months and asserts that
 * every derived value the UI relies on is correct:
 *   1. The form sends raw metric strings -> normalizeItemMetrics (router path).
 *   2. Items are rolled up into department metrics + the report summary.
 *   3. The infographic's "top items per department" data is built correctly,
 *      including icon + highlight text.
 *   4. The Items Overview month-over-month growth is computed against the
 *      previous month's matching item.
 *
 * This mirrors the actual data path: form -> saveItem normalize -> DB metrics
 * -> aggregation -> infographic/overview, without needing OAuth login.
 */
import { describe, expect, it } from "vitest";
import {
  normalizeItemMetrics,
  itemBeneficiaries,
  itemIconName,
  getItemHighlight,
  HIGHLIGHT_KEY,
} from "@shared/items";
import { summaryFromItems, deptMetricsFromItems, type ItemRow } from "@shared/aggregation";

// --- Helpers that mirror the client/server data path -----------------------

type SavedItem = {
  departmentKey: string;
  itemKey: string;
  itemType: string;
  itemNameAr: string;
  metrics: Record<string, unknown>;
};

/** Simulate what saveItem does: normalize raw form metrics before persisting. */
function saveItem(
  departmentKey: string,
  itemKey: string,
  itemType: string,
  itemNameAr: string,
  rawMetrics: Record<string, unknown>
): SavedItem {
  return {
    departmentKey,
    itemKey,
    itemType,
    itemNameAr,
    metrics: normalizeItemMetrics(rawMetrics),
  };
}

/** Build the infographic "top items" view-model the way Infographic.tsx does. */
function buildInfographicItems(items: SavedItem[]) {
  const byDept: Record<
    string,
    { name: string; value: number; icon: string; highlight: string }[]
  > = {};
  for (const it of items) {
    const ben = itemBeneficiaries(
      it.departmentKey,
      it.itemKey,
      it.metrics as Record<string, number>
    );
    const list = byDept[it.departmentKey] ?? [];
    list.push({
      name: it.itemNameAr,
      value: ben,
      icon: itemIconName(it.departmentKey, it.itemKey, it.itemType),
      highlight: getItemHighlight(it.metrics),
    });
    byDept[it.departmentKey] = list;
  }
  for (const k of Object.keys(byDept)) byDept[k].sort((a, b) => b.value - a.value);
  return byDept;
}

/** Month-over-month growth the way ItemsOverview.tsx computes it. */
function growth(
  current: number,
  prev: number | undefined
): { kind: "new" | "flat" | "up" | "down"; pct: number } {
  if (prev === undefined) return { kind: "new", pct: 0 };
  if (prev === current) return { kind: "flat", pct: 0 };
  const pct = prev === 0 ? 100 : ((current - prev) / prev) * 100;
  return { kind: current > prev ? "up" : "down", pct };
}

describe("end-to-end two-month report flow", () => {
  // ---- Previous month (e.g. May) -----------------------------------------
  const prevItems: SavedItem[] = [
    saveItem("institutes", "othon_khair", "institute_online", "معهد أذن خير", {
      beneficiaries: "1000",
      batches: "3",
    }),
    saveItem("institutes", "bayyinat", "institute_offline", "معهد بيّنات", {
      beneficiaries: "500",
      courses: "10",
    }),
    saveItem(
      "educational_initiatives",
      "iftah_li_qalbak",
      "initiative_community",
      "افتح لي قلبك",
      { reach: "800" } // reach is the beneficiary-flagged field
    ),
  ];

  // ---- Current month (e.g. June) -----------------------------------------
  const curItems: SavedItem[] = [
    saveItem("institutes", "othon_khair", "institute_online", "معهد أذن خير", {
      beneficiaries: "1300", // grew +30%
      batches: "4",
      [HIGHLIGHT_KEY]: "افتتاح دفعة جديدة بـ 120 طالبًا",
    }),
    saveItem("institutes", "bayyinat", "institute_offline", "معهد بيّنات", {
      beneficiaries: "450", // dropped
      courses: "9",
    }),
    saveItem(
      "educational_initiatives",
      "iftah_li_qalbak",
      "initiative_community",
      "افتح لي قلبك",
      { reach: "800" } // flat
    ),
    // a brand new item that did not exist last month.
    // sabbeh_tafrah's beneficiary-flagged field is `subscribers`, not `beneficiaries`.
    saveItem(
      "educational_initiatives",
      "sabbeh_tafrah",
      "initiative_seasonal",
      "سبّح تفرح",
      { subscribers: "200", seasons: "1", [HIGHLIGHT_KEY]: "انطلاق الموسم الأول" }
    ),
  ];

  it("1) form strings are normalized to numbers, highlight kept as text", () => {
    const m = curItems[0].metrics;
    expect(m.beneficiaries).toBe(1300);
    expect(m.batches).toBe(4);
    expect(m[HIGHLIGHT_KEY]).toBe("افتتاح دفعة جديدة بـ 120 طالبًا");
  });

  it("2) department + summary roll-up reflects item numbers", () => {
    const instMetrics = deptMetricsFromItems("institutes", curItems as ItemRow[]);
    // 1300 + 450 = 1750 beneficiaries; programs = batches4 + courses9 = 13
    expect(instMetrics.beneficiaries).toBe(1750);
    expect(instMetrics.programs).toBe(13);

    const summary = summaryFromItems(curItems as ItemRow[]);
    // institutes 1750 + iftah reach 800 + sabbeh subscribers 200 = 2750
    expect(summary.totalBeneficiaries).toBe(2750);
  });

  it("3) infographic top-items carry value, icon and highlight", () => {
    const view = buildInfographicItems(curItems);
    const inst = view["institutes"];
    // Sorted by beneficiaries desc -> othon_khair (1300) first
    expect(inst[0].name).toBe("معهد أذن خير");
    expect(inst[0].value).toBe(1300);
    expect(inst[0].icon).toBe("Ear"); // per-item override resolves
    expect(inst[0].highlight).toBe("افتتاح دفعة جديدة بـ 120 طالبًا");

    const init = view["educational_initiatives"];
    const sabbeh = init.find((x) => x.name === "سبّح تفرح");
    expect(sabbeh?.highlight).toBe("انطلاق الموسم الأول");
    expect(sabbeh?.icon).toBe("Sparkles");
  });

  it("4) month-over-month growth matches the overview rules", () => {
    // Index previous month by item key for lookup.
    const prevBen = new Map<string, number>();
    for (const it of prevItems) {
      prevBen.set(
        `${it.departmentKey}:${it.itemKey}`,
        itemBeneficiaries(it.departmentKey, it.itemKey, it.metrics as Record<string, number>)
      );
    }

    const curBen = (it: SavedItem) =>
      itemBeneficiaries(it.departmentKey, it.itemKey, it.metrics as Record<string, number>);

    // othon_khair: 1000 -> 1300 = +30% up
    const g1 = growth(curBen(curItems[0]), prevBen.get("institutes:othon_khair"));
    expect(g1.kind).toBe("up");
    expect(Math.round(g1.pct)).toBe(30);

    // bayyinat: 500 -> 450 = -10% down
    const g2 = growth(curBen(curItems[1]), prevBen.get("institutes:bayyinat"));
    expect(g2.kind).toBe("down");
    expect(Math.round(g2.pct)).toBe(-10);

    // iftah_li_qalbak: 800 -> 800 = flat
    const g3 = growth(
      curBen(curItems[2]),
      prevBen.get("educational_initiatives:iftah_li_qalbak")
    );
    expect(g3.kind).toBe("flat");

    // sabbeh_tafrah: brand new
    const g4 = growth(
      curBen(curItems[3]),
      prevBen.get("educational_initiatives:sabbeh_tafrah")
    );
    expect(g4.kind).toBe("new");
  });

  it("5) social vanity reach never inflates beneficiaries in the flow", () => {
    const withSocial: SavedItem[] = [
      ...curItems,
      saveItem(
        "media_communications",
        "social_youtube",
        "social_platform",
        "يوتيوب",
        { subscribers: "1000000", views: "237000000" }
      ),
    ];
    const summaryNoSocial = summaryFromItems(curItems as ItemRow[]);
    const summaryWithSocial = summaryFromItems(withSocial as ItemRow[]);
    // Adding a social platform must NOT change total beneficiaries.
    expect(summaryWithSocial.totalBeneficiaries).toBe(
      summaryNoSocial.totalBeneficiaries
    );
  });
});
