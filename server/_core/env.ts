export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  localAuthEnabled: process.env.LOCAL_AUTH_ENABLED === "1",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

export const REQUIRED_PRODUCTION_ENV = [
  "JWT_SECRET",
  "DATABASE_URL",
  "VITE_APP_ID",
] as const;

export type ProductionEnvValidation = {
  ok: boolean;
  missing: string[];
  invalid: string[];
  warnings: string[];
};

function hasValue(env: NodeJS.ProcessEnv, key: string) {
  return Boolean(env[key]?.trim());
}

function isValidUrl(value: string | undefined) {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateProductionEnv(
  env: NodeJS.ProcessEnv = process.env
): ProductionEnvValidation {
  if (env.NODE_ENV !== "production") {
    return { ok: true, missing: [], invalid: [], warnings: [] };
  }

  const missing: string[] = REQUIRED_PRODUCTION_ENV.filter((key) => !hasValue(env, key));
  const invalid: string[] = [];
  const warnings: string[] = [];
  const hasOAuth = hasValue(env, "OAUTH_SERVER_URL");
  const hasLocalAuth = env.LOCAL_AUTH_ENABLED === "1";

  if (!hasOAuth && !hasLocalAuth) {
    missing.push("OAUTH_SERVER_URL or LOCAL_AUTH_ENABLED=1");
  }

  if (hasValue(env, "JWT_SECRET") && env.JWT_SECRET!.length < 32) {
    invalid.push("JWT_SECRET must be at least 32 characters");
  }
  if (hasOAuth && !isValidUrl(env.OAUTH_SERVER_URL)) {
    invalid.push("OAUTH_SERVER_URL must be a valid URL");
  }
  if (hasLocalAuth && hasOAuth) {
    warnings.push("Both OAuth and local auth are enabled; OAuth login URL will be preferred by the frontend");
  }
  if (hasLocalAuth) {
    warnings.push("LOCAL_AUTH_ENABLED=1 is active; ensure the first super_admin uses a strong password hash and HTTPS cookies");
  }
  if (hasValue(env, "EXTERNAL_SUBMISSION_BASE_URL") && !isValidUrl(env.EXTERNAL_SUBMISSION_BASE_URL)) {
    invalid.push("EXTERNAL_SUBMISSION_BASE_URL must be a valid URL");
  }

  const hasForgeUrl = hasValue(env, "BUILT_IN_FORGE_API_URL");
  const hasForgeKey = hasValue(env, "BUILT_IN_FORGE_API_KEY");
  if (hasForgeUrl !== hasForgeKey) {
    invalid.push("BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY must be configured together");
  }
  if (hasForgeUrl && !isValidUrl(env.BUILT_IN_FORGE_API_URL)) {
    invalid.push("BUILT_IN_FORGE_API_URL must be a valid URL");
  }
  if (!hasValue(env, "EXTERNAL_SUBMISSION_BASE_URL")) {
    warnings.push("EXTERNAL_SUBMISSION_BASE_URL is recommended for operator-safe submission links");
  }
  if (!hasForgeUrl && !hasForgeKey) {
    warnings.push("Remote export storage is not configured; local PDF/PNG export fallback remains enabled");
  }

  return {
    ok: missing.length === 0 && invalid.length === 0,
    missing: [...missing],
    invalid,
    warnings,
  };
}

export function assertProductionEnv(env: NodeJS.ProcessEnv = process.env) {
  const result = validateProductionEnv(env);
  if (!result.ok) {
    const details = [
      result.missing.length ? `missing: ${result.missing.join(", ")}` : "",
      result.invalid.length ? `invalid: ${result.invalid.join("; ")}` : "",
    ].filter(Boolean).join(" | ");
    throw new Error(`Production environment is not ready (${details})`);
  }
  return result;
}
