import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  entities,
  entityGoalLinks,
  entityTrackLinks,
  evidenceAssets,
  goalMetricLinks,
  InsertEntity,
  InsertEntityGoalLink,
  InsertEvidenceAsset,
  InsertGoalMetricLink,
  InsertMetricDefinition,
  InsertMetricValue,
  InsertReportExport,
  InsertSubmissionLink,
  InsertStrategicGoal,
  InsertStrategicTrack,
  InsertUser,
  InsertAuditLog,
  metricDefinitions,
  metricValues,
  reportExports,
  submissionLinks,
  strategicGoals,
  strategicTracks,
  users,
  reports,
  departmentData,
  departmentItems,
  sheetConfig,
  type InsertReport,
  type InsertDepartmentData,
  type InsertDepartmentItem,
  type InsertSheetConfig,
  type User,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  ENTITIES,
  METRIC_DEFINITIONS,
  GOAL_METRIC_LINKS,
  STRATEGIC_GOALS,
  STRATEGIC_TRACKS,
  calculateGoalProgress,
  aggregatePulseMetrics,
} from "@shared/masterData";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    const timestamp = now();
    const existing = localUsers.find((item) => item.openId === user.openId);
    const role = user.role ?? (user.openId === ENV.ownerOpenId ? "super_admin" : "viewer");
    if (existing) {
      Object.assign(existing, {
        name: user.name ?? existing.name,
        email: user.email ?? existing.email,
        passwordHash: user.passwordHash ?? existing.passwordHash,
        loginMethod: user.loginMethod ?? existing.loginMethod,
        role,
        status: user.status ?? existing.status ?? "active",
        lastSignedIn: user.lastSignedIn ?? existing.lastSignedIn,
        updatedAt: timestamp,
      });
      return;
    }
    localUsers.push({
      id: nextPulseId(),
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      passwordHash: user.passwordHash ?? null,
      loginMethod: user.loginMethod ?? null,
      role,
      status: user.status ?? "active",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastSignedIn: user.lastSignedIn ?? timestamp,
    });
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "passwordHash", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "super_admin";
      updateSet.role = "super_admin";
    }
    if (user.status !== undefined) {
      values.status = user.status;
      updateSet.status = user.status;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return localUsers.find((user) => user.openId === openId);
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [...localUsers].sort((a, b) => a.id - b.id);
  return db.select().from(users).orderBy(users.createdAt);
}

export async function createInternalUser(data: {
  name: string;
  email: string;
  role: "super_admin" | "admin" | "editor" | "viewer";
  status?: "active" | "invited" | "suspended";
}) {
  const openId = `manual:${data.email.toLowerCase()}`;
  await upsertUser({
    openId,
    name: data.name,
    email: data.email,
    loginMethod: "manual",
    role: data.role,
    status: data.status ?? "active",
    lastSignedIn: now(),
  });
  const user = await getUserByOpenId(openId);
  return user?.id;
}

export async function updateInternalUser(
  id: number,
  patch: Partial<Pick<User, "name" | "email" | "role" | "status">>
) {
  const db = await getDb();
  if (!db) {
    const user = localUsers.find((item) => item.id === id);
    if (user) Object.assign(user, patch, { updatedAt: now() });
    return;
  }
  await db.update(users).set(patch).where(eq(users.id, id));
}

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) {
    const row: AuditLogRow = {
      id: nextPulseId(),
      actorUserId: data.actorUserId ?? null,
      actorName: data.actorName ?? null,
      actorRole: data.actorRole ?? null,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId ?? null,
      summaryAr: data.summaryAr,
      metadataJson: data.metadataJson ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      createdAt: now(),
    };
    localAuditLogs.unshift(row);
    return row.id;
  }
  const result = await db.insert(auditLogs).values(data).$returningId();
  return result[0]?.id as number;
}

export async function listAuditLogs() {
  const db = await getDb();
  if (!db) return [...localAuditLogs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
}

/* ---------------------- Reports ---------------------- */

type ReportRow = typeof reports.$inferSelect;
type DepartmentDataRow = typeof departmentData.$inferSelect;
type DepartmentItemRow = typeof departmentItems.$inferSelect;
type AuditLogRow = typeof auditLogs.$inferSelect;

const localReports: ReportRow[] = [];
const localDepartmentData: DepartmentDataRow[] = [];
const localDepartmentItems: DepartmentItemRow[] = [];
const localUsers: User[] = [];
const localAuditLogs: AuditLogRow[] = [];
let localReportId = 1_000;

export async function listReports(ownerId: number, options: { includeInactive?: boolean } = {}) {
  const db = await getDb();
  if (!db) {
    return localReports
      .filter((report) => report.ownerId === ownerId)
      .filter((report) => options.includeInactive || !["archived", "cancelled"].includes(report.status))
      .sort((a, b) => b.year - a.year || b.month - a.month || b.createdAt.getTime() - a.createdAt.getTime());
  }
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.ownerId, ownerId))
    .orderBy(desc(reports.year), desc(reports.month), desc(reports.createdAt));
  return options.includeInactive ? rows : rows.filter((report) => !["archived", "cancelled"].includes(report.status));
}

export async function getReport(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) return localReports.find((report) => report.id === id && report.ownerId === ownerId);
  const rows = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.ownerId, ownerId)))
    .limit(1);
  return rows[0];
}

export async function findReportByPeriod(ownerId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) {
    return localReports.find(
      (report) => report.ownerId === ownerId && report.year === year && report.month === month
    );
  }
  const rows = await db
    .select()
    .from(reports)
    .where(
      and(eq(reports.ownerId, ownerId), eq(reports.year, year), eq(reports.month, month))
    )
    .limit(1);
  return rows[0];
}

export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) {
    const createdAt = now();
    const row: ReportRow = {
      id: localReportId++,
      ownerId: data.ownerId,
      title: data.title,
      year: data.year,
      month: data.month,
      periodType: data.periodType ?? "monthly",
      audience: data.audience ?? "internal",
      status: data.status ?? "draft",
      summary: data.summary ?? null,
      pdfKey: data.pdfKey ?? null,
      pdfUrl: data.pdfUrl ?? null,
      generatedAt: data.generatedAt ?? null,
      lockedAt: data.lockedAt ?? null,
      lockedByUserId: data.lockedByUserId ?? null,
      archivedAt: data.archivedAt ?? null,
      archivedByUserId: data.archivedByUserId ?? null,
      cancelledAt: data.cancelledAt ?? null,
      cancelledByUserId: data.cancelledByUserId ?? null,
      cancelReason: data.cancelReason ?? null,
      createdAt,
      updatedAt: createdAt,
    };
    localReports.push(row);
    return row.id;
  }
  const result = await db.insert(reports).values(data).$returningId();
  return result[0]?.id as number;
}

export async function updateReport(
  ownerId: number,
  id: number,
  patch: Partial<InsertReport>
) {
  const db = await getDb();
  if (!db) {
    const report = localReports.find((item) => item.id === id && item.ownerId === ownerId);
    if (report) Object.assign(report, patch, { updatedAt: now() });
    return;
  }
  await db
    .update(reports)
    .set(patch)
    .where(and(eq(reports.id, id), eq(reports.ownerId, ownerId)));
}

