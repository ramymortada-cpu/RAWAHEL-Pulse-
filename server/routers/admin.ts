import { z } from "zod";
import { permissionProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createInternalUser,
  getPulseDashboard,
  listAuditLogs,
  listReports,
  listUsers,
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

  auditLog: permissionProcedure("audit:view").query(() => listAuditLogs()),
});
