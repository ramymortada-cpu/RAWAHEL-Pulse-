import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, editorProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  archivePulseEntity,
  createPulseEntity,
  createPulseEvidence,
  createPulseMetricDefinition,
  createPulseReportExport,
  getMetricsForEntity,
  getPulseDashboard,
  getPulseMasterData,
  getPulseReportValues,
  linkPulseEntityToGoals,
  linkPulseEntityToTracks,
  seedPulseMasterData,
  updatePulseEntity,
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

export const pulseRouter = router({
  masterData: protectedProcedure.query(() => getPulseMasterData()),

  seedDefaults: adminProcedure.mutation(() => seedPulseMasterData()),

  dashboard: protectedProcedure
    .input(z.object({ reportId: z.number().optional() }).optional())
    .query(({ input }) => getPulseDashboard(input?.reportId)),

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
    .mutation(async ({ input }) => {
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
        });
      }
      return { success: true, saved: input.values.length };
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
        sortOrder: input.sortOrder,
      });
      return { id };
    }),

  recordExport: editorProcedure
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
    .mutation(async ({ input }) => {
      const id = await createPulseReportExport({
        reportId: input.reportId,
        type: input.type,
        templateKey: input.templateKey,
        fileName: input.fileName,
        fileKey: input.fileKey ?? null,
        url: input.url ?? null,
      });
      return { id };
    }),
});