export async function archiveReport(ownerId: number, id: number, actorUserId: number) {
  const archivedAt = now();
  await updateReport(ownerId, id, {
    status: "archived",
    archivedAt,
    archivedByUserId: actorUserId,
  });
}

export async function cancelReport(ownerId: number, id: number, actorUserId: number, reason: string) {
  const cancelledAt = now();
  await updateReport(ownerId, id, {
    status: "cancelled",
    cancelledAt,
    cancelledByUserId: actorUserId,
    cancelReason: reason,
  });
}

export async function lockReport(ownerId: number, id: number, actorUserId: number) {
  const lockedAt = now();
  await updateReport(ownerId, id, {
    status: "locked",
    lockedAt,
    lockedByUserId: actorUserId,
  });
}

export async function deleteReport(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) {
    const reportIndex = localReports.findIndex((report) => report.id === id && report.ownerId === ownerId);
    if (reportIndex >= 0) localReports.splice(reportIndex, 1);
    for (let i = localDepartmentItems.length - 1; i >= 0; i--) {
      if (localDepartmentItems[i].reportId === id) localDepartmentItems.splice(i, 1);
    }
    for (let i = localDepartmentData.length - 1; i >= 0; i--) {
      if (localDepartmentData[i].reportId === id) localDepartmentData.splice(i, 1);
    }
    return;
  }
  await db.delete(departmentItems).where(eq(departmentItems.reportId, id));
  await db.delete(departmentData).where(eq(departmentData.reportId, id));
  await db.delete(reports).where(and(eq(reports.id, id), eq(reports.ownerId, ownerId)));
}

async function getReportByIdForSubmission(id: number) {
  const db = await getDb();
  if (!db) return localReports.find((report) => report.id === id);
  const rows = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return rows[0];
}

/* ---------------------- Department items (named sub-items) ---------------------- */

export async function getItemsByReport(reportId: number) {
  const db = await getDb();
  if (!db) {
    return localDepartmentItems
      .filter((item) => item.reportId === reportId)
      .sort((a, b) => a.departmentKey.localeCompare(b.departmentKey) || a.sortOrder - b.sortOrder);
  }
  return db
    .select()
    .from(departmentItems)
    .where(eq(departmentItems.reportId, reportId))
    .orderBy(departmentItems.departmentKey, departmentItems.sortOrder);
}

