import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, editorProcedure, permissionProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  approvePulseSubmission,
  archivePulseMetricValue,
  archivePulseEntity,
  createAuditLog,
  createPulseEntity,
  createPulseEvidence,
  createPulseMetricDefinition,
  createPulseReportExport,
  createPulseSubmissionLink,
  createPulseStrategicGoal,
  createPulseStrategicTrack,
  getMetricsForEntity,
  getPulseDashboard,
  getPulseMasterData,
  getPulseReportValues,
  getPulseSubmissionByToken,
  getPulseSubmissionReview,
  linkPulseGoalToMetrics,
  linkPulseEntityToGoals,
  linkPulseEntityToTracks,
  listPulseSubmissionLinks,
  regeneratePulseSubmissionLink,
  rejectPulseSubmission,
  requestPulseSubmissionRevision,
  revokePulseSubmissionLink,
  savePulseSubmission,
  seedPulseMasterData,
  updatePulseEntity,
  updatePulseMetricValueWithReason,
  updatePulseStrategicGoal,
  updatePulseStrategicTrack,
  upsertPulseMetricValue,
} from "../db";

const entityTypeSchema = z.enum([
  "office",
  "institute_online",
  "institute_offline",
  "quran_institute",
  "initiative",
  "campaign",
  "project",
  "unit",
  "department",
  "platform",
]);

const metricUnitSchema = z.enum(["count", "percent", "currency", "hours", "days", "text_score"]);
const metricAggregationSchema = z.enum(["sum", "avg", "latest", "max", "min"]);
const metricDirectionSchema = z.enum(["higher_is_better", "lower_is_better", "neutral"]);
const metricScopeSchema = z.enum(["additive", "non_additive", "latest"]);
const goalPeriodSchema = z.enum(["yearly", "two_years", "monthly", "custom"]);
const submissionEvidenceSchema = z.object({
  titleAr: z.string().optional().default(""),
  descriptionAr: z.string().nullable().optional(),
  url: z.string().optional().default(""),
  type: z.enum(["image", "video", "link", "document", "testimonial", "story"]).default("link"),
  isDonorFacing: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  featuredOrder: z.number().nullable().optional(),
});
const submissionPayloadSchema = z.object({
  token: z.string().min(16),
  values: z.array(
    z.object({
      metricDefinitionId: z.number(),
      valueNumber: z.number().nullable().optional(),
      valueText: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    })
  ).default([]),
  achievements: z.array(z.string()).default([]),
  operationsNotes: z.string().nullable().optional(),
  supportNeeded: z.string().nullable().optional(),
  evidence: z.array(submissionEvidenceSchema).default([]),
});

function publicSubmissionLink<T extends { tokenHash?: string }>(link: T) {
  const { tokenHash: _tokenHash, ...safeLink } = link;
  return safeLink;
}

