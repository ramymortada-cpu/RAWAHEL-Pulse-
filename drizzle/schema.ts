import { boolean, date, double, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "admin", "editor", "viewer", "user"]).default("viewer").notNull(),
  status: mysqlEnum("status", ["active", "invited", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Monthly reports. Each report represents one month's infographic for the foundation.
 * year/month identify the reporting period. status tracks draft vs generated.
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  periodType: mysqlEnum("periodType", ["monthly", "quarterly", "semiannual", "annual"]).default("monthly").notNull(),
  audience: mysqlEnum("audience", ["internal", "donor", "board", "public"]).default("internal").notNull(),
  status: mysqlEnum("status", ["draft", "active", "locked", "archived", "cancelled", "generated"]).default("draft").notNull(),
  // Summary KPI snapshot stored as JSON for fast dashboard rendering
  // { totalBeneficiaries, programsExecuted, volunteers, contentProduced, goalAchievementRate,
  //   trends: { totalBeneficiaries: number, ... } }  trend = % change vs previous month
  summary: json("summary"),
  // Generated PDF storage key + url
  pdfKey: varchar("pdfKey", { length: 512 }),
  pdfUrl: varchar("pdfUrl", { length: 512 }),
  generatedAt: timestamp("generatedAt"),
  lockedAt: timestamp("lockedAt"),
  lockedByUserId: int("lockedByUserId"),
  archivedAt: timestamp("archivedAt"),
  archivedByUserId: int("archivedByUserId"),
  cancelledAt: timestamp("cancelledAt"),
  cancelledByUserId: int("cancelledByUserId"),
  cancelReason: text("cancelReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Per-department data for a given report.
 * departmentKey is a stable slug, e.g. "scientific_office".
 * metrics holds the department-specific numbers as JSON.
 * achievements is an array of highlight strings.
 */
export const departmentData = mysqlTable("department_data", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  departmentKey: varchar("departmentKey", { length: 64 }).notNull(),
  // { beneficiaries, programs, goalTarget, goalAchieved, contentCount, volunteers, ...custom }
  metrics: json("metrics"),
  // ["إطلاق دورة ...", "إنجاز كتاب ..."]
  achievements: json("achievements"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DepartmentData = typeof departmentData.$inferSelect;
export type InsertDepartmentData = typeof departmentData.$inferInsert;

/**
 * Named sub-items inside a department for a given report.
 * e.g. department "institutes" -> items "معهد أذن خير", "دورة إنه محمد", ...
 * itemKey is a stable slug unique within the department.
 * metrics holds the item-specific numbers as JSON.
 */
export const departmentItems = mysqlTable("department_items", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  departmentKey: varchar("departmentKey", { length: 64 }).notNull(),
  itemKey: varchar("itemKey", { length: 64 }).notNull(),
  itemNameAr: varchar("itemNameAr", { length: 255 }).notNull(),
  itemType: varchar("itemType", { length: 48 }).notNull(),
  // { beneficiaries, batches, subscribers, views, followers, ...custom }
  metrics: json("metrics"),
  notes: text("notes"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DepartmentItem = typeof departmentItems.$inferSelect;
export type InsertDepartmentItem = typeof departmentItems.$inferInsert;

/**
 * Google Sheets integration config per owner.
 * Stores the sheet URL/ID and last sync time. Sync uses public CSV export.
 */
export const sheetConfig = mysqlTable("sheet_config", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  sheetUrl: varchar("sheetUrl", { length: 1024 }).notNull(),
  sheetId: varchar("sheetId", { length: 128 }),
  gid: varchar("gid", { length: 64 }),
  enabled: boolean("enabled").default(true).notNull(),
  // Whether monthly auto-sync (Heartbeat cron) is active
  autoSync: boolean("autoSync").default(false).notNull(),
  // Heartbeat cron task uid for the monthly auto-sync job (null when disabled)
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SheetConfig = typeof sheetConfig.$inferSelect;
export type InsertSheetConfig = typeof sheetConfig.$inferInsert;

export const strategicTracks = mysqlTable("strategic_tracks", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 96 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  descriptionAr: text("descriptionAr"),
  color: varchar("color", { length: 32 }).default("#1b2a5e").notNull(),
  icon: varchar("icon", { length: 64 }).default("Circle").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StrategicTrack = typeof strategicTracks.$inferSelect;
export type InsertStrategicTrack = typeof strategicTracks.$inferInsert;

export const strategicGoals = mysqlTable("strategic_goals", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 96 }).notNull().unique(),
  trackId: int("trackId"),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  descriptionAr: text("descriptionAr"),
  targetValue: double("targetValue").default(0).notNull(),
  targetUnit: varchar("targetUnit", { length: 64 }).default("عدد").notNull(),
  periodType: mysqlEnum("periodType", ["yearly", "two_years", "monthly", "custom"]).default("yearly").notNull(),
  startDate: date("startDate"),
  endDate: date("endDate"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StrategicGoal = typeof strategicGoals.$inferSelect;
export type InsertStrategicGoal = typeof strategicGoals.$inferInsert;

export const entities = mysqlTable("entities", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 96 }).notNull().unique(),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  type: mysqlEnum("type", [
    "office",
    "institute_online",
    "institute_offline",
    "quran_institute",
    "initiative",
    "campaign",
    "project",
    "unit",
    "department",
    "platform",
  ]).notNull(),
  descriptionAr: text("descriptionAr"),
  ownerName: varchar("ownerName", { length: 255 }),
  status: mysqlEnum("status", ["active", "paused", "archived"]).default("active").notNull(),
  startDate: date("startDate"),
  sortOrder: int("sortOrder").default(0).notNull(),
  color: varchar("color", { length: 32 }).default("#1b2a5e").notNull(),
  icon: varchar("icon", { length: 64 }).default("Building2").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Entity = typeof entities.$inferSelect;
export type InsertEntity = typeof entities.$inferInsert;

export const entityTrackLinks = mysqlTable("entity_track_links", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull(),
  trackId: int("trackId").notNull(),
});

export type EntityTrackLink = typeof entityTrackLinks.$inferSelect;
export type InsertEntityTrackLink = typeof entityTrackLinks.$inferInsert;

export const entityGoalLinks = mysqlTable("entity_goal_links", {
  id: int("id").autoincrement().primaryKey(),
  entityId: int("entityId").notNull(),
  goalId: int("goalId").notNull(),
  role: mysqlEnum("role", ["owner", "contributor", "support"]).default("contributor").notNull(),
  weight: double("weight"),
});

export type EntityGoalLink = typeof entityGoalLinks.$inferSelect;
export type InsertEntityGoalLink = typeof entityGoalLinks.$inferInsert;

export const metricDefinitions = mysqlTable("metric_definitions", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 96 }).notNull(),
  entityId: int("entityId"),
  appliesToType: varchar("appliesToType", { length: 64 }),
  nameAr: varchar("nameAr", { length: 255 }).notNull(),
  descriptionAr: text("descriptionAr"),
  unit: mysqlEnum("unit", ["count", "percent", "currency", "hours", "days", "text_score"]).default("count").notNull(),
  aggregation: mysqlEnum("aggregation", ["sum", "avg", "latest", "max", "min"]).default("sum").notNull(),
  direction: mysqlEnum("direction", ["higher_is_better", "lower_is_better", "neutral"]).default("higher_is_better").notNull(),
  aggregationScope: mysqlEnum("aggregationScope", ["additive", "non_additive", "latest"]).default("additive").notNull(),
  isCore: boolean("isCore").default(false).notNull(),
  isDonorFacing: boolean("isDonorFacing").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MetricDefinition = typeof metricDefinitions.$inferSelect;
export type InsertMetricDefinition = typeof metricDefinitions.$inferInsert;

export const goalMetricLinks = mysqlTable("goal_metric_links", {
  id: int("id").autoincrement().primaryKey(),
  goalId: int("goalId").notNull(),
  metricDefinitionId: int("metricDefinitionId").notNull(),
  entityId: int("entityId"),
  weight: double("weight"),
  contributionType: mysqlEnum("contributionType", ["sum", "avg", "latest"]).default("sum").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GoalMetricLink = typeof goalMetricLinks.$inferSelect;
export type InsertGoalMetricLink = typeof goalMetricLinks.$inferInsert;

export const metricValues = mysqlTable("metric_values", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  entityId: int("entityId").notNull(),
  metricDefinitionId: int("metricDefinitionId").notNull(),
  valueNumber: double("valueNumber"),
  valueText: text("valueText"),
  notes: text("notes"),
  source: varchar("source", { length: 255 }),
  submissionLinkId: int("submissionLinkId"),
  submittedByName: varchar("submittedByName", { length: 255 }),
  submissionStatus: mysqlEnum("submissionStatus", ["draft", "submitted", "reviewed", "approved", "rejected", "archived"]).default("approved").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  approvedAt: timestamp("approvedAt"),
  approvedByUserId: int("approvedByUserId"),
  updatedByUserId: int("updatedByUserId"),
  lockedAt: timestamp("lockedAt"),
  changeReason: text("changeReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MetricValue = typeof metricValues.$inferSelect;
export type InsertMetricValue = typeof metricValues.$inferInsert;

export const evidenceAssets = mysqlTable("evidence_assets", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  entityId: int("entityId"),
  goalId: int("goalId"),
  titleAr: varchar("titleAr", { length: 255 }).notNull(),
  descriptionAr: text("descriptionAr"),
  type: mysqlEnum("type", ["image", "video", "link", "document", "testimonial", "story"]).default("link").notNull(),
  url: varchar("url", { length: 1024 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  isDonorFacing: boolean("isDonorFacing").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  featuredOrder: int("featuredOrder"),
  submissionLinkId: int("submissionLinkId"),
  submissionStatus: mysqlEnum("submissionStatus", ["draft", "submitted", "reviewed", "approved", "rejected", "archived"]).default("approved").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EvidenceAsset = typeof evidenceAssets.$inferSelect;
export type InsertEvidenceAsset = typeof evidenceAssets.$inferInsert;

export const submissionLinks = mysqlTable("submission_links", {
  id: int("id").autoincrement().primaryKey(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  reportId: int("reportId").notNull(),
  entityId: int("entityId").notNull(),
  managerName: varchar("managerName", { length: 255 }).notNull(),
  managerEmail: varchar("managerEmail", { length: 320 }),
  managerPhone: varchar("managerPhone", { length: 64 }),
  status: mysqlEnum("status", ["created", "opened", "draft", "submitted", "reviewed", "approved", "revoked", "expired", "needs_revision"]).default("created").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  openedAt: timestamp("openedAt"),
  lastSavedAt: timestamp("lastSavedAt"),
  submittedAt: timestamp("submittedAt"),
  reviewedAt: timestamp("reviewedAt"),
  approvedAt: timestamp("approvedAt"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubmissionLink = typeof submissionLinks.$inferSelect;
export type InsertSubmissionLink = typeof submissionLinks.$inferInsert;

export const reportExports = mysqlTable("report_exports", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  type: mysqlEnum("type", ["pdf", "png"]).notNull(),
  templateKey: varchar("templateKey", { length: 96 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  url: varchar("url", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReportExport = typeof reportExports.$inferSelect;
export type InsertReportExport = typeof reportExports.$inferInsert;

export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  foundationName: varchar("foundationName", { length: 255 }).default("RAWAHEL").notNull(),
  displayNameAr: varchar("displayNameAr", { length: 255 }).default("نبض رواحل").notNull(),
  logoUrl: varchar("logoUrl", { length: 1024 }),
  primaryColor: varchar("primaryColor", { length: 32 }).default("#1b2a5e").notNull(),
  accentColor: varchar("accentColor", { length: 32 }).default("#d4a843").notNull(),
  reportDisclaimer: text("reportDisclaimer"),
  defaultSubmissionExpiryDays: int("defaultSubmissionExpiryDays").default(30).notNull(),
  externalSubmissionBaseUrl: varchar("externalSubmissionBaseUrl", { length: 1024 }),
  localExportFallbackEnabled: boolean("localExportFallbackEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = typeof systemSettings.$inferInsert;

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  actorName: varchar("actorName", { length: 255 }),
  actorRole: varchar("actorRole", { length: 64 }),
  action: varchar("action", { length: 96 }).notNull(),
  resourceType: varchar("resourceType", { length: 96 }).notNull(),
  resourceId: varchar("resourceId", { length: 96 }),
  summaryAr: text("summaryAr").notNull(),
  metadataJson: json("metadataJson"),
  ipAddress: varchar("ipAddress", { length: 96 }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