export async function upsertItem(data: InsertDepartmentItem) {
  const db = await getDb();
  if (!db) {
    const existing = localDepartmentItems.find(
      (item) =>
        item.reportId === data.reportId &&
        item.departmentKey === data.departmentKey &&
        item.itemKey === data.itemKey
    );
    if (existing) {
      Object.assign(existing, {
        itemNameAr: data.itemNameAr,
        itemType: data.itemType,
        metrics: data.metrics ?? null,
        notes: data.notes ?? null,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: now(),
      });
      return existing.id;
    }
    const createdAt = now();
    const row: DepartmentItemRow = {
      id: nextPulseId(),
      reportId: data.reportId,
      departmentKey: data.departmentKey,
      itemKey: data.itemKey,
      itemNameAr: data.itemNameAr,
      itemType: data.itemType,
      metrics: data.metrics ?? null,
      notes: data.notes ?? null,
      sortOrder: data.sortOrder ?? 0,
      createdAt,
      updatedAt: createdAt,
    };
    localDepartmentItems.push(row);
    return row.id;
  }
  const existing = await db
    .select()
    .from(departmentItems)
    .where(
      and(
        eq(departmentItems.reportId, data.reportId),
        eq(departmentItems.departmentKey, data.departmentKey),
        eq(departmentItems.itemKey, data.itemKey)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(departmentItems)
      .set({
        itemNameAr: data.itemNameAr,
        itemType: data.itemType,
        metrics: data.metrics,
        notes: data.notes,
        sortOrder: data.sortOrder,
      })
      .where(eq(departmentItems.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(departmentItems).values(data).$returningId();
  return result[0]?.id as number;
}

/** Persist a new sort order for a list of items within a department. */
export async function reorderItems(
  reportId: number,
  departmentKey: string,
  orderedItemKeys: string[]
) {
  const db = await getDb();
  if (!db) {
    orderedItemKeys.forEach((itemKey, index) => {
      const item = localDepartmentItems.find(
        (row) => row.reportId === reportId && row.departmentKey === departmentKey && row.itemKey === itemKey
      );
      if (item) Object.assign(item, { sortOrder: index + 1, updatedAt: now() });
    });
    return;
  }
  for (let i = 0; i < orderedItemKeys.length; i++) {
    await db
      .update(departmentItems)
      .set({ sortOrder: i + 1 })
      .where(
        and(
          eq(departmentItems.reportId, reportId),
          eq(departmentItems.departmentKey, departmentKey),
          eq(departmentItems.itemKey, orderedItemKeys[i])
        )
      );
  }
}

export async function deleteItem(reportId: number, departmentKey: string, itemKey: string) {
  const db = await getDb();
  if (!db) {
    const index = localDepartmentItems.findIndex(
      (item) => item.reportId === reportId && item.departmentKey === departmentKey && item.itemKey === itemKey
    );
    if (index >= 0) localDepartmentItems.splice(index, 1);
    return;
  }
  await db
    .delete(departmentItems)
    .where(
      and(
        eq(departmentItems.reportId, reportId),
        eq(departmentItems.departmentKey, departmentKey),
        eq(departmentItems.itemKey, itemKey)
      )
    );
}

/* ---------------------- Department data ---------------------- */

export async function getDepartmentData(reportId: number) {
  const db = await getDb();
  if (!db) return localDepartmentData.filter((row) => row.reportId === reportId);
  return db.select().from(departmentData).where(eq(departmentData.reportId, reportId));
}

export async function upsertDepartmentData(data: InsertDepartmentData) {
  const db = await getDb();
  if (!db) {
    const existing = localDepartmentData.find(
      (row) => row.reportId === data.reportId && row.departmentKey === data.departmentKey
    );
    if (existing) {
      Object.assign(existing, {
        metrics: data.metrics ?? null,
        achievements: data.achievements ?? null,
        notes: data.notes ?? null,
        updatedAt: now(),
      });
      return existing.id;
    }
    const createdAt = now();
    const row: DepartmentDataRow = {
      id: nextPulseId(),
      reportId: data.reportId,
      departmentKey: data.departmentKey,
      metrics: data.metrics ?? null,
      achievements: data.achievements ?? null,
      notes: data.notes ?? null,
      createdAt,
      updatedAt: createdAt,
    };
    localDepartmentData.push(row);
    return row.id;
  }
  const existing = await db
    .select()
    .from(departmentData)
    .where(
      and(
        eq(departmentData.reportId, data.reportId),
        eq(departmentData.departmentKey, data.departmentKey)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(departmentData)
      .set({
        metrics: data.metrics,
        achievements: data.achievements,
        notes: data.notes,
      })
      .where(eq(departmentData.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(departmentData).values(data).$returningId();
  return result[0]?.id as number;
}

/* ---------------------- Sheet config ---------------------- */

export async function getSheetConfig(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(sheetConfig)
    .where(eq(sheetConfig.ownerId, ownerId))
    .limit(1);
  return rows[0];
}

export async function upsertSheetConfig(data: InsertSheetConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSheetConfig(data.ownerId);
  if (existing) {
    const patch: Record<string, unknown> = {
      sheetUrl: data.sheetUrl,
      sheetId: data.sheetId,
      gid: data.gid,
      enabled: data.enabled,
      lastSyncedAt: data.lastSyncedAt,
    };
    if (data.autoSync !== undefined) patch.autoSync = data.autoSync;
    if (data.scheduleCronTaskUid !== undefined)
      patch.scheduleCronTaskUid = data.scheduleCronTaskUid;
    await db.update(sheetConfig).set(patch).where(eq(sheetConfig.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(sheetConfig).values(data).$returningId();
  return result[0]?.id as number;
}

export async function setSheetAutoSync(
  ownerId: number,
  autoSync: boolean,
  taskUid: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(sheetConfig)
    .set({ autoSync, scheduleCronTaskUid: taskUid })
    .where(eq(sheetConfig.ownerId, ownerId));
}

/** Look up sheet config by the Heartbeat cron task uid (used by the scheduled handler). */
export async function getSheetConfigByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(sheetConfig)
    .where(eq(sheetConfig.scheduleCronTaskUid, taskUid))
    .limit(1);
  return rows[0];
}

/* ---------------------- RAWAHEL Pulse master data ---------------------- */

type PulseCache = {
  tracks: Array<typeof strategicTracks.$inferSelect>;
  goals: Array<typeof strategicGoals.$inferSelect>;
  entities: Array<typeof entities.$inferSelect>;
  entityTrackLinks: Array<typeof entityTrackLinks.$inferSelect>;
  entityGoalLinks: Array<typeof entityGoalLinks.$inferSelect>;
  metricDefinitions: Array<typeof metricDefinitions.$inferSelect>;
  goalMetricLinks: Array<typeof goalMetricLinks.$inferSelect>;
  metricValues: Array<typeof metricValues.$inferSelect>;
  evidenceAssets: Array<typeof evidenceAssets.$inferSelect>;
  reportExports: Array<typeof reportExports.$inferSelect>;
  submissionLinks: Array<typeof submissionLinks.$inferSelect>;
};

let pulseCache: PulseCache | null = null;
let pulseId = 10_000;

function now() {
  return new Date();
}

function nextPulseId() {
  pulseId += 1;
  return pulseId;
}

function getPulseCache(): PulseCache {
  if (pulseCache) return pulseCache;
  const createdAt = now();
  const tracks = STRATEGIC_TRACKS.map((track, index) => ({
    id: index + 1,
    key: track.key,
    nameAr: track.nameAr,
    descriptionAr: track.descriptionAr,
    color: track.color,
    icon: track.icon,
    sortOrder: track.sortOrder,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  }));
  const goals = STRATEGIC_GOALS.map((goal, index) => ({
    id: index + 1,
    key: goal.key,
    trackId: tracks.find((track) => track.key === goal.trackKey)?.id ?? null,
    nameAr: goal.nameAr,
    descriptionAr: goal.descriptionAr,
    targetValue: goal.targetValue,
    targetUnit: goal.targetUnit,
    periodType: goal.periodType,
    startDate: null,
    endDate: null,
    sortOrder: goal.sortOrder,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  }));
  const entitiesSeed = ENTITIES.map((entity, index) => ({
    id: index + 1,
    key: entity.key,
    nameAr: entity.nameAr,
    type: entity.type,
    descriptionAr: entity.descriptionAr,
    ownerName: null,
    status: "active" as const,
    startDate: null,
    sortOrder: entity.sortOrder,
    color: entity.color,
    icon: entity.icon,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  }));
  const entityTrackLinksSeed = ENTITIES.flatMap((entity) => {
    const entityId = entitiesSeed.find((item) => item.key === entity.key)?.id;
    return (entity.trackKeys ?? []).flatMap((trackKey) => {
      const trackId = tracks.find((track) => track.key === trackKey)?.id;
      return entityId && trackId
        ? [{ id: nextPulseId(), entityId, trackId }]
        : [];
    });
  });
  const entityGoalLinksSeed = ENTITIES.flatMap((entity) => {
    const entityId = entitiesSeed.find((item) => item.key === entity.key)?.id;
    return (entity.goalKeys ?? []).flatMap((goalKey) => {
      const goalId = goals.find((goal) => goal.key === goalKey)?.id;
      return entityId && goalId
        ? [{ id: nextPulseId(), entityId, goalId, role: "contributor" as const, weight: 1 }]
        : [];
    });
  });
  const metricDefinitionsSeed = METRIC_DEFINITIONS.map((metricDef, index) => ({
    id: index + 1,
    key: metricDef.key,
    entityId: null,
    appliesToType: metricDef.appliesToType ?? null,
    nameAr: metricDef.nameAr,
    descriptionAr: metricDef.descriptionAr,
    unit: metricDef.unit,
    aggregation: metricDef.aggregation,
    direction: metricDef.direction,
    aggregationScope: metricDef.aggregationScope,
    isCore: metricDef.isCore,
    isDonorFacing: metricDef.isDonorFacing,
    sortOrder: metricDef.sortOrder,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  }));
  const goalMetricLinksSeed = GOAL_METRIC_LINKS.flatMap((link) => {
    const goalId = goals.find((goal) => goal.key === link.goalKey)?.id;
    const metricDefinitionId = metricDefinitionsSeed.find((metric) => metric.key === link.metricKey)?.id;
    const entityId = link.entityKey ? entitiesSeed.find((entity) => entity.key === link.entityKey)?.id ?? null : null;
    return goalId && metricDefinitionId
      ? [{
          id: nextPulseId(),
          goalId,
          metricDefinitionId,
          entityId,
          weight: link.weight ?? null,
          contributionType: link.contributionType ?? "sum" as const,
          createdAt,
          updatedAt: createdAt,
        }]
      : [];
  });
  pulseCache = {
    tracks,
    goals,
    entities: entitiesSeed,
    entityTrackLinks: entityTrackLinksSeed,
    entityGoalLinks: entityGoalLinksSeed,
    metricDefinitions: metricDefinitionsSeed,
    goalMetricLinks: goalMetricLinksSeed,
    metricValues: [],
    evidenceAssets: [],
    reportExports: [],
    submissionLinks: [],
  };
  return pulseCache;
}

export async function seedPulseMasterData(): Promise<PulseCache> {
  const db = await getDb();
  if (!db) return getPulseCache();

  for (const track of STRATEGIC_TRACKS) {
    await db.insert(strategicTracks).values({
      key: track.key,
      nameAr: track.nameAr,
      descriptionAr: track.descriptionAr,
      color: track.color,
      icon: track.icon,
      sortOrder: track.sortOrder,
      isActive: true,
    }).onDuplicateKeyUpdate({
      set: {
        nameAr: track.nameAr,
        descriptionAr: track.descriptionAr,
        color: track.color,
        icon: track.icon,
        sortOrder: track.sortOrder,
        isActive: true,
      },
    });
  }

  const tracks = await db.select().from(strategicTracks);
  const trackByKey = new Map(tracks.map((track) => [track.key, track]));
  for (const goal of STRATEGIC_GOALS) {
    await db.insert(strategicGoals).values({
      key: goal.key,
      trackId: goal.trackKey ? trackByKey.get(goal.trackKey)?.id ?? null : null,
      nameAr: goal.nameAr,
      descriptionAr: goal.descriptionAr,
      targetValue: goal.targetValue,
      targetUnit: goal.targetUnit,
      periodType: goal.periodType,
      sortOrder: goal.sortOrder,
      isActive: true,
    }).onDuplicateKeyUpdate({
      set: {
        nameAr: goal.nameAr,
        descriptionAr: goal.descriptionAr,
        targetValue: goal.targetValue,
        targetUnit: goal.targetUnit,
        periodType: goal.periodType,
        sortOrder: goal.sortOrder,
        isActive: true,
      },
    });
  }

  for (const entity of ENTITIES) {
    await db.insert(entities).values({
      key: entity.key,
      nameAr: entity.nameAr,
      type: entity.type,
      descriptionAr: entity.descriptionAr,
      status: "active",
      sortOrder: entity.sortOrder,
      color: entity.color,
      icon: entity.icon,
      isActive: true,
    }).onDuplicateKeyUpdate({
      set: {
        nameAr: entity.nameAr,
        type: entity.type,
        descriptionAr: entity.descriptionAr,
        sortOrder: entity.sortOrder,
        color: entity.color,
        icon: entity.icon,
        isActive: true,
      },
    });
  }

  const [dbEntities, dbGoals] = await Promise.all([
    db.select().from(entities),
    db.select().from(strategicGoals),
  ]);
  const entityByKey = new Map(dbEntities.map((entity) => [entity.key, entity]));
  const goalByKey = new Map(dbGoals.map((goal) => [goal.key, goal]));

  for (const entity of ENTITIES) {
    const entityRow = entityByKey.get(entity.key);
    if (!entityRow) continue;
    for (const trackKey of entity.trackKeys ?? []) {
      const track = trackByKey.get(trackKey);
      if (!track) continue;
      await db.insert(entityTrackLinks).values({
        entityId: entityRow.id,
        trackId: track.id,
      });
    }
    for (const goalKey of entity.goalKeys ?? []) {
      const goal = goalByKey.get(goalKey);
      if (!goal) continue;
      await db.insert(entityGoalLinks).values({
        entityId: entityRow.id,
        goalId: goal.id,
        role: "contributor",
        weight: 1,
      });
    }
  }

  for (const metricDef of METRIC_DEFINITIONS) {
    await db.insert(metricDefinitions).values({
      key: metricDef.key,
      appliesToType: metricDef.appliesToType ?? null,
      nameAr: metricDef.nameAr,
      descriptionAr: metricDef.descriptionAr,
      unit: metricDef.unit,
      aggregation: metricDef.aggregation,
      direction: metricDef.direction,
      aggregationScope: metricDef.aggregationScope,
      isCore: metricDef.isCore,
      isDonorFacing: metricDef.isDonorFacing,
      sortOrder: metricDef.sortOrder,
      isActive: true,
    });
  }

  const dbMetricDefinitions = await db.select().from(metricDefinitions);
  const metricByKey = new Map(dbMetricDefinitions.map((metric) => [metric.key, metric]));
  for (const link of GOAL_METRIC_LINKS) {
    const goal = goalByKey.get(link.goalKey);
    const metric = metricByKey.get(link.metricKey);
    const entity = link.entityKey ? entityByKey.get(link.entityKey) : null;
    if (!goal || !metric) continue;
    await db.insert(goalMetricLinks).values({
      goalId: goal.id,
      metricDefinitionId: metric.id,
      entityId: entity?.id ?? null,
      weight: link.weight ?? null,
      contributionType: link.contributionType ?? "sum",
    });
  }

  return getPulseMasterData();
}

export async function getPulseMasterData(): Promise<PulseCache> {
  const db = await getDb();
  if (!db) return getPulseCache();
  const [tracks, goals, entitiesRows, trackLinks, goalLinks, metricDefs, goalMetricLinkRows] =
    await Promise.all([
      db.select().from(strategicTracks).orderBy(strategicTracks.sortOrder),
      db.select().from(strategicGoals).orderBy(strategicGoals.sortOrder),
      db.select().from(entities).orderBy(entities.sortOrder),
      db.select().from(entityTrackLinks),
      db.select().from(entityGoalLinks),
      db.select().from(metricDefinitions).orderBy(metricDefinitions.sortOrder),
      db.select().from(goalMetricLinks),
    ]);
  if (tracks.length === 0 || goals.length === 0 || entitiesRows.length === 0) {
    return seedPulseMasterData();
  }
  return {
    tracks,
    goals,
    entities: entitiesRows,
    entityTrackLinks: trackLinks,
    entityGoalLinks: goalLinks,
    metricDefinitions: metricDefs,
    goalMetricLinks: goalMetricLinkRows,
    metricValues: [] as Array<typeof metricValues.$inferSelect>,
    evidenceAssets: [] as Array<typeof evidenceAssets.$inferSelect>,
    reportExports: [] as Array<typeof reportExports.$inferSelect>,
    submissionLinks: [] as Array<typeof submissionLinks.$inferSelect>,
  };
}

export async function createPulseStrategicTrack(data: InsertStrategicTrack) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const row = {
      id: nextPulseId(),
      key: data.key,
      nameAr: data.nameAr,
      descriptionAr: data.descriptionAr ?? null,
      color: data.color ?? "#1b2a5e",
      icon: data.icon ?? "Circle",
      sortOrder: data.sortOrder ?? cache.tracks.length + 1,
      isActive: data.isActive ?? true,
      createdAt: now(),
      updatedAt: now(),
    };
    cache.tracks.push(row);
    return row.id;
  }
  const result = await db.insert(strategicTracks).values(data).$returningId();
  return result[0]?.id as number;
}

export async function updatePulseStrategicTrack(id: number, patch: Partial<InsertStrategicTrack>) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const track = cache.tracks.find((item) => item.id === id);
    if (track) Object.assign(track, patch, { updatedAt: now() });
    return;
  }
  await db.update(strategicTracks).set(patch).where(eq(strategicTracks.id, id));
}

export async function createPulseStrategicGoal(data: InsertStrategicGoal) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const row = {
      id: nextPulseId(),
      key: data.key,
      trackId: data.trackId ?? null,
      nameAr: data.nameAr,
      descriptionAr: data.descriptionAr ?? null,
      targetValue: data.targetValue ?? 0,
      targetUnit: data.targetUnit ?? "عدد",
      periodType: data.periodType ?? "yearly",
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      sortOrder: data.sortOrder ?? cache.goals.length + 1,
      isActive: data.isActive ?? true,
      createdAt: now(),
      updatedAt: now(),
    };
    cache.goals.push(row);
    return row.id;
  }
  const result = await db.insert(strategicGoals).values(data).$returningId();
  return result[0]?.id as number;
}

export async function updatePulseStrategicGoal(id: number, patch: Partial<InsertStrategicGoal>) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const goal = cache.goals.find((item) => item.id === id);
    if (goal) Object.assign(goal, patch, { updatedAt: now() });
    return;
  }
  await db.update(strategicGoals).set(patch).where(eq(strategicGoals.id, id));
}

export async function createPulseEntity(data: InsertEntity) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const entity = {
      id: nextPulseId(),
      key: data.key,
      nameAr: data.nameAr,
      type: data.type,
      descriptionAr: data.descriptionAr ?? null,
      ownerName: data.ownerName ?? null,
      status: data.status ?? "active",
      startDate: data.startDate ?? null,
      sortOrder: data.sortOrder ?? cache.entities.length + 1,
      color: data.color ?? "#1b2a5e",
      icon: data.icon ?? "Building2",
      isActive: data.isActive ?? true,
      createdAt: now(),
      updatedAt: now(),
    };
    cache.entities.push(entity);
    return entity.id;
  }
  const result = await db.insert(entities).values(data).$returningId();
  return result[0]?.id as number;
}

