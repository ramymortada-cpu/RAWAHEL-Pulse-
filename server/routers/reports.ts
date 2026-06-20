import { z } from "zod";
import { permissionProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  archiveReport,
  cancelReport,
  listReports,
  getReport,
  findReportByPeriod,
  createReport,
  updateReport,
  deleteReport,
  createAuditLog,
  getDepartmentData,
  upsertDepartmentData,
  getSheetConfig,
  upsertSheetConfig,
  getItemsByReport,
  upsertItem,
  deleteItem,
  reorderItems,
} from "../db";
import { monthName } from "@shared/departments";
import { ITEMS, normalizeItemMetrics } from "@shared/items";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import {
  refreshSummary,
  parseSheetUrl,
  fetchSheetRows,
  importSheetRows,
} from "../sheetSync";

const metricsSchema = z.record(
  z.string(),
  z.union([z.number(), z.string()])
);

// Item metrics may also carry a __custom array describing custom KPI defs.
const customDefSchema = z.array(
  z.object({
    key: z.string(),
    label: z.string(),
    isBeneficiary: z.boolean().optional(),
  })
);
const itemMetricsSchema = z.record(
  z.string(),
  z.union([z.number(), z.string(), customDefSchema])
);

export const reportsRouter = router({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().default(false) }).optional())
    .query(({ ctx, input }) => listReports(ctx.user!.id, { includeInactive: input?.includeInactive ?? false })),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      const [departments, items] = await Promise.all([
        getDepartmentData(input.id),
        getItemsByReport(input.id),
      ]);
      return { report, departments, items };
    }),

  // List named items for a report (optionally filtered by department).
  listItems: protectedProcedure
    .input(z.object({ reportId: z.number(), departmentKey: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await getItemsByReport(input.reportId);
      return input.departmentKey
        ? items.filter((i) => i.departmentKey === input.departmentKey)
        : items;
    }),

  // Return the items of the chronologically-previous report (for growth deltas).
  prevReportItems: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ ctx, input }) => {
      const current = await getReport(ctx.user!.id, input.reportId);
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      const all = await listReports(ctx.user!.id);
      const prev = all
        .filter(
          (r) =>
            r.year < current.year ||
            (r.year === current.year && r.month < current.month)
        )
        .sort((a, b) => b.year - a.year || b.month - a.month)[0];
      if (!prev) return { prevReport: null as null | typeof prev, items: [] as Awaited<ReturnType<typeof getItemsByReport>> };
      const items = await getItemsByReport(prev.id);
      return { prevReport: prev, items };
    }),

  // Compare two reports side by side (summary + per-department data).
  compare: protectedProcedure
    .input(z.object({ idA: z.number(), idB: z.number() }))
    .query(async ({ ctx, input }) => {
      const [a, b] = await Promise.all([
        getReport(ctx.user!.id, input.idA),
        getReport(ctx.user!.id, input.idB),
      ]);
      if (!a || !b) throw new TRPCError({ code: "NOT_FOUND" });
      const [depsA, depsB, itemsA, itemsB] = await Promise.all([
        getDepartmentData(input.idA),
        getDepartmentData(input.idB),
        getItemsByReport(input.idA),
        getItemsByReport(input.idB),
      ]);
      return {
        a: { report: a, departments: depsA, items: itemsA },
        b: { report: b, departments: depsB, items: itemsB },
      };
    }),

  // Beneficiary growth series across months up to (and including) the given report.
  growthSeries: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ ctx, input }) => {
      const current = await getReport(ctx.user!.id, input.reportId);
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      const all = await listReports(ctx.user!.id);
      // chronological order, only periods up to the current report
      const ordered = all
        .filter(
          (r) =>
            r.year < current.year ||
            (r.year === current.year && r.month <= current.month)
        )
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .slice(-6);
      return ordered.map((r) => {
        const s = (r.summary ?? {}) as { totalBeneficiaries?: number };
        return {
          label: `${monthName(r.month).slice(0, 4)}`,
          value: Number(s.totalBeneficiaries ?? 0) || 0,
        };
      });
    }),

  create: permissionProcedure("report:create")
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        periodType: z.enum(["monthly", "quarterly", "semiannual", "annual"]).default("monthly"),
        audience: z.enum(["internal", "donor", "board", "public"]).default("internal"),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await findReportByPeriod(ctx.user!.id, input.year, input.month);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "يوجد تقرير لهذا الشهر بالفعل",
        });
      }
      const title = input.title?.trim() || `نبض رواحل · تقرير ${monthName(input.month)} ${input.year}`;
      const id = await createReport({
        ownerId: ctx.user!.id,
        title,
        year: input.year,
        month: input.month,
        periodType: input.periodType,
        audience: input.audience,
        status: "draft",
      });
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "report.created",
        resourceType: "report",
        resourceId: String(id),
        summaryAr: `تم إنشاء التقرير: ${title}`,
      });
      return { id };
    }),

  delete: permissionProcedure("report:delete")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteReport(ctx.user!.id, input.id);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "report.deleted",
        resourceType: "report",
        resourceId: String(input.id),
        summaryAr: "تم حذف تقرير نهائيًا بواسطة مدير عام.",
      });
      return { success: true };
    }),

  archive: permissionProcedure("report:archive")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      await archiveReport(ctx.user!.id, input.id, ctx.user!.id);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "report.archived",
        resourceType: "report",
        resourceId: String(input.id),
        summaryAr: `تمت أرشفة التقرير: ${report.title}`,
      });
      return { success: true };
    }),

  cancel: permissionProcedure("report:cancel")
    .input(z.object({ id: z.number(), reason: z.string().min(2) }))
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      await cancelReport(ctx.user!.id, input.id, ctx.user!.id, input.reason);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "report.cancelled",
        resourceType: "report",
        resourceId: String(input.id),
        summaryAr: `تم إلغاء التقرير: ${report.title}`,
        metadataJson: { reason: input.reason },
      });
      return { success: true };
    }),

  saveDepartment: permissionProcedure("report:update")
    .input(
      z.object({
        reportId: z.number(),
        departmentKey: z.string(),
        metrics: metricsSchema,
        achievements: z.array(z.string()).default([]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      const normalized: Record<string, number> = {};
      for (const [k, v] of Object.entries(input.metrics)) {
        normalized[k] = typeof v === "string" ? Number(v) || 0 : v;
      }
      await upsertDepartmentData({
        reportId: input.reportId,
        departmentKey: input.departmentKey,
        metrics: normalized,
        achievements: input.achievements,
        notes: input.notes ?? null,
      });
      await refreshSummary(ctx.user!.id, input.reportId);
      return { success: true };
    }),

  // Save (create/update) a single named item, then re-roll the summary.
  saveItem: permissionProcedure("report:update")
    .input(
      z.object({
        reportId: z.number(),
        departmentKey: z.string(),
        itemKey: z.string(),
        itemNameAr: z.string(),
        itemType: z.string(),
        metrics: itemMetricsSchema,
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      // Preserve __custom (KPI defs) and __highlight (free text) verbatim;
      // coerce the rest to numbers. Shared, unit-tested normalization helper.
      const normalized = normalizeItemMetrics(
        input.metrics as Record<string, unknown>
      );
      await upsertItem({
        reportId: input.reportId,
        departmentKey: input.departmentKey,
        itemKey: input.itemKey,
        itemNameAr: input.itemNameAr,
        itemType: input.itemType,
        metrics: normalized as Record<string, number>,
        notes: input.notes ?? null,
        sortOrder: input.sortOrder ?? 0,
      });
      await refreshSummary(ctx.user!.id, input.reportId);
      return { success: true };
    }),

  // Persist drag-and-drop reordering within a department.
  reorderItems: permissionProcedure("report:update")
    .input(
      z.object({
        reportId: z.number(),
        departmentKey: z.string(),
        orderedItemKeys: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      await reorderItems(input.reportId, input.departmentKey, input.orderedItemKeys);
      return { success: true };
    }),

  deleteItem: permissionProcedure("report:update")
    .input(
      z.object({ reportId: z.number(), departmentKey: z.string(), itemKey: z.string() })
    )
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteItem(input.reportId, input.departmentKey, input.itemKey);
      await refreshSummary(ctx.user!.id, input.reportId);
      return { success: true };
    }),

  // Seed the catalog baseline items for a report (only items not already present).
  seedBaseline: permissionProcedure("report:update")
    .input(z.object({ reportId: z.number(), overwrite: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      const existing = await getItemsByReport(input.reportId);
      const existingSet = new Set(existing.map((i) => `${i.departmentKey}:${i.itemKey}`));
      let seeded = 0;
      for (const [departmentKey, defs] of Object.entries(ITEMS)) {
        let order = 0;
        for (const def of defs) {
          order += 1;
          const id = `${departmentKey}:${def.key}`;
          if (!input.overwrite && existingSet.has(id)) continue;
          await upsertItem({
            reportId: input.reportId,
            departmentKey,
            itemKey: def.key,
            itemNameAr: def.nameAr,
            itemType: def.type,
            metrics: { ...def.baseline },
            notes: def.subtitle ?? null,
            sortOrder: order,
          });
          seeded += 1;
        }
      }
      await refreshSummary(ctx.user!.id, input.reportId);
      return { seeded };
    }),

  refreshSummary: permissionProcedure("report:update")
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const summary = await refreshSummary(ctx.user!.id, input.reportId);
      return summary;
    }),

  uploadPdf: permissionProcedure("export:create")
    .input(z.object({ reportId: z.number(), base64: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      const buffer = Buffer.from(input.base64, "base64");
      const relKey = `reports/${ctx.user!.id}/report-${report.year}-${String(
        report.month
      ).padStart(2, "0")}.pdf`;
      const { key, url } = await storagePut(relKey, buffer, "application/pdf");
      return { key, url };
    }),

  markGenerated: permissionProcedure("export:create")
    .input(z.object({ reportId: z.number(), pdfKey: z.string(), pdfUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });
      await updateReport(ctx.user!.id, input.reportId, {
        status: "locked",
        pdfKey: input.pdfKey,
        pdfUrl: input.pdfUrl,
        generatedAt: new Date(),
      });
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "report.exported",
        resourceType: "report",
        resourceId: String(input.reportId),
        summaryAr: "تم إنشاء تصدير PDF للتقرير.",
      });
      return { success: true };
    }),

  /* --------------- Google Sheets --------------- */
  getSheetConfig: protectedProcedure.query(({ ctx }) => getSheetConfig(ctx.user!.id)),

  saveSheetConfig: permissionProcedure("report:update")
    .input(z.object({ sheetUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const { sheetId, gid } = parseSheetUrl(input.sheetUrl);
      if (!sheetId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط Google Sheets غير صحيح",
        });
      }
      await upsertSheetConfig({
        ownerId: ctx.user!.id,
        sheetUrl: input.sheetUrl,
        sheetId,
        gid: gid ?? "0",
        enabled: true,
      });
      return { success: true };
    }),

  syncFromSheet: permissionProcedure("report:update")
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const cfg = await getSheetConfig(ctx.user!.id);
      if (!cfg) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لم يتم ربط Google Sheets بعد",
        });
      }
      const report = await getReport(ctx.user!.id, input.reportId);
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });

      let rows: string[][];
      try {
        rows = await fetchSheetRows(cfg.sheetId!, cfg.gid ?? "0");
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "تعذّر قراءة الجدول",
        });
      }
      const imported = await importSheetRows(input.reportId, rows);
      await upsertSheetConfig({
        ownerId: ctx.user!.id,
        sheetUrl: cfg.sheetUrl,
        sheetId: cfg.sheetId,
        gid: cfg.gid,
        enabled: cfg.enabled,
        lastSyncedAt: new Date(),
      });
      await refreshSummary(ctx.user!.id, input.reportId);
      return { imported };
    }),

});
