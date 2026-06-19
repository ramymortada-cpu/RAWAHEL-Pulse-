import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

type OAuthTokenResponse = {
  accessToken: string;
};

type OAuthUserInfo = {
  openId: string;
  name?: string | null;
  email?: string | null;
  platform?: string | null;
  loginMethod?: string | null;
  platforms?: unknown;
};

type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const EXCHANGE_TOKEN_PATH = "/webdev.v1.WebDevAuthPublicService/ExchangeToken";
const GET_USER_INFO_PATH = "/webdev.v1.WebDevAuthPublicService/GetUserInfo";
const GET_USER_INFO_WITH_JWT_PATH = "/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

function requireOAuthServerUrl() {
  if (!ENV.oAuthServerUrl) {
    throw new Error("OAUTH_SERVER_URL is not configured");
  }
  return ENV.oAuthServerUrl.replace(/\/$/, "");
}

function decodeState(state: string): string {
  return Buffer.from(state, "base64").toString("utf8");
}

function deriveLoginMethod(platforms: unknown, fallback: string | null | undefined): string | null {
  if (fallback && fallback.length > 0) return fallback;
  if (!Array.isArray(platforms) || platforms.length === 0) return null;
  const set = new Set<string>(platforms.filter((value): value is string => typeof value === "string"));
  if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
  if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
  if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
  if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE")) return "microsoft";
  if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
  const first = Array.from(set)[0];
  return first ? first.toLowerCase() : null;
}

async function postOAuth<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${requireOAuthServerUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`OAuth request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function getSessionSecret() {
  const secret = ENV.cookieSecret || "rawahel-pulse-local-development-secret";
  return new TextEncoder().encode(secret);
}

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) return new Map<string, string>();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

export async function exchangeCodeForToken(code: string, state: string): Promise<OAuthTokenResponse> {
  return postOAuth<OAuthTokenResponse>(EXCHANGE_TOKEN_PATH, {
    clientId: ENV.appId,
    grantType: "authorization_code",
    code,
    redirectUri: decodeState(state),
  });
}

export async function getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const data = await postOAuth<OAuthUserInfo>(GET_USER_INFO_PATH, { accessToken });
  const loginMethod = deriveLoginMethod(data.platforms, data.loginMethod ?? data.platform ?? null);
  return { ...data, platform: loginMethod, loginMethod };
}

export async function getUserInfoWithJwt(jwtToken: string): Promise<OAuthUserInfo> {
  const data = await postOAuth<OAuthUserInfo>(GET_USER_INFO_WITH_JWT_PATH, {
    jwtToken,
    projectId: ENV.appId,
  });
  const loginMethod = deriveLoginMethod(data.platforms, data.loginMethod ?? data.platform ?? null);
  return { ...data, platform: loginMethod, loginMethod };
}

export async function createSessionToken(
  openId: string,
  options: { expiresInMs?: number; name?: string } = {}
): Promise<string> {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({
    openId,
    appId: ENV.appId,
    name: options.name || "",
  } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

async function verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    const { openId, appId, name } = payload as Record<string, unknown>;
    if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
      return null;
    }
    return { openId, appId, name };
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<User> {
  const sessionCookie = parseCookies(req.headers.cookie).get(COOKIE_NAME);
  const session = await verifySession(sessionCookie);
  if (!session) throw ForbiddenError("Invalid session cookie");

  const signedInAt = new Date();
  let user = await db.getUserByOpenId(session.openId);

  if (!user && sessionCookie) {
    const userInfo = await getUserInfoWithJwt(sessionCookie);
    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: signedInAt,
    });
    user = await db.getUserByOpenId(userInfo.openId);
  }

  if (!user) throw ForbiddenError("User not found");

  await db.upsertUser({
    openId: user.openId,
    lastSignedIn: signedInAt,
  });

  return user;
}
