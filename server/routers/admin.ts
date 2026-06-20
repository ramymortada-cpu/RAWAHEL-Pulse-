import { z } from "zod";
import { permissionProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createInternalUser,
  getSystemSettings,
  getPulseDashboard,
  listAuditLogs,
  listReports,
  listUsers,
  updateSystemSettings,
  updateInternalUser,
} from "../db";

const roleSchema = z.enum(["super_admin", "admin", "editor", "viewer"]);
const statusSchema = z.enum(["active", "invited", "suspended"]);

export const adminRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const reports = await listReports(ctx.user!.id, { includeInactive: true });
    const activeReports = reports.filter((report) => !["archived", "cancelled"].includes(report.status));
    const latestReport = activeReports[0];
    const pulse = latestReport ? await getPulseDashboard(latestReport.id) : await getPulseDashboard();
    return {
      reports: {
        total: reports.length,
        active: activeReports.length,
        archived: reports.filter((report) => report.status === "archived").length,
        cancelled: reports.filter((report) => report.status === "cancelled").length,
      },
      pulseTotals: pulse.totals,
      latestReport,
    };
  }),

  users: permissionProcedure("user:manage").query(() => listUsers()),

  createUser: permissionProcedure("user:manage")
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      role: roleSchema,
      status: statusSchema.default("active"),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createInternalUser(input);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "user.created",
        resourceType: "user",
        resourceId: id ? String(id) : input.email,
        summaryAr: `تم إنشاء مستخدم داخلي: ${input.name}`,
        metadataJson: { email: input.email, role: input.role, status: input.status },
      });
      return { id };
    }),

  updateUser: permissionProcedure("user:manage")
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      role: roleSchema.optional(),
      status: statusSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      await updateInternalUser(id, patch);
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "user.updated",
        resourceType: "user",
        resourceId: String(id),
        summaryAr: "تم تحديث مستخدم أو صلاحياته.",
        metadataJson: patch,
      });
      return { success: true };
    }),

  settings: protectedProcedure.query(() => getSystemSettings()),

  updateSettings: permissionProcedure("settings:manage")
    .input(z.object({
      foundationName: z.string().min(2).optional(),
      displayNameAr: z.string().min(2).optional(),
      logoUrl: z.string().url().nullable().optional().or(z.literal("")),
      primaryColor: z.string().min(3).optional(),
      accentColor: z.string().min(3).optional(),
      reportDisclaimer: z.string().nullable().optional(),
      defaultSubmissionExpiryDays: z.number().min(1).max(365).optional(),
      externalSubmissionBaseUrl: z.string().url().nullable().optional().or(z.literal("")),
      localExportFallbackEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const settings = await updateSystemSettings({
        ...input,
        logoUrl: input.logoUrl || null,
        externalSubmissionBaseUrl: input.externalSubmissionBaseUrl || null,
      });
      await createAuditLog({
        actorUserId: ctx.user!.id,
        actorName: ctx.user!.name,
        actorRole: ctx.user!.role,
        action: "settings.updated",
        resourceType: "settings",
        resourceId: String(settings.id),
        summaryAr: "تم تحديث إعدادات المؤسسة والتقارير.",
        metadataJson: input,
      });
      return settings;
    }),

  auditLog: permissionProcedure("audit:view")
    .input(z.object({
      actor: z.string().optional(),
      action: z.string().optional(),
      resourceType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const rows = await listAuditLogs();
      return rows.filter((item) => {
        if (input?.actor && !(item.actorName ?? "").includes(input.actor)) return false;
        if (input?.action && !item.action.includes(input.action)) return false;
        if (input?.resourceType && item.resourceType !== input.resourceType) return false;
        return true;
      });
    }),
});
