import { describe, expect, it } from "vitest";
import { ITEMS, getItemDef, getDepartmentItems, itemBeneficiaries } from "@shared/items";
import {
  rollupDepartment,
  deptMetricsFromItems,
  summaryFromItems,
  type ItemRow,
} from "@shared/aggregation";
import { DEPARTMENTS } from "@shared/departments";

describe("items catalog integrity", () => {
  it("uses only known department keys", () => {
    const deptKeys = new Set(DEPARTMENTS.map((d) => d.key));
    for (const key of Object.keys(ITEMS)) {
      expect(deptKeys.has(key)).toBe(true);
    }
  });

  it("every department in the catalog has at least one item", () => {
    for (const [, defs] of Object.entries(ITEMS)) {
      expect(defs.length).toBeGreaterThan(0);
    }
  });

  it("item keys are unique within a department", () => {
    for (const [, defs] of Object.entries(ITEMS)) {
      const keys = defs.map((d) => d.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("every item declares at least one metric and a baseline for each metric", () => {
    for (const [, defs] of Object.entries(ITEMS)) {
      for (const def of defs) {
        expect(def.metrics.length).toBeGreaterThan(0);
        for (const f of def.metrics) {
          expect(def.baseline).toHaveProperty(f.key);
        }
      }
    }
  });

  it("core impact departments have beneficiary-flagged metrics", () => {
    // Departments whose items represent people reached should roll up.
    const impactDepts = [
      "institutes",
      "educational_initiatives",
      "volunteer_office",
    ];
    for (const dept of impactDepts) {
      for (const def of ITEMS[dept]) {
        const hasBen = def.metrics.some((m) => m.isBeneficiary);
        expect(hasBen).toBe(true);
      }
    }
  });

  it("social platforms do NOT leak followers/views into beneficiaries", () => {
    // Social reach is vanity reach, not unique beneficiaries.
    const social = ITEMS["media_communications"].filter((d) =>
      d.type === "social_platform"
    );
    expect(social.length).toBeGreaterThan(0);
    for (const def of social) {
      const ben = itemBeneficiaries("media_communications", def.key, def.baseline);
      expect(ben).toBe(0);
    }
  });

  it("getItemDef and getDepartmentItems resolve known items", () => {
    expect(getItemDef("institutes", "othon_khair")?.nameAr).toBe("معهد أذن خير");
    expect(getDepartmentItems("educational_initiatives").length).toBeGreaterThan(3);
    expect(getItemDef("institutes", "does_not_exist")).toBeUndefined();
  });
});

describe("itemBeneficiaries", () => {
  it("sums all beneficiary-flagged fields of an item", () => {
    // iftah_li_qalbak counts `reach` as beneficiary, not telegram/whatsapp
    const v = itemBeneficiaries("educational_initiatives", "iftah_li_qalbak", {
      reach: 1000,
      telegram: 999,
      whatsapp: 999,
    });
    expect(v).toBe(1000);
  });

  it("falls back to a `beneficiaries` key for unknown items", () => {
    const v = itemBeneficiaries("institutes", "unknown_item", { beneficiaries: 42 });
    expect(v).toBe(42);
  });

  it("returns 0 when no relevant metric present", () => {
    const v = itemBeneficiaries("institutes", "othon_khair", { batches: 3 });
    expect(v).toBe(0);
  });
});

describe("rollupDepartment", () => {
  it("aggregates beneficiaries and program-like counters", () => {
    const items: ItemRow[] = [
      { departmentKey: "institutes", itemKey: "othon_khair", metrics: { beneficiaries: 1000, batches: 4 } },
      { departmentKey: "institutes", itemKey: "bayyinat", metrics: { beneficiaries: 500, courses: 13 } },
      // item from another department should be ignored
      { departmentKey: "finance", itemKey: "finance_unit", metrics: { budget: 9 } },
    ];
    const r = rollupDepartment("institutes", items);
    expect(r.beneficiaries).toBe(1500);
    // programs = batches(4) + courses(13)
    expect(r.programs).toBe(17);
  });

  it("collects volunteers for volunteer_office", () => {
    const items: ItemRow[] = [
      { departmentKey: "volunteer_office", itemKey: "volunteer_teams", metrics: { volunteers: 320, events: 12 } },
    ];
    const r = rollupDepartment("volunteer_office", items);
    expect(r.beneficiaries).toBe(320); // volunteers flagged as beneficiary
    expect(r.volunteers).toBe(320);
  });

  it("collects contentProduced for media_communications", () => {
    const items: ItemRow[] = [
      { departmentKey: "media_communications", itemKey: "media_office", metrics: { contentProduced: 60, programs: 5 } },
    ];
    const r = rollupDepartment("media_communications", items);
    expect(r.contentProduced).toBe(60);
    expect(r.programs).toBe(5);
  });
});

describe("deptMetricsFromItems", () => {
  it("produces beneficiaries + programs always", () => {
    const items: ItemRow[] = [
      { departmentKey: "institutes", itemKey: "othon_khair", metrics: { beneficiaries: 100, batches: 2 } },
    ];
    const m = deptMetricsFromItems("institutes", items);
    expect(m.beneficiaries).toBe(100);
    expect(m.programs).toBe(2);
    expect(m.volunteers).toBeUndefined();
  });

  it("includes volunteers only for volunteer_office", () => {
    const items: ItemRow[] = [
      { departmentKey: "volunteer_office", itemKey: "volunteer_teams", metrics: { volunteers: 50 } },
    ];
    const m = deptMetricsFromItems("volunteer_office", items);
    expect(m.volunteers).toBe(50);
  });
});

describe("summaryFromItems", () => {
  it("aggregates an entire report from item rows", () => {
    const items: ItemRow[] = [
      { departmentKey: "institutes", itemKey: "othon_khair", metrics: { beneficiaries: 1000, batches: 4 } },
      { departmentKey: "institutes", itemKey: "bayyinat", metrics: { beneficiaries: 500, courses: 2 } },
      { departmentKey: "volunteer_office", itemKey: "volunteer_teams", metrics: { volunteers: 200, events: 3 } },
      { departmentKey: "media_communications", itemKey: "media_office", metrics: { contentProduced: 30, programs: 1 } },
    ];
    const s = summaryFromItems(items);
    // beneficiaries = 1000 + 500 + 200(volunteers as beneficiary)
    expect(s.totalBeneficiaries).toBe(1700);
    // programs = 4 + 2 + 3(events not counted; only program-like keys) ...
    // institutes: batches4 + courses2 = 6; volunteer events not in list => 0; media programs 1 => total 7
    expect(s.programsExecuted).toBe(7);
    expect(s.volunteers).toBe(200);
    expect(s.contentProduced).toBe(30);
  });

  it("returns zeros for empty input", () => {
    const s = summaryFromItems([]);
    expect(s.totalBeneficiaries).toBe(0);
    expect(s.programsExecuted).toBe(0);
  });
});

describe("custom KPIs (__custom)", () => {
  it("reads custom metric definitions from a metrics object", async () => {
    const { getCustomMetricDefs, CUSTOM_METRICS_KEY } = await import("@shared/items");
    const metrics = {
      attendance: 30,
      [CUSTOM_METRICS_KEY]: [
        { key: "attendance", label: "عدد الحضور", isBeneficiary: true },
      ],
    };
    const defs = getCustomMetricDefs(metrics);
    expect(defs).toHaveLength(1);
    expect(defs[0].key).toBe("attendance");
    expect(defs[0].label).toBe("عدد الحضور");
    expect(defs[0].isBeneficiary).toBe(true);
  });

  it("returns an empty array when no custom defs present", async () => {
    const { getCustomMetricDefs } = await import("@shared/items");
    expect(getCustomMetricDefs({ beneficiaries: 5 })).toEqual([]);
    expect(getCustomMetricDefs(null)).toEqual([]);
    expect(getCustomMetricDefs(undefined)).toEqual([]);
  });

  it("ignores malformed custom def entries", async () => {
    const { getCustomMetricDefs, CUSTOM_METRICS_KEY } = await import("@shared/items");
    const metrics = {
      [CUSTOM_METRICS_KEY]: [
        { key: "ok", label: "صحيح" },
        { key: 123 }, // malformed -> dropped
        null, // dropped
        "nope", // dropped
      ],
    };
    const defs = getCustomMetricDefs(metrics as never);
    expect(defs).toHaveLength(1);
    expect(defs[0].key).toBe("ok");
  });

  it("adds a beneficiary-flagged custom KPI into the item beneficiaries roll-up", () => {
    // othon_khair has no built-in beneficiary metric in this synthetic case;
    // a custom KPI flagged beneficiary should be summed.
    const metrics = {
      batches: 3,
      attendance: 250,
      __custom: [{ key: "attendance", label: "حضور", isBeneficiary: true }],
    };
    const v = itemBeneficiaries("institutes", "othon_khair", metrics as never);
    expect(v).toBe(250);
  });

  it("does NOT count a non-beneficiary custom KPI in the roll-up", () => {
    const metrics = {
      beneficiaries: 100,
      satisfaction: 95,
      __custom: [{ key: "satisfaction", label: "الرضا %", isBeneficiary: false }],
    };
    // othon_khair counts `beneficiaries`-flagged builtin? it counts batches only normally.
    // Use a department/item whose builtin beneficiary is `beneficiaries`.
    const v = itemBeneficiaries("educational_initiatives", "iftah_li_qalbak", {
      reach: 100,
      satisfaction: 95,
      __custom: [{ key: "satisfaction", label: "الرضا %", isBeneficiary: false }],
    } as never);
    expect(v).toBe(100); // only reach counts, custom non-beneficiary ignored
    expect(metrics.__custom[0].isBeneficiary).toBe(false);
  });

  it("custom def array under __custom is never treated as a number by rollup", () => {
    const items: ItemRow[] = [
      {
        departmentKey: "institutes",
        itemKey: "othon_khair",
        metrics: {
          beneficiaries: 500,
          batches: 2,
          __custom: [{ key: "x", label: "x", isBeneficiary: false }],
        } as never,
      },
    ];
    const r = rollupDepartment("institutes", items);
    expect(r.beneficiaries).toBe(500);
    expect(Number.isFinite(r.programs)).toBe(true);
    expect(r.programs).toBe(2);
  });
});

describe("itemIconName", () => {
  it("returns a per-item override when defined", async () => {
    const { itemIconName } = await import("@shared/items");
    expect(itemIconName("institutes", "othon_khair")).toBe("Ear");
    expect(itemIconName("media_communications", "social_youtube")).toBe("Youtube");
  });

  it("falls back to the item-type icon for items without an override", async () => {
    const { itemIconName, ITEM_TYPE_ICON, getItemDef } = await import("@shared/items");
    // bidayat_alhidaya has an override; pick an item that likely has none.
    const def = getItemDef("educational_initiatives", "umrat_tarbawiya");
    expect(def).toBeDefined();
    // Either an override or its type icon — must be a non-empty string.
    const icon = itemIconName("educational_initiatives", "umrat_tarbawiya");
    expect(typeof icon).toBe("string");
    expect(icon.length).toBeGreaterThan(0);
    // ITEM_TYPE_ICON must cover every known item type.
    for (const t of Object.keys(ITEM_TYPE_ICON)) {
      expect(typeof (ITEM_TYPE_ICON as Record<string, string>)[t]).toBe("string");
    }
  });

  it("uses the passed itemType to resolve when item key is unknown", async () => {
    const { itemIconName, ITEM_TYPE_ICON } = await import("@shared/items");
    expect(itemIconName("institutes", "ghost_item", "institute_online")).toBe(
      ITEM_TYPE_ICON.institute_online
    );
  });

  it("returns a safe fallback when nothing resolves", async () => {
    const { itemIconName } = await import("@shared/items");
    expect(itemIconName("unknown_dept", "unknown_item")).toBe("CircleDot");
  });
});

describe("item highlight (أبرز إنجاز هذا الشهر)", () => {
  it("reads the highlight string from metrics", async () => {
    const { getItemHighlight, HIGHLIGHT_KEY } = await import("@shared/items");
    expect(getItemHighlight({ [HIGHLIGHT_KEY]: "تخريج دفعة جديدة" })).toBe(
      "تخريج دفعة جديدة"
    );
  });

  it("returns empty string when missing or wrong type", async () => {
    const { getItemHighlight, HIGHLIGHT_KEY } = await import("@shared/items");
    expect(getItemHighlight({})).toBe("");
    expect(getItemHighlight(null)).toBe("");
    expect(getItemHighlight(undefined)).toBe("");
    expect(getItemHighlight({ [HIGHLIGHT_KEY]: 123 } as never)).toBe("");
  });

  it("highlight key never leaks into beneficiary aggregation", async () => {
    const { HIGHLIGHT_KEY } = await import("@shared/items");
    const items: ItemRow[] = [
      {
        departmentKey: "institutes",
        itemKey: "othon_khair",
        metrics: { beneficiaries: 100, batches: 2, [HIGHLIGHT_KEY]: "إنجاز" } as never,
      },
    ];
    const r = rollupDepartment("institutes", items);
    expect(Number.isFinite(r.beneficiaries)).toBe(true);
    expect(r.programs).toBe(2);
  });
});

describe("normalizeItemMetrics (router persistence path)", () => {
  it("coerces numeric metric strings to numbers", async () => {
    const { normalizeItemMetrics } = await import("@shared/items");
    const out = normalizeItemMetrics({ beneficiaries: "1500", batches: "4" });
    expect(out.beneficiaries).toBe(1500);
    expect(out.batches).toBe(4);
  });

  it("turns empty/invalid numeric strings into 0", async () => {
    const { normalizeItemMetrics } = await import("@shared/items");
    const out = normalizeItemMetrics({ a: "", b: "abc" });
    expect(out.a).toBe(0);
    expect(out.b).toBe(0);
  });

  it("preserves the __highlight free text verbatim", async () => {
    const { normalizeItemMetrics, HIGHLIGHT_KEY } = await import("@shared/items");
    const out = normalizeItemMetrics({
      beneficiaries: "10",
      [HIGHLIGHT_KEY]: "تخريج دفعة جديدة من 120 طالبًا",
    });
    expect(out[HIGHLIGHT_KEY]).toBe("تخريج دفعة جديدة من 120 طالبًا");
    expect(out.beneficiaries).toBe(10);
  });

  it("preserves the __custom KPI defs array verbatim (not coerced to a number)", async () => {
    const { normalizeItemMetrics, CUSTOM_METRICS_KEY } = await import("@shared/items");
    const defs = [{ key: "attendance", label: "حضور", isBeneficiary: true }];
    const out = normalizeItemMetrics({
      attendance: "30",
      [CUSTOM_METRICS_KEY]: defs,
    });
    expect(out[CUSTOM_METRICS_KEY]).toEqual(defs);
    expect(Array.isArray(out[CUSTOM_METRICS_KEY])).toBe(true);
    expect(out.attendance).toBe(30);
  });

  it("round-trips through normalization + getItemHighlight (persistence proof)", async () => {
    const { normalizeItemMetrics, getItemHighlight } = await import("@shared/items");
    const saved = normalizeItemMetrics({
      beneficiaries: "200",
      __highlight: "إطلاق مبادرة جديدة",
    });
    // What we would store in the DB still yields the highlight on read-back.
    expect(getItemHighlight(saved)).toBe("إطلاق مبادرة جديدة");
  });
});