export async function updatePulseEntity(id: number, patch: Partial<InsertEntity>) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const entity = cache.entities.find((item: typeof cache.entities[number]) => item.id === id);
    if (entity) Object.assign(entity, patch, { updatedAt: now() });
    return;
  }
  await db.update(entities).set(patch).where(eq(entities.id, id));
}

export async function archivePulseEntity(id: number) {
  return updatePulseEntity(id, { status: "archived", isActive: false });
}

export async function linkPulseEntityToGoals(entityId: number, goalIds: number[]) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    cache.entityGoalLinks = cache.entityGoalLinks.filter((link) => link.entityId !== entityId);
    for (const goalId of goalIds) {
      cache.entityGoalLinks.push({
        id: nextPulseId(),
        entityId,
        goalId,
        role: "contributor",
        weight: 1,
      });
    }
    return;
  }
  await db.delete(entityGoalLinks).where(eq(entityGoalLinks.entityId, entityId));
  for (const goalId of goalIds) {
    await db.insert(entityGoalLinks).values({ entityId, goalId, role: "contributor", weight: 1 });
  }
}

export async function linkPulseEntityToTracks(entityId: number, trackIds: number[]) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    cache.entityTrackLinks = cache.entityTrackLinks.filter((link) => link.entityId !== entityId);
    for (const trackId of trackIds) {
      cache.entityTrackLinks.push({ id: nextPulseId(), entityId, trackId });
    }
    return;
  }
  await db.delete(entityTrackLinks).where(eq(entityTrackLinks.entityId, entityId));
  for (const trackId of trackIds) {
    await db.insert(entityTrackLinks).values({ entityId, trackId });
  }
}

