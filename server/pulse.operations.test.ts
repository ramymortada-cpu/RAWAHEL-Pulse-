import { describe, expect, it } from "vitest";
import {
  archivePulseEntity,
  approvePulseSubmission,
  createPulseEntity,
  createPulseEvidence,
  createPulseMetricDefinition,
  createPulseSubmissionLink,
  createReport,
  createPulseStrategicGoal,
  createPulseStrategicTrack,
  getPulseDashboard,
  getMetricsForEntity,
  getPulseMasterData,
  getPulseSubmissionByToken,
  linkPulseGoalToMetrics,
  linkPulseEntityToGoals,
  linkPulseEntityToTracks,
  listPulseSubmissionLinks,
  revokePulseSubmissionLink,
  savePulseSubmission,
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

  it("scopes external submission links and requires approval before dashboard use", async () => {
    await seedPulseMasterData();
    const stamp = Date.now();
    const reportId = await createReport({
      ownerId: 1,
      title: `تقرير اختبار روابط ${stamp}`,
      year: 2026,
      month: 6,
      periodType: "monthly",
      audience: "donor",
      status: "draft",
    });
    const trackId = await createPulseStrategicTrack({
      key: `submission_track_${stamp}`,
      nameAr: "مسار روابط الإدخال",
      descriptionAr: "مسار لاختبار روابط الإدخال",
      color: "#1b2a5e",
      icon: "Route",
      sortOrder: 1100,
      isActive: true,
    });
    const goalId = await createPulseStrategicGoal({
      key: `submission_goal_${stamp}`,
      trackId,
      nameAr: "هدف روابط الإدخال",
      descriptionAr: "هدف لاختبار اعتماد القيم",
      targetValue: 100,
      targetUnit: "مستفيد",
      periodType: "monthly",
      sortOrder: 1100,
      isActive: true,
    });
    const entityAId = await createPulseEntity({
      key: `submission_entity_a_${stamp}`,
      nameAr: "كيان رابط أ",
      type: "initiative",
      descriptionAr: "كيان له رابط خارجي",
      ownerName: "مدير أ",
      status: "active",
      sortOrder: 1100,
      color: "#2e7d6b",
      icon: "Sparkles",
      isActive: true,
    });
    const entityBId = await createPulseEntity({
      key: `submission_entity_b_${stamp}`,
      nameAr: "كيان رابط ب",
      type: "project",
      descriptionAr: "كيان خارج نطاق الرابط",
      ownerName: "مدير ب",
      status: "active",
      sortOrder: 1101,
      color: "#4a90d9",
      icon: "Building2",
      isActive: true,
    });
    await linkPulseEntityToTracks(entityAId, [trackId]);
    await linkPulseEntityToGoals(entityAId, [goalId]);
    const metricAId = await createPulseMetricDefinition({
      key: `submission_metric_a_${stamp}`,
      entityId: entityAId,
      appliesToType: null,
      nameAr: "مستفيدون من الرابط",
      descriptionAr: null,
      unit: "count",
      aggregation: "sum",
      direction: "higher_is_better",
      aggregationScope: "additive",
      isCore: false,
      isDonorFacing: true,
      sortOrder: 1100,
      isActive: true,
    });
    const metricBId = await createPulseMetricDefinition({
      key: `submission_metric_b_${stamp}`,
      entityId: entityBId,
      appliesToType: null,
      nameAr: "مؤشر خارج النطاق",
      descriptionAr: null,
      unit: "count",
      aggregation: "sum",
      direction: "higher_is_better",
      aggregationScope: "additive",
      isCore: false,
      isDonorFacing: true,
      sortOrder: 1101,
      isActive: true,
    });
    await linkPulseGoalToMetrics(goalId, [{ metricDefinitionId: metricAId, contributionType: "sum" }]);

    const { link, rawToken } = await createPulseSubmissionLink({
      reportId,
      entityId: entityAId,
      managerName: "مدير الكيان",
      managerEmail: "manager@example.com",
      createdByUserId: 1,
    });
    expect(link.tokenHash).toBeTruthy();
    expect(link.tokenHash).not.toBe(rawToken);
    await expect(listPulseSubmissionLinks()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: link.id, tokenHash: link.tokenHash })])
    );

    const scoped = await getPulseSubmissionByToken(rawToken);
    expect(scoped.entity.id).toBe(entityAId);
    expect(scoped.metrics.map((metric) => metric.id)).toContain(metricAId);
    expect(scoped.metrics.map((metric) => metric.id)).not.toContain(metricBId);

    await expect(
      savePulseSubmission(rawToken, {
        values: [{ metricDefinitionId: metricBId, valueNumber: 999 }],
        final: false,
      })
    ).rejects.toThrow(/metric_scope_violation/);

    await savePulseSubmission(rawToken, {
      values: [{ metricDefinitionId: metricAId, valueNumber: 40 }],
      achievements: ["إنجاز اختباري"],
      evidence: [{ titleAr: "شاهد رابط", url: "https://example.com/evidence", isDonorFacing: true }],
      final: false,
    });
    await savePulseSubmission(rawToken, {
      values: [{ metricDefinitionId: metricAId, valueNumber: 40 }],
      achievements: ["إنجاز اختباري"],
      evidence: [{ titleAr: "شاهد رابط نهائي", url: "https://example.com/evidence-final", isDonorFacing: true }],
      final: true,
    });
    const beforeApproval = await getPulseDashboard(reportId);
    expect(beforeApproval.goalProgress.find((goal) => goal.goalId === goalId)).toMatchObject({ actual: 0, progress: 0 });

    await approvePulseSubmission(link.id, 1);
    const afterApproval = await getPulseDashboard(reportId);
    expect(afterApproval.goalProgress.find((goal) => goal.goalId === goalId)).toMatchObject({ actual: 40, progress: 40 });
    expect(afterApproval.donorReadyHighlights.map((item) => item.titleAr)).toContain("شاهد رابط نهائي");
  });

  it("rejects invalid, revoked, and expired external submission tokens", async () => {
    await seedPulseMasterData();
    await expect(getPulseSubmissionByToken("invalid-token-with-enough-length")).rejects.toThrow(/invalid/);
    const reportId = await createReport({
      ownerId: 1,
      title: "تقرير انتهاء رابط",
      year: 2026,
      month: 7,
      periodType: "monthly",
      audience: "internal",
      status: "draft",
    });
    const entityId = (await getPulseMasterData()).entities[0].id;
    const revoked = await createPulseSubmissionLink({ reportId, entityId, managerName: "ملغي", createdByUserId: 1 });
    await revokePulseSubmissionLink(revoked.link.id);
    await expect(getPulseSubmissionByToken(revoked.rawToken)).rejects.toThrow(/revoked/);
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expired = await createPulseSubmissionLink({ reportId, entityId, managerName: "منتهي", createdByUserId: 1, expiresAt: expiredDate });
    await expect(getPulseSubmissionByToken(expired.rawToken)).rejects.toThrow(/expired/);
  });
});
