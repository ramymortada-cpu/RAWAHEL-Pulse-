import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getUserByEmail, upsertUser } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createSessionToken, verifyPassword } from "./_core/session";
import { adminRouter } from "./routers/admin";
import { pulseRouter } from "./routers/pulse";
import { reportsRouter } from "./routers/reports";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const localAuthAllowed =
          process.env.LOCAL_AUTH_ENABLED === "1" || process.env.NODE_ENV !== "production";
        if (!localAuthAllowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Local login is not enabled" });
        }
        const user = await getUserByEmail(input.email);
        const passwordOk = await verifyPassword(input.password, user?.passwordHash);
        if (!user || !passwordOk || user.status !== "active") {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }
        await upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        const token = await createSessionToken(user.openId, { name: user.name ?? user.email ?? "" });
        ctx.res.cookie(COOKIE_NAME, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });
        return { success: true, user } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  reports: reportsRouter,
  pulse: pulseRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