export async function createPulseMetricDefinition(data: InsertMetricDefinition) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const row = {
      id: nextPulseId(),
      key: data.key,
      entityId: data.entityId ?? null,
      appliesToType: data.appliesToType ?? null,
      nameAr: data.nameAr,
      descriptionAr: data.descriptionAr ?? null,
      unit: data.unit ?? "count",
      aggregation: data.aggregation ?? "sum",
      direction: data.direction ?? "higher_is_better",
      aggregationScope: data.aggregationScope ?? "additive",
      isCore: data.isCore ?? false,
      isDonorFacing: data.isDonorFacing ?? true,
      sortOrder: data.sortOrder ?? cache.metricDefinitions.length + 1,
      isActive: data.isActive ?? true,
      createdAt: now(),
      updatedAt: now(),
    };
    cache.metricDefinitions.push(row);
    return row.id;
  }
  const result = await db.insert(metricDefinitions).values(data).$returningId();
  return result[0]?.id as number;
}

export async function linkPulseGoalToMetrics(goalId: number, links: Array<Omit<InsertGoalMetricLink, "goalId">>) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    cache.goalMetricLinks = cache.goalMetricLinks.filter((link) => link.goalId !== goalId);
    for (const link of links) {
      cache.goalMetricLinks.push({
        id: nextPulseId(),
        goalId,
        metricDefinitionId: link.metricDefinitionId,
        entityId: link.entityId ?? null,
        weight: link.weight ?? null,
        contributionType: link.contributionType ?? "sum",
        createdAt: now(),
        updatedAt: now(),
      });
    }
    return;
  }
  await db.delete(goalMetricLinks).where(eq(goalMetricLinks.goalId, goalId));
  for (const link of links) {
    await db.insert(goalMetricLinks).values({
      goalId,
      metricDefinitionId: link.metricDefinitionId,
      entityId: link.entityId ?? null,
      weight: link.weight ?? null,
      contributionType: link.contributionType ?? "sum",
    });
  }
}

export async function getMetricsForEntity(entityId: number) {
  const master = await getPulseMasterData();
  const entity = master.entities.find((item) => item.id === entityId);
  if (!entity) return [];
  return master.metricDefinitions.filter(
    (metricDef: typeof master.metricDefinitions[number]) =>
      metricDef.isActive &&
      (metricDef.entityId === entityId ||
        (!metricDef.entityId &&
          (!metricDef.appliesToType || metricDef.appliesToType === entity.type)))
  );
}

