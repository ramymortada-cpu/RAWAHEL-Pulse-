import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  createPulseEntity,
  createPulseMetricDefinition,
  createPulseSubmissionLink,
  createReport,
  getPulseDashboard,
  seedPulseMasterData,
  upsertPulseMetricValue,
} from "./db";

type Role = "super_admin" | "admin" | "editor" | "viewer";
type User = NonNullable<TrpcContext["user"]>;

function ctx(role: Role, id: number): TrpcContext {
  const now = new Date();
  const user: User = {
    id,
    openId: `test-${role}-${id}`,
    name: `مستخدم ${role}`,
    email: `${role}-${id}@example.com`,
    passwordHash: null,
    loginMethod: "test",
    role,
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function publicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin portal access control", () => {
  it("blocks unauthenticated admin APIs and viewer edits", async () => {
    await expect(appRouter.createCaller(publicCtx()).admin.dashboard()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(appRouter.createCaller(ctx("viewer", 20)).reports.create({
      year: 2026,
      month: 10,
      periodType: "monthly",
      audience: "internal",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows editor metric entry but blocks official approval", async () => {
    await seedPulseMasterData();
    const stamp = Date.now();
    const reportId = await createReport({
      ownerId: 31,
      title: `تقرير محرر ${stamp}`,
      year: 2027,
      month: 1,
      periodType: "monthly",
      audience: "internal",
      status: "draft",
    });
    const entityId = await createPulseEntity({
      key: `editor_entity_${stamp}`,
      nameAr: "كيان اختبار محرر",
      type: "initiative",
      descriptionAr: null,
      ownerName: null,
      status: "active",
      sortOrder: 0,
      color: "#2e7d6b",
      icon: "Sparkles",
      isActive: true,
    });
    const metricDefinitionId = await createPulseMetricDefinition({
      key: `editor_metric_${stamp}`,
      entityId,
      appliesToType: null,
      nameAr: "مؤشر محرر",
      descriptionAr: null,
      unit: "count",
      aggregation: "sum",
      direction: "higher_is_better",
      aggregationScope: "additive",
      isCore: false,
      isDonorFacing: true,
      sortOrder: 0,
      isActive: true,
    });
    const editor = appRouter.createCaller(ctx("editor", 31));
    await expect(editor.pulse.saveMetricValues({
      reportId,
      entityId,
      values: [{ metricDefinitionId, valueNumber: 7 }],
    })).resolves.toMatchObject({ success: true });

    const link = await createPulseSubmissionLink({
      reportId,
      entityId,
      managerName: "مدير خارجي",
      createdByUserId: 31,
    });
    await expect(editor.pulse.approveSubmission({ id: link.link.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admin approval, report archive, approved edits with reason, and audit logging", async () => {
    await seedPulseMasterData();
    const stamp = Date.now();
    const reportId = await createReport({
      ownerId: 41,
      title: `تقرير مدير ${stamp}`,
      year: 2027,
      month: 2,
      periodType: "monthly",
      audience: "donor",
      status: "draft",
    });
    const entityId = await createPulseEntity({
      key: `admin_entity_${stamp}`,
      nameAr: "كيان اختبار مدير",
      type: "initiative",
      descriptionAr: null,
      ownerName: null,
      status: "active",
      sortOrder: 0,
      color: "#1b2a5e",
      icon: "Building2",
      isActive: true,
    });
    const metricDefinitionId = await createPulseMetricDefinition({
      key: `admin_metric_${stamp}`,
      entityId,
      appliesToType: null,
      nameAr: "مؤشر مدير",
      descriptionAr: null,
      unit: "count",
      aggregation: "sum",
      direction: "higher_is_better",
      aggregationScope: "additive",
      isCore: false,
      isDonorFacing: true,
      sortOrder: 0,
      isActive: true,
    });
    const valueId = await upsertPulseMetricValue({
      reportId,
      entityId,
      metricDefinitionId,
      valueNumber: 10,
      valueText: null,
      notes: null,
      source: "test",
      submissionStatus: "approved",
    });
    const admin = appRouter.createCaller(ctx("admin", 41));

    await expect(admin.pulse.updateMetricValue({
      id: valueId,
      valueNumber: 12,
      valueText: null,
      notes: "تعديل إداري",
      changeReason: "تصحيح رقم بعد مراجعة الشاهد",
    })).resolves.toMatchObject({ success: true });
    await expect(admin.pulse.archiveMetricValue({
      id: valueId,
      changeReason: "قيمة مكررة لا تدخل التقرير الرسمي",
    })).resolves.toMatchObject({ success: true });

    const dashboard = await getPulseDashboard(reportId);
    expect(dashboard.totals.approvedValueCount).toBe(0);

    await expect(admin.reports.archive({ id: reportId })).resolves.toMatchObject({ success: true });
    const activeReports = await admin.reports.list();
    expect(activeReports.some((report) => report.id === reportId)).toBe(false);
    const audit = await admin.admin.auditLog();
    expect(audit.map((item) => item.action)).toEqual(expect.arrayContaining([
      "metric_value.updated_approved",
      "metric_value.archived",
      "report.archived",
    ]));
  });

  it("allows super admin user management and keeps external token access public", async () => {
    await seedPulseMasterData();
    const stamp = Date.now();
    const reportId = await createReport({
      ownerId: 51,
      title: `تقرير رابط عام ${stamp}`,
      year: 2027,
      month: 3,
      periodType: "monthly",
      audience: "internal",
      status: "draft",
    });
    const entityId = (await seedPulseMasterData()).entities[0].id;
    const superAdmin = appRouter.createCaller(ctx("super_admin", 51));
    await expect(superAdmin.admin.createUser({
      name: "مشاهد جديد",
      email: `viewer-${stamp}@example.com`,
      role: "viewer",
      status: "active",
    })).resolves.toHaveProperty("id");

    const { rawToken } = await createPulseSubmissionLink({
      reportId,
      entityId,
      managerName: "مدير خارجي عام",
      createdByUserId: 51,
    });
    const publicCaller = appRouter.createCaller(publicCtx());
    await expect(publicCaller.pulse.getSubmissionByToken({ token: rawToken })).resolves.toMatchObject({
      entity: expect.objectContaining({ id: entityId }),
    });
    await expect(publicCaller.admin.dashboard()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
