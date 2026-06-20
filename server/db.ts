import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  entities,
  entityGoalLinks,
  entityTrackLinks,
  evidenceAssets,
  InsertEntity,
  InsertEntityGoalLink,
  InsertEvidenceAsset,
  InsertMetricDefinition,
  InsertMetricValue,
  InsertReportExport,
  InsertStrategicGoal,
  InsertStrategicTrack,
  InsertUser,
  metricDefinitions,
  metricValues,
  reportExports,
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
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  ENTITIES,
  METRIC_DEFINITIONS,
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
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
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
      values.role = "admin";
      updateSet.role = "admin";
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
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/* ---------------------- Reports ---------------------- */

export async function listReports(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reports)
    .where(eq(reports.ownerId, ownerId))
    .orderBy(desc(reports.year), desc(reports.month), desc(reports.createdAt));
}

export async function getReport(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.ownerId, ownerId)))
    .limit(1);
  return rows[0];
}

export async function findReportByPeriod(ownerId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return undefined;
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
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reports).values(data).$returningId();
  return result[0]?.id as number;
}

export async function updateReport(
  ownerId: number,
  id: number,
  patch: Partial<InsertReport>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(reports)
    .set(patch)
    .where(and(eq(reports.id, id), eq(reports.ownerId, ownerId)));
}

export async function deleteReport(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(departmentItems).where(eq(departmentItems.reportId, id));
  await db.delete(departmentData).where(eq(departmentData.reportId, id));
  await db.delete(reports).where(and(eq(reports.id, id), eq(reports.ownerId, ownerId)));
}

/* ---------------------- Department items (named sub-items) ---------------------- */

export async function getItemsByReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(departmentItems)
    .where(eq(departmentItems.reportId, reportId))
    .orderBy(departmentItems.departmentKey, departmentItems.sortOrder);
}

export async function upsertItem(data: InsertDepartmentItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
  if (!db) throw new Error("Database not available");
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
  if (!db) throw new Error("Database not available");
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
  if (!db) return [];
  return db.select().from(departmentData).where(eq(departmentData.reportId, reportId));
}

export async function upsertDepartmentData(data: InsertDepartmentData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
  metricValues: Array<typeof metricValues.$inferSelect>;
  evidenceAssets: Array<typeof evidenceAssets.$inferSelect>;
  reportExports: Array<typeof reportExports.$inferSelect>;
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
  pulseCache = {
    tracks,
    goals,
    entities: entitiesSeed,
    entityTrackLinks: entityTrackLinksSeed,
    entityGoalLinks: entityGoalLinksSeed,
    metricDefinitions: metricDefinitionsSeed,
    metricValues: [],
    evidenceAssets: [],
    reportExports: [],
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

  return getPulseMasterData();
}

export async function getPulseMasterData(): Promise<PulseCache> {
  const db = await getDb();
  if (!db) return getPulseCache();
  const [tracks, goals, entitiesRows, trackLinks, goalLinks, metricDefs] =
    await Promise.all([
      db.select().from(strategicTracks).orderBy(strategicTracks.sortOrder),
      db.select().from(strategicGoals).orderBy(strategicGoals.sortOrder),
      db.select().from(entities).orderBy(entities.sortOrder),
      db.select().from(entityTrackLinks),
      db.select().from(entityGoalLinks),
      db.select().from(metricDefinitions).orderBy(metricDefinitions.sortOrder),
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
    metricValues: [] as Array<typeof metricValues.$inferSelect>,
    evidenceAssets: [] as Array<typeof evidenceAssets.$inferSelect>,
    reportExports: [] as Array<typeof reportExports.$inferSelect>,
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

export async function getMetricsForEntity(entityId: number) {
  const master = await getPulseMasterData();
  const entity = master.entities.find((item) => item.id === entityId);
  if (!entity) return [];
  return master.metricDefinitions.filter(
    (metricDef: typeof master.metricDefinitions[number]) =>
      metricDef.isActive &&
      (!metricDef.appliesToType || metricDef.appliesToType === entity.type || metricDef.entityId === entityId)
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
        value.metricDefinitionId === data.metricDefinitionId
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
        eq(metricValues.metricDefinitionId, data.metricDefinitionId)
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
  const valuesWithKeys = reportValues.map((value) => {
    const def = master.metricDefinitions.find((metricDef: typeof master.metricDefinitions[number]) => metricDef.id === value.metricDefinitionId);
    return {
      entityId: value.entityId,
      metricKey: def?.key ?? String(value.metricDefinitionId),
      valueNumber: value.valueNumber,
    };
  });
  const totals = aggregatePulseMetrics(valuesWithKeys);
  const progress = calculateGoalProgress(
    master.goals,
    master.entityGoalLinks,
    valuesWithKeys
  );
  const evidence = reportId ? await getPulseEvidence(reportId) : await getPulseEvidence();
  const entitiesWithValues = new Set(reportValues.map((value) => value.entityId));
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
      goalAchievementRate:
        progress.length > 0
          ? Math.round(progress.reduce((sum, goal) => sum + goal.progress, 0) / progress.length)
          : 0,
    },
    goalProgress: progress,
    activeEntities: master.entities.filter((entity: typeof master.entities[number]) => entity.status === "active" && entity.isActive),
    missingSubmissions,
    donorReadyHighlights: evidence.filter((item) => item.isDonorFacing).slice(0, 6),
    evidence,
  };
}