export async function upsertPulseMetricValue(data: InsertMetricValue) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const existing = cache.metricValues.find(
      (value) =>
        value.reportId === data.reportId &&
        value.entityId === data.entityId &&
        value.metricDefinitionId === data.metricDefinitionId &&
        (value.submissionLinkId ?? null) === (data.submissionLinkId ?? null)
    );
    if (existing) {
      Object.assign(existing, data, { updatedAt: now() });
      return existing.id;
    }
    const row = {
      id: nextPulseId(),
      reportId: data.reportId,
      entityId: data.entityId,
      metricDefinitionId: data.metricDefinitionId,
      valueNumber: data.valueNumber ?? null,
      valueText: data.valueText ?? null,
      notes: data.notes ?? null,
      source: data.source ?? null,
      submissionLinkId: data.submissionLinkId ?? null,
      submittedByName: data.submittedByName ?? null,
      submissionStatus: data.submissionStatus ?? "approved" as const,
      reviewedByUserId: data.reviewedByUserId ?? null,
      reviewedAt: data.reviewedAt ?? null,
      approvedAt: data.approvedAt ?? (data.submissionStatus === "approved" || data.submissionStatus == null ? now() : null),
      approvedByUserId: data.approvedByUserId ?? null,
      updatedByUserId: data.updatedByUserId ?? null,
      lockedAt: data.lockedAt ?? null,
      changeReason: data.changeReason ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    cache.metricValues.push(row);
    return row.id;
  }
  const existing = await db
    .select()
    .from(metricValues)
    .where(
      and(
        eq(metricValues.reportId, data.reportId),
        eq(metricValues.entityId, data.entityId),
        eq(metricValues.metricDefinitionId, data.metricDefinitionId),
        data.submissionLinkId == null
          ? isNull(metricValues.submissionLinkId)
          : eq(metricValues.submissionLinkId, data.submissionLinkId)
      )
    )
    .limit(1);
  if (existing[0]) {
    await db.update(metricValues).set(data).where(eq(metricValues.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(metricValues).values(data).$returningId();
  return result[0]?.id as number;
}

export async function getPulseReportValues(reportId: number) {
  const db = await getDb();
  if (!db) return getPulseCache().metricValues.filter((value) => value.reportId === reportId);
  return db.select().from(metricValues).where(eq(metricValues.reportId, reportId));
}

export async function updatePulseMetricValueWithReason(data: {
  id: number;
  actorUserId: number;
  valueNumber?: number | null;
  valueText?: string | null;
  notes?: string | null;
  changeReason: string;
}) {
  if (!data.changeReason.trim()) {
    throw new Error("change_reason_required");
  }
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const value = cache.metricValues.find((item) => item.id === data.id);
    if (!value) return undefined;
    if (value.submissionStatus === "approved" && !data.changeReason.trim()) {
      throw new Error("change_reason_required");
    }
    const previous = { valueNumber: value.valueNumber, valueText: value.valueText, notes: value.notes };
    Object.assign(value, {
      valueNumber: data.valueNumber ?? null,
      valueText: data.valueText ?? null,
      notes: data.notes ?? null,
      updatedByUserId: data.actorUserId,
      changeReason: data.changeReason,
      updatedAt: now(),
    });
    return { previous, current: { valueNumber: value.valueNumber, valueText: value.valueText, notes: value.notes }, value };
  }
  const rows = await db.select().from(metricValues).where(eq(metricValues.id, data.id)).limit(1);
  const value = rows[0];
  if (!value) return undefined;
  const previous = { valueNumber: value.valueNumber, valueText: value.valueText, notes: value.notes };
  await db.update(metricValues).set({
    valueNumber: data.valueNumber ?? null,
    valueText: data.valueText ?? null,
    notes: data.notes ?? null,
    updatedByUserId: data.actorUserId,
    changeReason: data.changeReason,
  }).where(eq(metricValues.id, data.id));
  return {
    previous,
    current: { valueNumber: data.valueNumber ?? null, valueText: data.valueText ?? null, notes: data.notes ?? null },
    value,
  };
}

export async function archivePulseMetricValue(id: number, actorUserId: number, changeReason: string) {
  if (!changeReason.trim()) throw new Error("change_reason_required");
  const db = await getDb();
  if (!db) {
    const value = getPulseCache().metricValues.find((item) => item.id === id);
    if (value) Object.assign(value, { submissionStatus: "archived" as const, updatedByUserId: actorUserId, changeReason, updatedAt: now() });
    return value;
  }
  await db.update(metricValues).set({ submissionStatus: "archived", updatedByUserId: actorUserId, changeReason }).where(eq(metricValues.id, id));
}

export async function createPulseEvidence(data: InsertEvidenceAsset) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const row = {
      id: nextPulseId(),
      reportId: data.reportId,
      entityId: data.entityId ?? null,
      goalId: data.goalId ?? null,
      titleAr: data.titleAr,
      descriptionAr: data.descriptionAr ?? null,
      type: data.type ?? "link",
      url: data.url,
      fileKey: data.fileKey ?? null,
      isDonorFacing: data.isDonorFacing ?? true,
      submissionLinkId: data.submissionLinkId ?? null,
      submissionStatus: data.submissionStatus ?? "approved" as const,
      sortOrder: data.sortOrder ?? cache.evidenceAssets.length + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    cache.evidenceAssets.push(row);
    return row.id;
  }
  const result = await db.insert(evidenceAssets).values(data).$returningId();
  return result[0]?.id as number;
}

export async function getPulseEvidence(reportId?: number) {
  const db = await getDb();
  if (!db) {
    const rows = getPulseCache().evidenceAssets;
    return reportId ? rows.filter((row) => row.reportId === reportId) : rows;
  }
  return reportId
    ? db.select().from(evidenceAssets).where(eq(evidenceAssets.reportId, reportId))
    : db.select().from(evidenceAssets);
}

function generateSubmissionToken() {
  return randomBytes(32).toString("base64url");
}

function hashSubmissionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function defaultSubmissionExpiry() {
  const expiresAt = now();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt;
}