export const pulseRouter = router({
  masterData: protectedProcedure.query(() => getPulseMasterData()),

  seedDefaults: adminProcedure.mutation(() => seedPulseMasterData()),

  createSubmissionLink: adminProcedure
    .input(
      z.object({
        reportId: z.number(),
        entityId: z.number(),
        managerName: z.string().min(2),
        managerEmail: z.string().email().optional().or(z.literal("")),
        managerPhone: z.string().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createPulseSubmissionLink({
        reportId: input.reportId,
        entityId: input.entityId,
        managerName: input.managerName,
        managerEmail: input.managerEmail || null,
        managerPhone: input.managerPhone || null,
        expiresAt: input.expiresAt ?? null,
        createdByUserId: ctx.user!.id,
      });
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "submission_link.generated",
        resourceType: "submission_link",
        resourceId: String(result.link.id),
        summaryAr: `تم إنشاء رابط إدخال شهري للمدير: ${input.managerName}`,
        metadataJson: { reportId: input.reportId, entityId: input.entityId },
      });
      return { link: publicSubmissionLink(result.link), rawToken: result.rawToken };
    }),

  listSubmissionLinks: adminProcedure.query(async () => {
    const links = await listPulseSubmissionLinks();
    return links.map(publicSubmissionLink);
  }),

  revokeSubmissionLink: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await revokePulseSubmissionLink(input.id);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "submission_link.revoked",
        resourceType: "submission_link",
        resourceId: String(input.id),
        summaryAr: "تم إلغاء رابط إدخال شهري.",
      });
      return { success: true };
    }),

  regenerateSubmissionLink: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await regeneratePulseSubmissionLink(input.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "submission_link.regenerated",
        resourceType: "submission_link",
        resourceId: String(input.id),
        summaryAr: "تمت إعادة إصدار رابط إدخال شهري وإبطال الرابط السابق.",
      });
      return { link: publicSubmissionLink(result.link), rawToken: result.rawToken };
    }),

  getSubmissionReview: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const review = await getPulseSubmissionReview(input.id);
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });
      return { ...review, link: publicSubmissionLink(review.link) };
    }),

  approveSubmission: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await approvePulseSubmission(input.id, ctx.user!.id);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "submission.approved",
        resourceType: "submission_link",
        resourceId: String(input.id),
        summaryAr: "تم اعتماد بيانات إدخال خارجي.",
      });
      return { success: true };
    }),

  requestSubmissionRevision: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requestPulseSubmissionRevision(input.id);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "submission.needs_revision",
        resourceType: "submission_link",
        resourceId: String(input.id),
        summaryAr: "تم طلب تعديل على إدخال خارجي.",
      });
      return { success: true };
    }),

  rejectSubmission: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await rejectPulseSubmission(input.id, ctx.user!.id);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "submission.rejected",
        resourceType: "submission_link",
        resourceId: String(input.id),
        summaryAr: "تم رفض إدخال خارجي واستبعاد قيمه وشواهده من التقارير الرسمية.",
      });
      return { success: true };
    }),

  getSubmissionByToken: publicProcedure
    .input(z.object({ token: z.string().min(16) }))
    .query(async ({ input }) => {
      try {
        return await getPulseSubmissionByToken(input.token);
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            error instanceof Error && error.message === "expired"
              ? "انتهت صلاحية رابط الإدخال"
              : error instanceof Error && error.message === "revoked"
                ? "تم إلغاء رابط الإدخال"
                : "رابط الإدخال غير صالح",
        });
      }
    }),

  saveSubmissionDraft: publicProcedure
    .input(submissionPayloadSchema)
    .mutation(async ({ input }) => {
      try {
        await savePulseSubmission(input.token, { ...input, final: false });
        return { success: true };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر حفظ المسودة" });
      }
    }),

  submitSubmissionFinal: publicProcedure
    .input(submissionPayloadSchema)
    .mutation(async ({ input }) => {
      try {
        await savePulseSubmission(input.token, { ...input, final: true });
        return { success: true };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تعذر إرسال البيانات" });
      }
    }),

  dashboard: protectedProcedure
    .input(z.object({ reportId: z.number().optional() }).optional())
    .query(({ input }) => getPulseDashboard(input?.reportId)),

  createTrack: adminProcedure
    .input(
      z.object({
        key: z.string().min(2),
        nameAr: z.string().min(2),
        descriptionAr: z.string().optional(),
        color: z.string().default("#1b2a5e"),
        icon: z.string().default("Circle"),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createPulseStrategicTrack({
        ...input,
        descriptionAr: input.descriptionAr ?? null,
        isActive: true,
      });
      return { id };
    }),

  updateTrack: adminProcedure
    .input(
      z.object({
        id: z.number(),
        nameAr: z.string().min(2).optional(),
        descriptionAr: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...patch } = input;
      await updatePulseStrategicTrack(id, patch);
      return { success: true };
    }),

  createGoal: adminProcedure
    .input(
      z.object({
        key: z.string().min(2),
        trackId: z.number().nullable().optional(),
        nameAr: z.string().min(2),
        descriptionAr: z.string().optional(),
        targetValue: z.number().default(0),
        targetUnit: z.string().default("عدد"),
        periodType: goalPeriodSchema.default("yearly"),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createPulseStrategicGoal({
        ...input,
        trackId: input.trackId ?? null,
        descriptionAr: input.descriptionAr ?? null,
        isActive: true,
      });
      return { id };
    }),

  updateGoal: adminProcedure
    .input(
      z.object({
        id: z.number(),
        trackId: z.number().nullable().optional(),
        nameAr: z.string().min(2).optional(),
        descriptionAr: z.string().optional(),
        targetValue: z.number().optional(),
        targetUnit: z.string().optional(),
        periodType: goalPeriodSchema.optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...patch } = input;
      await updatePulseStrategicGoal(id, patch);
      return { success: true };
    }),

  linkGoalMetrics: adminProcedure
    .input(
      z.object({
        goalId: z.number(),
        links: z.array(
          z.object({
            metricDefinitionId: z.number(),
            entityId: z.number().nullable().optional(),
            weight: z.number().nullable().optional(),
            contributionType: z.enum(["sum", "avg", "latest"]).default("sum"),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      await linkPulseGoalToMetrics(input.goalId, input.links);
      return { success: true, linked: input.links.length };
    }),

  createEntity: adminProcedure
    .input(
      z.object({
        key: z.string().min(2),
        nameAr: z.string().min(2),
        type: entityTypeSchema,
        descriptionAr: z.string().optional(),
        ownerName: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
        trackIds: z.array(z.number()).default([]),
        goalIds: z.array(z.number()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createPulseEntity({
        key: input.key,
        nameAr: input.nameAr,
        type: input.type,
        descriptionAr: input.descriptionAr ?? null,
        ownerName: input.ownerName ?? null,
        status: "active",
        color: input.color ?? "#1b2a5e",
        icon: input.icon ?? "Building2",
        sortOrder: input.sortOrder ?? 0,
        isActive: true,
      });
      await Promise.all([
        linkPulseEntityToTracks(id, input.trackIds),
        linkPulseEntityToGoals(id, input.goalIds),
      ]);
      return { id };
    }),

  updateEntity: adminProcedure
    .input(
      z.object({
        id: z.number(),
        nameAr: z.string().min(2).optional(),
        type: entityTypeSchema.optional(),
        descriptionAr: z.string().optional(),
        ownerName: z.string().optional(),
        status: z.enum(["active", "paused", "archived"]).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
        trackIds: z.array(z.number()).optional(),
        goalIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, trackIds, goalIds, ...patch } = input;
      await updatePulseEntity(id, patch);
      if (trackIds) await linkPulseEntityToTracks(id, trackIds);
      if (goalIds) await linkPulseEntityToGoals(id, goalIds);
      return { success: true };
    }),

  archiveEntity: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await archivePulseEntity(input.id);
      return { success: true };
    }),

  metricsForEntity: protectedProcedure
    .input(z.object({ entityId: z.number() }))
    .query(({ input }) => getMetricsForEntity(input.entityId)),

  createMetricDefinition: adminProcedure
    .input(
      z.object({
        key: z.string().min(2),
        entityId: z.number().optional(),
        appliesToType: entityTypeSchema.optional(),
        nameAr: z.string().min(2),
        descriptionAr: z.string().optional(),
        unit: metricUnitSchema.default("count"),
        aggregation: metricAggregationSchema.default("sum"),
        direction: metricDirectionSchema.default("higher_is_better"),
        aggregationScope: metricScopeSchema.default("additive"),
        isCore: z.boolean().default(false),
        isDonorFacing: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
        featuredOrder: z.number().nullable().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createPulseMetricDefinition({
        ...input,
        entityId: input.entityId ?? null,
        appliesToType: input.appliesToType ?? null,
        descriptionAr: input.descriptionAr ?? null,
        isActive: true,
      });
      return { id };
    }),

  saveMetricValues: editorProcedure
    .input(
      z.object({
        reportId: z.number(),
        entityId: z.number(),
        values: z.array(
          z.object({
            metricDefinitionId: z.number(),
            valueNumber: z.number().nullable().optional(),
            valueText: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
            source: z.string().nullable().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.values.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا توجد مؤشرات للحفظ" });
      }
      for (const value of input.values) {
        await upsertPulseMetricValue({
          reportId: input.reportId,
          entityId: input.entityId,
          metricDefinitionId: value.metricDefinitionId,
          valueNumber: value.valueNumber ?? null,
          valueText: value.valueText ?? null,
          notes: value.notes ?? null,
          source: value.source ?? null,
          updatedByUserId: ctx.user!.id,
        });
      }
      return { success: true, saved: input.values.length };
    }),

  updateMetricValue: permissionProcedure("metric:update_approved")
    .input(
      z.object({
        id: z.number(),
        valueNumber: z.number().nullable().optional(),
        valueText: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        changeReason: z.string().min(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await updatePulseMetricValueWithReason({
        id: input.id,
        actorUserId: ctx.user!.id,
        valueNumber: input.valueNumber ?? null,
        valueText: input.valueText ?? null,
        notes: input.notes ?? null,
        changeReason: input.changeReason,
      });
      if (!result) throw new TRPCError({ code: "NOT_FOUND" });
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "metric_value.updated_approved",
        resourceType: "metric_value",
        resourceId: String(input.id),
        summaryAr: "تم تعديل قيمة مؤشر معتمدة مع تسجيل سبب التعديل.",
        metadataJson: {
          reason: input.changeReason,
          previous: result.previous,
          current: result.current,
        },
      });
      return { success: true };
    }),

  archiveMetricValue: permissionProcedure("metric:update_approved")
    .input(z.object({ id: z.number(), changeReason: z.string().min(2) }))
    .mutation(async ({ ctx, input }) => {
      await archivePulseMetricValue(input.id, ctx.user!.id, input.changeReason);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "metric_value.archived",
        resourceType: "metric_value",
        resourceId: String(input.id),
        summaryAr: "تمت أرشفة قيمة مؤشر ولن تدخل في التقارير الرسمية.",
        metadataJson: { reason: input.changeReason },
      });
      return { success: true };
    }),

  reportValues: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(({ input }) => getPulseReportValues(input.reportId)),

  addEvidence: editorProcedure
    .input(
      z.object({
        reportId: z.number(),
        entityId: z.number().nullable().optional(),
        goalId: z.number().nullable().optional(),
        titleAr: z.string().min(2),
        descriptionAr: z.string().optional(),
        type: z.enum(["image", "video", "link", "document", "testimonial", "story"]).default("link"),
        url: z.string().min(2),
        isDonorFacing: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
        featuredOrder: z.number().nullable().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createPulseEvidence({
        reportId: input.reportId,
        entityId: input.entityId ?? null,
        goalId: input.goalId ?? null,
        titleAr: input.titleAr,
        descriptionAr: input.descriptionAr ?? null,
        type: input.type,
        url: input.url,
        isDonorFacing: input.isDonorFacing,
        isFeatured: input.isFeatured,
        featuredOrder: input.featuredOrder ?? null,
        sortOrder: input.sortOrder,
      });
      return { id };
    }),

  recordExport: permissionProcedure("export:create")
    .input(
      z.object({
        reportId: z.number(),
        type: z.enum(["pdf", "png"]),
        templateKey: z.string(),
        fileName: z.string(),
        fileKey: z.string().optional(),
        url: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createPulseReportExport({
        reportId: input.reportId,
        type: input.type,
        templateKey: input.templateKey,
        fileName: input.fileName,
        fileKey: input.fileKey ?? null,
        url: input.url ?? null,
      });
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "report.exported",
        resourceType: "report",
        resourceId: String(input.reportId),
        summaryAr: `تم تصدير التقرير بصيغة ${input.type.toUpperCase()}.`,
        metadataJson: { templateKey: input.templateKey, fileName: input.fileName },
      });
      return { id };
    }),
});
