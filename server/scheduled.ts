import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getSheetConfigByTaskUid } from "./db";
import {
  fetchSheetRows,
  importSheetRows,
  ensureReportForPeriod,
  refreshSummary,
} from "./sheetSync";
import { upsertSheetConfig } from "./db";

/**
 * Monthly auto-sync handler.
 * Triggered by the Heartbeat cron created in reports.setAutoSync.
 * - Authenticates the cron request
 * - Looks up the sheet config by task_uid (never by body)
 * - Ensures a report exists for the current month
 * - Imports department data from the linked Google Sheet
 * Idempotent: re-running for the same month updates the same report rows.
 */
export async function monthlySyncHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const cfg = await getSheetConfigByTaskUid(user.taskUid);
    if (!cfg) {
      // orphaned cron — return 2xx so the platform stops retrying
      return res.json({ ok: true, skipped: "orphan" });
    }
    if (!cfg.enabled || !cfg.autoSync || !cfg.sheetId) {
      return res.json({ ok: true, skipped: "disabled" });
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1; // current month

    const reportId = await ensureReportForPeriod(cfg.ownerId, year, month);

    const rows = await fetchSheetRows(cfg.sheetId, cfg.gid ?? "0");
    const imported = await importSheetRows(reportId, rows);

    await upsertSheetConfig({
      ownerId: cfg.ownerId,
      sheetUrl: cfg.sheetUrl,
      sheetId: cfg.sheetId,
      gid: cfg.gid,
      enabled: cfg.enabled,
      lastSyncedAt: new Date(),
    });

    await refreshSummary(cfg.ownerId, reportId);

    return res.json({ ok: true, reportId, imported, period: { year, month } });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({
      error: err.message,
      stack: err.stack,
      context: { url: req.originalUrl, taskUid: "see-auth" },
      timestamp: new Date().toISOString(),
    });
  }
}
