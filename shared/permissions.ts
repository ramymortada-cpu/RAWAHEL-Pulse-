export const USER_ROLES = ["super_admin", "admin", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "invited", "suspended"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PERMISSIONS = [
  "report:create",
  "report:update",
  "report:archive",
  "report:cancel",
  "report:delete",
  "metric:update",
  "metric:update_approved",
  "submission:approve",
  "submission:request_revision",
  "entity:manage",
  "strategy:manage",
  "kpi:manage",
  "user:manage",
  "audit:view",
  "export:create",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  super_admin: new Set<Permission>(PERMISSIONS),
  admin: new Set([
    "report:create",
    "report:update",
    "report:archive",
    "report:cancel",
    "metric:update",
    "metric:update_approved",
    "submission:approve",
    "submission:request_revision",
    "entity:manage",
    "strategy:manage",
    "kpi:manage",
    "audit:view",
    "export:create",
  ] satisfies Permission[]),
  editor: new Set([
    "report:create",
    "report:update",
    "metric:update",
    "export:create",
  ] satisfies Permission[]),
  viewer: new Set<Permission>(),
};

export function normalizeRole(role: string | null | undefined): UserRole {
  if (role === "super_admin" || role === "admin" || role === "editor") return role;
  return "viewer";
}

export function can(
  user: { role?: string | null; status?: string | null } | null | undefined,
  permission: Permission
) {
  if (!user) return false;
  if (user.status && user.status !== "active") return false;
  return ROLE_PERMISSIONS[normalizeRole(user.role)].has(permission);
}

export function roleLabelAr(role: string | null | undefined) {
  switch (normalizeRole(role)) {
    case "super_admin":
      return "مدير عام";
    case "admin":
      return "مدير";
    case "editor":
      return "محرر";
    case "viewer":
      return "مشاهد";
  }
}
