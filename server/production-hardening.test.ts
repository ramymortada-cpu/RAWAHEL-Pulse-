import { describe, expect, it } from "vitest";
import { assertProductionEnv, validateProductionEnv } from "./_core/env";
import { createSessionToken, hashPassword, verifyPassword } from "./_core/session";
import { appRouter } from "./routers";
import { upsertUser } from "./db";
import type { TrpcContext } from "./_core/context";

function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    JWT_SECRET: "0123456789abcdef0123456789abcdef",
    DATABASE_URL: "mysql://user:password@example.com:3306/rawahel",
    VITE_APP_ID: "rawahel-pulse",
    OAUTH_SERVER_URL: "https://auth.example.com",
    LOCAL_AUTH_ENABLED: "0",
    EXTERNAL_SUBMISSION_BASE_URL: "https://pulse.example.com",
    ...overrides,
  };
}

async function withEnv<T>(patch: NodeJS.ProcessEnv, fn: () => Promise<T>) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) previous[key] = process.env[key];
  try {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("production hardening", () => {
  it("fails production readiness when required auth or database env is missing", () => {
    const result = validateProductionEnv(productionEnv({
      JWT_SECRET: "",
      DATABASE_URL: "",
      OAUTH_SERVER_URL: "",
      LOCAL_AUTH_ENABLED: "0",
    }));

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining([
      "JWT_SECRET",
      "DATABASE_URL",
      "OAUTH_SERVER_URL or LOCAL_AUTH_ENABLED=1",
    ]));
  });

  it("rejects weak JWT secrets and half-configured remote storage", () => {
    const result = validateProductionEnv(productionEnv({
      JWT_SECRET: "too-short",
      BUILT_IN_FORGE_API_URL: "https://forge.example.com",
      BUILT_IN_FORGE_API_KEY: "",
    }));

    expect(result.ok).toBe(false);
    expect(result.invalid).toEqual(expect.arrayContaining([
      "JWT_SECRET must be at least 32 characters",
      "BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY must be configured together",
    ]));
  });

  it("accepts a complete production environment and keeps optional storage as a warning only", () => {
    const result = assertProductionEnv(productionEnv({
      BUILT_IN_FORGE_API_URL: "",
      BUILT_IN_FORGE_API_KEY: "",
    }));

    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
    expect(result.warnings).toContain("Remote export storage is not configured; local PDF/PNG export fallback remains enabled");
  });

  it("accepts local production login when OAuth is unavailable and local auth is explicit", () => {
    const result = assertProductionEnv(productionEnv({
      OAUTH_SERVER_URL: "",
      LOCAL_AUTH_ENABLED: "1",
      BUILT_IN_FORGE_API_URL: "",
      BUILT_IN_FORGE_API_KEY: "",
    }));

    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.warnings).toContain("LOCAL_AUTH_ENABLED=1 is active; ensure the first super_admin uses a strong password hash and HTTPS cookies");
  });

  it("does not sign production sessions with the local fallback secret", async () => {
    await withEnv({
      NODE_ENV: "production",
      JWT_SECRET: "",
      VITE_APP_ID: "rawahel-pulse",
    }, async () => {
      await expect(createSessionToken("prod-user", { name: "Production User" })).rejects.toThrow(/JWT_SECRET/);
    });
  });

  it("hashes local passwords and writes a session cookie on local login", async () => {
    const email = `local-login-${Date.now()}@example.com`;
    const password = "VeryStrongPassword123";
    const passwordHash = await hashPassword(password);
    expect(passwordHash).not.toContain(password);
    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
    await upsertUser({
      openId: `local:${email}`,
      name: "Local Super Admin",
      email,
      passwordHash,
      loginMethod: "local_password",
      role: "super_admin",
      status: "active",
      lastSignedIn: new Date(),
    });

    const cookies: Array<{ name: string; value: string }> = [];
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        cookie: (name: string, value: string) => {
          cookies.push({ name, value });
        },
      } as TrpcContext["res"],
    });

    await withEnv({ LOCAL_AUTH_ENABLED: "1", VITE_APP_ID: "rawahel-pulse" }, async () => {
      await expect(caller.auth.login({ email, password })).resolves.toMatchObject({ success: true });
    });
    expect(cookies[0]?.name).toBe("app_session_id");
    expect(cookies[0]?.value).toBeTruthy();
  });
});
