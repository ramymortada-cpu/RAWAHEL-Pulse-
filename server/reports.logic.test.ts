import { describe, expect, it } from "vitest";
import { DEPARTMENTS, monthName, DEPARTMENT_MAP } from "../shared/departments";
import {
  computeSummary,
  computeTrends,
  parseSheetUrl,
  parseCsv,
} from "./sheetSync";

describe("departments contract", () => {
  it("contains exactly the 9 required departments with stable keys", () => {
    const keys = DEPARTMENTS.map((d) => d.key);
    expect(keys).toEqual([
      "scientific_office",
      "educational_office",
      "institutes",
      "educational_initiatives",
      "media_communications",
      "volunteer_office",
      "pr",
      "hr",
      "finance",
    ]);
  });

  it("each department has the common metrics", () => {
    for (const d of DEPARTMENTS) {
      const mk = d.metrics.map((m) => m.key);
      expect(mk).toContain("beneficiaries");
      expect(mk).toContain("programs");
      expect(mk).toContain("goalTarget");
      expect(mk).toContain("goalAchieved");
    }
  });

  it("department map resolves by key", () => {
    expect(DEPARTMENT_MAP["hr"]?.name).toBe("الموارد البشرية");
  });
});

describe("monthName", () => {
  it("maps month numbers to Arabic names", () => {
    expect(monthName(1)).toBe("يناير");
    expect(monthName(6)).toBe("يونيو");
    expect(monthName(12)).toBe("ديسمبر");
  });
});

describe("computeSummary", () => {
  it("aggregates beneficiaries and programs across departments", () => {
    const s = computeSummary([
      {
        departmentKey: "scientific_office",
        metrics: { beneficiaries: 100, programs: 3, goalTarget: 10, goalAchieved: 8 },
      },
      {
        departmentKey: "hr",
        metrics: { beneficiaries: 50, programs: 2, goalTarget: 10, goalAchieved: 10 },
      },
    ]);
    expect(s.totalBeneficiaries).toBe(150);
    expect(s.programsExecuted).toBe(5);
    // (8+10)/(10+10) = 90%
    expect(s.goalAchievementRate).toBe(90);
  });

  it("counts volunteers only from volunteer_office", () => {
    const s = computeSummary([
      { departmentKey: "volunteer_office", metrics: { volunteers: 40 } },
      { departmentKey: "hr", metrics: { volunteers: 999 } },
    ]);
    expect(s.volunteers).toBe(40);
  });

  it("counts content only from media_communications", () => {
    const s = computeSummary([
      { departmentKey: "media_communications", metrics: { contentProduced: 25 } },
      { departmentKey: "pr", metrics: { contentProduced: 999 } },
    ]);
    expect(s.contentProduced).toBe(25);
  });

  it("returns zero rate when no targets", () => {
    const s = computeSummary([
      { departmentKey: "finance", metrics: { beneficiaries: 5 } },
    ]);
    expect(s.goalAchievementRate).toBe(0);
  });
});

describe("computeTrends", () => {
  it("returns empty trends when no previous month", () => {
    const cur = {
      totalBeneficiaries: 100,
      programsExecuted: 5,
      volunteers: 10,
      contentProduced: 20,
      goalAchievementRate: 80,
    };
    expect(computeTrends(cur, undefined)).toEqual({});
  });

  it("computes percentage change vs previous month", () => {
    const prev = {
      totalBeneficiaries: 100,
      programsExecuted: 4,
      volunteers: 10,
      contentProduced: 20,
      goalAchievementRate: 70,
    };
    const cur = {
      totalBeneficiaries: 150,
      programsExecuted: 8,
      volunteers: 5,
      contentProduced: 20,
      goalAchievementRate: 85,
    };
    const t = computeTrends(cur, prev);
    expect(t.totalBeneficiaries).toBe(50); // +50%
    expect(t.programsExecuted).toBe(100); // +100%
    expect(t.volunteers).toBe(-50); // -50%
    expect(t.contentProduced).toBe(0);
    expect(t.goalAchievementRate).toBe(15); // percentage-point delta
  });
});

describe("parseSheetUrl", () => {
  it("extracts sheetId and gid from a standard Google Sheets URL", () => {
    const { sheetId, gid } = parseSheetUrl(
      "https://docs.google.com/spreadsheets/d/1AbC_dEf-123/edit#gid=456"
    );
    expect(sheetId).toBe("1AbC_dEf-123");
    expect(gid).toBe("456");
  });

  it("returns undefined sheetId for an invalid URL", () => {
    const { sheetId } = parseSheetUrl("https://example.com/not-a-sheet");
    expect(sheetId).toBeUndefined();
  });
});

describe("parseCsv", () => {
  it("parses a simple CSV into rows", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n4,5,6");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCsv('name,note\nx,"hello, world"\n');
    expect(rows[1]).toEqual(["x", "hello, world"]);
  });
});

import { computeDelta, computeDepartmentComparison } from "@shared/comparison";

describe("month-to-month comparison", () => {
  it("computes percentage growth for regular metrics", () => {
    const r = computeDelta(100, 150);
    expect(r.diff).toBe(50);
    expect(r.pct).toBe(50);
    expect(r.direction).toBe("up");
  });

  it("computes decline correctly", () => {
    const r = computeDelta(200, 150);
    expect(r.diff).toBe(-50);
    expect(r.pct).toBe(-25);
    expect(r.direction).toBe("down");
  });

  it("treats goal-rate as percentage points when isPercent=true", () => {
    const r = computeDelta(78, 86, true);
    expect(r.diff).toBe(8);
    expect(r.pct).toBe(8); // points, not percent change
  });

  it("handles zero baseline without division errors", () => {
    expect(computeDelta(0, 0).pct).toBe(0);
    expect(computeDelta(0, 0).direction).toBe("flat");
    expect(computeDelta(0, 10).pct).toBe(100);
    expect(computeDelta(0, 10).direction).toBe("up");
  });

  it("builds one comparison row per department with beneficiary deltas", () => {
    const depsA = [
      { departmentKey: "scientific_office", metrics: { beneficiaries: 1200 } },
      { departmentKey: "finance", metrics: { beneficiaries: 500 } },
    ];
    const depsB = [
      { departmentKey: "scientific_office", metrics: { beneficiaries: 1650 } },
      { departmentKey: "finance", metrics: { beneficiaries: 900 } },
    ];
    const rows = computeDepartmentComparison(depsA, depsB);
    expect(rows).toHaveLength(DEPARTMENTS.length);
    const sci = rows.find((r) => r.key === "scientific_office")!;
    expect(sci.beneficiariesA).toBe(1200);
    expect(sci.beneficiariesB).toBe(1650);
    expect(sci.delta.direction).toBe("up");
    const fin = rows.find((r) => r.key === "finance")!;
    expect(fin.delta.pct).toBe(80);
    // departments absent from both months default to zero
    const missing = rows.find((r) => r.key === "hr")!;
    expect(missing.beneficiariesA).toBe(0);
    expect(missing.beneficiariesB).toBe(0);
    expect(missing.delta.direction).toBe("flat");
  });
});