export async function createPulseSubmissionLink(data: {
  reportId: number;
  entityId: number;
  managerName: string;
  managerEmail?: string | null;
  managerPhone?: string | null;
  createdByUserId?: number | null;
  expiresAt?: Date | null;
}) {
  const rawToken = generateSubmissionToken();
  const tokenHash = hashSubmissionToken(rawToken);
  const db = await getDb();
  const rowData: InsertSubmissionLink = {
    tokenHash,
    reportId: data.reportId,
    entityId: data.entityId,
    managerName: data.managerName,
    managerEmail: data.managerEmail ?? null,
    managerPhone: data.managerPhone ?? null,
    status: "created",
    expiresAt: data.expiresAt ?? defaultSubmissionExpiry(),
    createdByUserId: data.createdByUserId ?? null,
  };
  if (!db) {
    const createdAt = now();
    const row = {
      id: nextPulseId(),
      ...rowData,
      status: "created" as const,
      managerEmail: rowData.managerEmail ?? null,
      managerPhone: rowData.managerPhone ?? null,
      createdByUserId: rowData.createdByUserId ?? null,
      openedAt: null,
      lastSavedAt: null,
      submittedAt: null,
      reviewedAt: null,
      approvedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    getPulseCache().submissionLinks.push(row);
    return { link: row, rawToken };
  }
  const result = await db.insert(submissionLinks).values(rowData).$returningId();
  const id = result[0]?.id as number;
  const rows = await db.select().from(submissionLinks).where(eq(submissionLinks.id, id)).limit(1);
  return { link: rows[0], rawToken };
}

export async function listPulseSubmissionLinks() {
  const db = await getDb();
  if (!db) return getPulseCache().submissionLinks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.select().from(submissionLinks).orderBy(desc(submissionLinks.createdAt));
}

export async function revokePulseSubmissionLink(id: number) {
  const db = await getDb();
  if (!db) {
    const link = getPulseCache().submissionLinks.find((item) => item.id === id);
    if (link) Object.assign(link, { status: "revoked" as const, updatedAt: now() });
    return;
  }
  await db.update(submissionLinks).set({ status: "revoked" }).where(eq(submissionLinks.id, id));
}

export async function regeneratePulseSubmissionLink(id: number) {
  const rawToken = generateSubmissionToken();
  const tokenHash = hashSubmissionToken(rawToken);
  const expiresAt = defaultSubmissionExpiry();
  const db = await getDb();
  if (!db) {
    const link = getPulseCache().submissionLinks.find((item) => item.id === id);
    if (!link) return undefined;
    Object.assign(link, {
      tokenHash,
      status: "created" as const,
      expiresAt,
      openedAt: null,
      lastSavedAt: null,
      submittedAt: null,
      reviewedAt: null,
      approvedAt: null,
      updatedAt: now(),
    });
    return { link, rawToken };
  }
  await db.update(submissionLinks).set({
    tokenHash,
    status: "created",
    expiresAt,
    openedAt: null,
    lastSavedAt: null,
    submittedAt: null,
    reviewedAt: null,
    approvedAt: null,
  }).where(eq(submissionLinks.id, id));
  const rows = await db.select().from(submissionLinks).where(eq(submissionLinks.id, id)).limit(1);
  return rows[0] ? { link: rows[0], rawToken } : undefined;
}

export async function getPulseSubmissionReview(id: number) {
  const links = await listPulseSubmissionLinks();
  const link = links.find((item) => item.id === id);
  if (!link) return undefined;
  const [master, report, values, evidence] = await Promise.all([
    getPulseMasterData(),
    getReportByIdForSubmission(link.reportId),
    getPulseReportValues(link.reportId),
    getPulseEvidence(link.reportId),
  ]);
  return {
    link,
    entity: master.entities.find((entity) => entity.id === link.entityId),
    report,
    values: values.filter((value) => value.submissionLinkId === link.id),
    evidence: evidence.filter((item) => item.submissionLinkId === link.id),
  };
}

async function getSubmissionLinkByToken(token: string, markOpened = false) {
  const tokenHash = hashSubmissionToken(token);
  const db = await getDb();
  const rows = !db
    ? getPulseCache().submissionLinks.filter((link) => link.tokenHash === tokenHash)
    : await db.select().from(submissionLinks).where(eq(submissionLinks.tokenHash, tokenHash)).limit(1);
  const link = rows[0];
  if (!link) throw new Error("invalid");
  if (link.status === "revoked") throw new Error("revoked");
  if (link.expiresAt.getTime() < Date.now() || link.status === "expired") {
    if (!db) Object.assign(link, { status: "expired" as const, updatedAt: now() });
    else await db.update(submissionLinks).set({ status: "expired" }).where(eq(submissionLinks.id, link.id));
    throw new Error("expired");
  }
  if (markOpened && link.status === "created") {
    const openedAt = now();
    if (!db) Object.assign(link, { status: "opened" as const, openedAt, updatedAt: openedAt });
    else await db.update(submissionLinks).set({ status: "opened", openedAt }).where(eq(submissionLinks.id, link.id));
    return { ...link, status: "opened" as const, openedAt };
  }
  return link;
}

export async function getPulseSubmissionByToken(token: string) {
  const link = await getSubmissionLinkByToken(token, true);
  const [master, report, values, evidence] = await Promise.all([
    getPulseMasterData(),
    getReportByIdForSubmission(link.reportId),
    getPulseReportValues(link.reportId),
    getPulseEvidence(link.reportId),
  ]);
  const entity = master.entities.find((item) => item.id === link.entityId);
  if (!entity) throw new Error("invalid");
  const goalIds = new Set(master.entityGoalLinks.filter((item) => item.entityId === entity.id).map((item) => item.goalId));
  return {
    link: {
      id: link.id,
      reportId: link.reportId,
      entityId: link.entityId,
      managerName: link.managerName,
      status: link.status,
      expiresAt: link.expiresAt,
    },
    report,
    entity,
    goals: master.goals.filter((goal) => goalIds.has(goal.id)),
    metrics: await getMetricsForEntity(entity.id),
    values: values.filter((value) => value.submissionLinkId === link.id),
    evidence: evidence.filter((item) => item.submissionLinkId === link.id),
  };
}

export async function savePulseSubmission(token: string, data: {
  values: Array<{ metricDefinitionId: number; valueNumber?: number | null; valueText?: string | null; notes?: string | null }>;
  achievements?: string[];
  operationsNotes?: string | null;
  supportNeeded?: string | null;
  evidence?: Array<{ titleAr: string; descriptionAr?: string | null; url: string; type?: "image" | "video" | "link" | "document" | "testimonial" | "story"; isDonorFacing?: boolean }>;
  final?: boolean;
}) {
  const link = await getSubmissionLinkByToken(token);
  if (link.status === "approved" || link.status === "reviewed") {
    throw new Error("locked");
  }
  const metrics = await getMetricsForEntity(link.entityId);
  const allowedMetricIds = new Set(metrics.map((metric) => metric.id));
  const status = data.final ? "submitted" : "draft";
  for (const value of data.values) {
    if (!allowedMetricIds.has(value.metricDefinitionId)) {
      throw new Error("metric_scope_violation");
    }
    await upsertPulseMetricValue({
      reportId: link.reportId,
      entityId: link.entityId,
      metricDefinitionId: value.metricDefinitionId,
      valueNumber: value.valueNumber ?? null,
      valueText: value.valueText ?? null,
      notes: value.notes ?? null,
      source: "external_submission",
      submissionLinkId: link.id,
      submittedByName: link.managerName,
      submissionStatus: status,
    });
  }
  const noteParts = [
    ...(data.achievements ?? []).filter(Boolean).map((item, index) => `إنجاز ${index + 1}: ${item}`),
    data.operationsNotes ? `ملاحظات تشغيلية: ${data.operationsNotes}` : "",
    data.supportNeeded ? `احتياج أو دعم مطلوب: ${data.supportNeeded}` : "",
  ].filter(Boolean);
  if (noteParts.length > 0) {
    await createPulseEvidence({
      reportId: link.reportId,
      entityId: link.entityId,
      titleAr: data.final ? "ملخص إنجازات شهري مقدم" : "مسودة إنجازات شهرية",
      descriptionAr: noteParts.join("\n"),
      type: "story",
      url: "external-submission",
      isDonorFacing: true,
      submissionLinkId: link.id,
      submissionStatus: status,
      sortOrder: 0,
    });
  }
  for (const item of data.evidence ?? []) {
    if (!item.titleAr || !item.url) continue;
    await createPulseEvidence({
      reportId: link.reportId,
      entityId: link.entityId,
      titleAr: item.titleAr,
      descriptionAr: item.descriptionAr ?? null,
      type: item.type ?? "link",
      url: item.url,
      isDonorFacing: item.isDonorFacing ?? true,
      submissionLinkId: link.id,
      submissionStatus: status,
      sortOrder: 0,
    });
  }
  const patch = data.final
    ? { status: "submitted" as const, submittedAt: now(), lastSavedAt: now() }
    : { status: "draft" as const, lastSavedAt: now() };
  const db = await getDb();
  if (!db) Object.assign(link, patch, { updatedAt: now() });
  else await db.update(submissionLinks).set(patch).where(eq(submissionLinks.id, link.id));
  return { success: true, status };
}

export async function approvePulseSubmission(id: number, reviewedByUserId: number) {
  const reviewedAt = now();
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const link = cache.submissionLinks.find((item) => item.id === id);
    if (link) Object.assign(link, { status: "approved" as const, reviewedAt, approvedAt: reviewedAt, updatedAt: reviewedAt });
    cache.metricValues
      .filter((value) => value.submissionLinkId === id)
      .forEach((value) => Object.assign(value, { submissionStatus: "approved" as const, reviewedByUserId, reviewedAt, approvedByUserId: reviewedByUserId, approvedAt: reviewedAt, updatedAt: reviewedAt }));
    cache.evidenceAssets
      .filter((item) => item.submissionLinkId === id)
      .forEach((item) => Object.assign(item, { submissionStatus: "approved" as const, updatedAt: reviewedAt }));
    return;
  }
  await db.update(submissionLinks).set({ status: "approved", reviewedAt, approvedAt: reviewedAt }).where(eq(submissionLinks.id, id));
  await db.update(metricValues).set({ submissionStatus: "approved", reviewedByUserId, reviewedAt, approvedByUserId: reviewedByUserId, approvedAt: reviewedAt }).where(eq(metricValues.submissionLinkId, id));
  await db.update(evidenceAssets).set({ submissionStatus: "approved" }).where(eq(evidenceAssets.submissionLinkId, id));
}

