import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateRequest } from "./session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user && !process.env.OAUTH_SERVER_URL) {
    const timestamp = new Date();
    user = {
      id: 1,
      openId: "local-rawahel-admin",
      name: "مدير نبض رواحل",
      email: "admin@rawahel.local",
      loginMethod: "local",
      role: "admin",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSignedIn: timestamp,
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
