import { describe, expect, it } from "vitest";
import {
  ENTITIES,
  METRIC_DEFINITIONS,
  STRATEGIC_GOALS,
  STRATEGIC_TRACKS,
  aggregatePulseMetrics,
  calculateGoalProgress,
  metricsForEntityType,
} from "../shared/masterData";

describe("RAWAHEL Pulse master data", () => {
  it("contains the required strategic tracks and core goals", () => {
    expect(STRATEGIC_TRACKS).toHaveLength(5);
    expect(STRATEGIC_GOALS.length).toBeGreaterThanOrEqual(15);
    expect(STRATEGIC_TRACKS.map((track) => track.nameAr)).toContain("بناء الحاضنات التربوية");
    expect(STRATEGIC_GOALS.map((goal) => goal.nameAr)).toContain("جذب 1000 شاب وفتاة سنويًا");
  });

  it("seeds RAWAHEL entities as flexible master data, not only departments", () => {
    expect(ENTITIES.length).toBeGreaterThanOrEqual(25);
    expect(ENTITIES.map((entity) => entity.nameAr)).toContain("معهد أذن خير");
    expect(ENTITIES.map((entity) => entity.nameAr)).toContain("وحدة الجودة والتقييم");
    expect(new Set(ENTITIES.map((entity) => entity.type))).toContain("quran_institute");
  });

  it("provides core metrics plus entity-type KPI presets", () => {
    const quranMetrics = metricsForEntityType("quran_institute");
    expect(METRIC_DEFINITIONS.some((metric) => metric.key === "new_beneficiaries")).toBe(true);
    expect(quranMetrics.map((metric) => metric.nameAr)).toContain("الحلقات الشهرية");
    expect(quranMetrics.map((metric) => metric.nameAr)).toContain("الأجزاء المحفوظة");
  });

  it("aggregates monthly KPI totals without requiring beneficiary identity tracking", () => {
    const totals = aggregatePulseMetrics([
      { entityId: 1, metricKey: "new_beneficiaries", valueNumber: 120 },
      { entityId: 2, metricKey: "active_beneficiaries", valueNumber: 300 },
      { entityId: 3, metricKey: "activities_count", valueNumber: 14 },
      { entityId: 3, metricKey: "education_hours", valueNumber: 60 },
      { entityId: 4, metricKey: "answered_messages", valueNumber: 1500 },
      { entityId: 5, metricKey: "graduates", valueNumber: 22 },
    ]);

    expect(totals.totalBeneficiaries).toBe(420);
    expect(totals.newBeneficiaries).toBe(120);
    expect(totals.totalActivities).toBe(14);
    expect(totals.totalEducationHours).toBe(60);
    expect(totals.totalMessagesAnswered).toBe(1500);
    expect(totals.totalGraduates).toBe(22);
    expect(totals.note).toMatch(/تكرار المستفيدين/);
  });

  it("calculates goal progress only from explicitly linked KPI definitions", () => {
    const progress = calculateGoalProgress(
      [{ id: 1, key: "goal", nameAr: "هدف", targetValue: 100, targetUnit: "مستفيد" }],
      [{ goalId: 1, metricDefinitionId: 7, entityId: null, weight: 1, contributionType: "sum" }],
      [
        { entityId: 10, metricDefinitionId: 7, metricKey: "new_beneficiaries", valueNumber: 45 },
        { entityId: 10, metricDefinitionId: 99, metricKey: "answered_messages", valueNumber: 500 },
      ]
    );

    expect(progress[0]).toMatchObject({
      actual: 45,
      target: 100,
      progress: 45,
      status: "red",
      linkedMetricDefinitionIds: [7],
    });
  });
});
