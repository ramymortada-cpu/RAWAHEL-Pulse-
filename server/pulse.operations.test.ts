import { describe, expect, it } from "vitest";
import {
  archivePulseEntity,
  createPulseEntity,
  createPulseEvidence,
  createPulseMetricDefinition,
  createPulseStrategicGoal,
  createPulseStrategicTrack,
  getPulseDashboard,
  getMetricsForEntity,
  getPulseMasterData,
  linkPulseGoalToMetrics,
  linkPulseEntityToGoals,
  linkPulseEntityToTracks,
  seedPulseMasterData,
  upsertPulseMetricValue,
} from "./db";

describe("RAWAHEL Pulse operations", () => {
  it("creates an entity, links it to strategy, records KPI values, and archives it safely", async () => {
    const master = await seedPulseMasterData();
    const trackId = await createPulseStrategicTrack({
      key: `test_track_${Date.now()}`,
      nameAr: "مسار اختباري",
      descriptionAr: "مسار لاختبار إدارة المسارات",
      color: "#1b2a5e",
      icon: "Route",
      sortOrder: 999,
      isActive: true,
    });
    const goalId = await createPulseStrategicGoal({
      key: `test_goal_${Date.now()}`,
      trackId,
      nameAr: "هدف اختباري",
      descriptionAr: "هدف لاختبار الربط والتقدم",
      targetValue: 100,
      targetUnit: "مستفيد",
      periodType: "yearly",
      sortOrder: 999,
      isActive: true,
    });
    const entityId = await createPulseEntity({
      key: `test_entity_${Date.now()}`,
      nameAr: "كيان اختباري",
      type: "initiative",
      descriptionAr: "كيان لاختبار دورة Pulse",
      ownerName: "فريق الاختبار",
      status: "active",
      sortOrder: 999,
      color: "#2e7d6b",
      icon: "Sparkles",
      isActive: true,
    });
    await linkPulseEntityToTracks(entityId, [trackId]);
    await linkPulseEntityToGoals(entityId, [goalId]);

    const metricDefinitionId = await createPulseMetricDefinition({
      key: `test_metric_${Date.now()}`,
      entityId,
      appliesToType: null,
      nameAr: "مستفيدون اختباريون",
      descriptionAr: null,
      unit: "count",
      aggregation: "sum",
      direction: "higher_is_better",
      aggregationScope: "additive",
      isCore: false,
      isDonorFacing: true,
      sortOrder: 999,
      isActive: true,
    });
    await linkPulseGoalToMetrics(goalId, [
      {
        metricDefinitionId,
        entityId: null,
        weight: null,
        contributionType: "sum",
      },
    ]);
    const reportId = 987654;
    await upsertPulseMetricValue({
      reportId,
      entityId,
      metricDefinitionId,
      valueNumber: 45,
      valueText: null,
      notes: "قيمة اختبارية",
      source: "test",
    });
    await createPulseEvidence({
      reportId,
      entityId,
      goalId,
      titleAr: "قصة أثر اختبارية",
      descriptionAr: "وصف مختصر",
      type: "story",
      url: "https://example.com/story",
      fileKey: null,
      isDonorFacing: true,
      sortOrder: 1,
    });

    const dashboard = await getPulseDashboard(reportId);
    expect(dashboard.goalProgress.find((goal) => goal.goalId === goalId)).toMatchObject({
      actual: 45,
      progress: 45,
      linkedMetricDefinitionIds: [metricDefinitionId],
    });
    expect(dashboard.donorReadyHighlights.map((item) => item.titleAr)).toContain("قصة أثر اختبارية");
    expect(dashboard.missingSubmissions.some((entity) => entity.id === entityId)).toBe(false);

    await archivePulseEntity(entityId);
    const afterArchive = await getPulseDashboard(reportId);
    expect(afterArchive.activeEntities.some((entity) => entity.id === entityId)).toBe(false);

    const refreshed = await getPulseMasterData();
    expect(refreshed.entityGoalLinks.some((link) => link.entityId === entityId && link.goalId === goalId)).toBe(true);
    expect(master.tracks.length).toBeGreaterThanOrEqual(5);
  });

  it("shows entity-specific KPI definitions only for their entity", async () => {
    await seedPulseMasterData();
    const stamp = Date.now();
    const entityAId = await createPulseEntity({
      key: `test_metric_owner_${stamp}`,
      nameAr: "كيان مالك للمؤشر",
      type: "initiative",
      descriptionAr: "كيان له مؤشر خاص",
      ownerName: "فريق الاختبار",
      status: "active",
      sortOrder: 1001,
      color: "#2e7d6b",
      icon: "Sparkles",
      isActive: true,
    });
    const entityBId = await createPulseEntity({
      key: `test_metric_other_${stamp}`,
      nameAr: "كيان آخر",
      type: "initiative",
      descriptionAr: "كيان لا يجب أن يرى مؤشر غيره",
      ownerName: "فريق الاختبار",
      status: "active",
      sortOrder: 1002,
      color: "#4a90d9",
      icon: "Building2",
      isActive: true,
    });
    const metricDefinitionId = await createPulseMetricDefinition({
      key: `entity_private_metric_${stamp}`,
      entityId: entityAId,
      appliesToType: null,
      nameAr: "مؤشر خاص بكيان واحد",
      descriptionAr: null,
      unit: "count",
      aggregation: "sum",
      direction: "higher_is_better",
      aggregationScope: "additive",
      isCore: false,
      isDonorFacing: true,
      sortOrder: 1001,
      isActive: true,
    });

    const metricsForA = await getMetricsForEntity(entityAId);
    const metricsForB = await getMetricsForEntity(entityBId);

    expect(metricsForA.map((metric) => metric.id)).toContain(metricDefinitionId);
    expect(metricsForB.map((metric) => metric.id)).not.toContain(metricDefinitionId);
  });
});