export async function requestPulseSubmissionRevision(id: number) {
  const db = await getDb();
  if (!db) {
    const link = getPulseCache().submissionLinks.find((item) => item.id === id);
    if (link) Object.assign(link, { status: "needs_revision" as const, reviewedAt: now(), updatedAt: now() });
    return;
  }
  await db.update(submissionLinks).set({ status: "needs_revision", reviewedAt: now() }).where(eq(submissionLinks.id, id));
}

export async function createPulseReportExport(data: InsertReportExport) {
  const db = await getDb();
  if (!db) {
    const cache = getPulseCache();
    const row = { id: nextPulseId(), createdAt: now(), ...data, fileKey: data.fileKey ?? null, url: data.url ?? null };
    cache.reportExports.push(row);
    return row.id;
  }
  const result = await db.insert(reportExports).values(data).$returningId();
  return result[0]?.id as number;
}

export async function getPulseDashboard(reportId?: number) {
  const master = await getPulseMasterData();
  const reportValues = reportId ? await getPulseReportValues(reportId) : [];
  const approvedReportValues = reportValues.filter((value) => value.submissionStatus === "approved");
  const valuesWithKeys = approvedReportValues.map((value) => {
    const def = master.metricDefinitions.find((metricDef: typeof master.metricDefinitions[number]) => metricDef.id === value.metricDefinitionId);
    return {
      entityId: value.entityId,
      metricDefinitionId: value.metricDefinitionId,
      metricKey: def?.key ?? String(value.metricDefinitionId),
      valueNumber: value.valueNumber,
    };
  });
  const totals = aggregatePulseMetrics(valuesWithKeys);
  const donorMetricIds = new Set(
    master.metricDefinitions
      .filter((metric) => metric.isDonorFacing)
      .map((metric) => metric.id)
  );
  const donorFacingTotals = aggregatePulseMetrics(
    valuesWithKeys.filter((value) => donorMetricIds.has(value.metricDefinitionId ?? 0))
  );
  const progress = calculateGoalProgress(
    master.goals,
    master.goalMetricLinks,
    valuesWithKeys
  ).map((goal) => ({
    ...goal,
    linkedMetricNames: goal.linkedMetricDefinitionIds
      .map((metricDefinitionId) => master.metricDefinitions.find((metric) => metric.id === metricDefinitionId)?.nameAr)
      .filter((name): name is string => Boolean(name)),
  }));
  const evidenceRows = reportId ? await getPulseEvidence(reportId) : await getPulseEvidence();
  const evidence = evidenceRows.filter((item) => item.submissionStatus === "approved");
  const entitiesWithValues = new Set(approvedReportValues.map((value) => value.entityId));
  const activeEntities = master.entities.filter((entity: typeof master.entities[number]) => entity.status === "active" && entity.isActive);
  const entityHighlights = activeEntities
    .map((entity) => {
      const entityValues = approvedReportValues.filter((value) => value.entityId === entity.id);
      const donorValues = entityValues.filter((value) => donorMetricIds.has(value.metricDefinitionId));
      const valueTotal = donorValues.reduce((sum, value) => sum + Number(value.valueNumber ?? 0), 0);
      const metricNames = donorValues
        .map((value) => master.metricDefinitions.find((metric) => metric.id === value.metricDefinitionId)?.nameAr)
        .filter((name): name is string => Boolean(name));
      const goalNames = master.entityGoalLinks
        .filter((link) => link.entityId === entity.id)
        .map((link) => master.goals.find((goal) => goal.id === link.goalId)?.nameAr)
        .filter((name): name is string => Boolean(name));
      const evidenceCount = evidence.filter((item) => item.entityId === entity.id && item.isDonorFacing).length;
      return {
        entityId: entity.id,
        nameAr: entity.nameAr,
        type: entity.type,
        valueTotal,
        metricNames: Array.from(new Set(metricNames)).slice(0, 3),
        goalNames: Array.from(new Set(goalNames)).slice(0, 2),
        evidenceCount,
      };
    })
    .filter((item) => item.valueTotal > 0 || item.evidenceCount > 0)
    .sort((a, b) => b.valueTotal - a.valueTotal || b.evidenceCount - a.evidenceCount)
    .slice(0, 6);
  const pendingSubmissionCount = reportId
    ? (await listPulseSubmissionLinks()).filter(
        (link) => link.reportId === reportId && ["submitted", "draft", "needs_revision", "opened", "created"].includes(link.status)
      ).length
    : 0;
  const dataCompletenessScore =
    activeEntities.length > 0 ? Math.round((entitiesWithValues.size / activeEntities.length) * 100) : 0;
  const missingSubmissions = reportId
    ? master.entities.filter(
        (entity: typeof master.entities[number]) =>
          entity.status === "active" && entity.isActive && !entitiesWithValues.has(entity.id)
      )
    : [];
  return {
    totals: {
      ...totals,
      totalEvidenceAssets: evidence.length,
      donorFacingEvidenceCount: evidence.filter((item) => item.isDonorFacing).length,
      approvedValueCount: approvedReportValues.length,
      approvedEvidenceCount: evidence.length,
      pendingSubmissionCount,
      dataCompletenessScore,
      donorFacing: {
        ...donorFacingTotals,
        totalEvidenceAssets: evidence.filter((item) => item.isDonorFacing).length,
        donorFacingEvidenceCount: evidence.filter((item) => item.isDonorFacing).length,
      },
      goalAchievementRate:
        progress.length > 0
          ? Math.round(progress.reduce((sum, goal) => sum + goal.progress, 0) / progress.length)
          : 0,
    },
    goalProgress: progress,
    activeEntities,
    entityHighlights,
    missingSubmissions,
    donorReadyHighlights: evidence.filter((item) => item.isDonorFacing).slice(0, 6),
    evidence,
  };
}
