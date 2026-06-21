# RAWAHEL Pulse — نبض رواحل

RAWAHEL Pulse is an Arabic-first impact measurement and reporting system for Rawahel Foundation. It turns the old monthly infographic demo into a full operational solution for strategic tracks, strategic goals, execution entities, KPI entry, evidence links, premium report preview, and PDF/PNG export.

## Product Scope

- Arabic-first RTL interface.
- Flexible entity management: offices, institutes, initiatives, projects, units, departments, campaigns, and platforms.
- Strategic tracks and goals linked to entities.
- Entity-specific KPI presets plus custom KPI definitions.
- Monthly, quarterly, semiannual, and annual report periods.
- Report audiences: internal, donor, board, and public.
- Evidence/story links for donor-facing reporting.
- External monthly submission links for entity managers.
- Three report templates: Monthly, Donor, and Annual.
- Premium report preview with browser-side PDF and PNG export.
- Entity-first report entry, entity details, and goal details.
- Backward compatibility with legacy department data for older reports.

## Run Locally

```bash
pnpm install
pnpm check
pnpm test
pnpm readiness:production
pnpm build
pnpm dev
```

RAWAHEL Pulse does not require any platform-specific runtime, Vite runtime plugin, or injected browser debug assets. If OAuth environment variables are absent in non-production, the server provides a local admin session for development/review operation. Production startup and `pnpm readiness:production` fail when required auth/database environment variables are missing.

## How To Add A New Entity

1. Open `/pulse` or choose **نبض رواحل** from the sidebar.
2. Fill in the Arabic name, stable slug, type, owner, and description.
3. Select linked **المسارات الاستراتيجية** and **الأهداف الاستراتيجية**.
4. Click **إضافة كيان**.
5. Archived entities stop appearing in active entry lists, while historical report data remains preserved.

## How To Add A KPI

1. Open `/pulse`.
2. Select the target entity.
3. Enter the KPI Arabic label, stable key, and unit.
4. Click **إضافة KPI للكيان المحدد**.
5. The KPI appears in the monthly entry form for that entity.

## How To Create A Report

1. Open `/reports`.
2. Click **تقرير جديد**.
3. Select month, year, period type, and audience.
4. Open the report detail page, select the entity, then enter KPI values.

## How To Add Evidence

1. Open `/pulse`.
2. Select the report and entity.
3. Add a title, URL, description, and evidence type.
4. Evidence can be donor-facing and contributes to the Pulse dashboard totals.

## How To Export PDF/PNG

1. Open a report preview.
2. Use **تصدير PDF** or **تصدير صورة PNG**.
3. Export works locally in the browser.
4. External storage upload is best-effort only and is not required for full local export operation.

## Google Sheets Format

The current RAWAHEL Pulse import format is:

```csv
period,entity_key,metric_key,value,notes,source
2026-06,scientific_office,total_beneficiaries,1200,Monthly beneficiaries,sheet
2026-06,media_communications,content_produced,42,Published assets,sheet
```

`period` is accepted for traceability, while the report page you sync from controls the destination report. Legacy `department_key,metric_key,value` sheets are still accepted for older report data.

## Database Model

Legacy demo tables remain intact:

- `reports`
- `department_data`
- `department_items`
- `sheet_config`

RAWAHEL Pulse adds:

- `strategic_tracks`
- `strategic_goals`
- `entities`
- `entity_track_links`
- `entity_goal_links`
- `metric_definitions`
- `metric_values`
- `evidence_assets`
- `report_exports`

Seed data and KPI presets live in `shared/masterData.ts`. When no database is configured, the app uses an in-memory seed so the UI can still be reviewed.

## Migration Strategy

- Existing reports and department data are preserved.
- New features use the flexible Pulse master data model.
- Primary screens are now entity-first, with legacy department rollups retained for older comparisons.
- Google Sheets import remains optional; manual entry works without Sheets.

## Roles

- `admin`: manages entities, goals, KPI definitions, and seed data.
- `editor`: enters KPI values, evidence, and records exports.
- `viewer`: reads dashboards, reports, entity detail, and goal detail.

## Verification

Current verification commands:

```bash
pnpm check
pnpm test
pnpm readiness:production
pnpm build
```

## Operator Guide

For the free Render + Aiven production path, use:

```text
docs/RENDER_AIVEN_DEPLOYMENT_RUNBOOK.md
```

### 1. How To Login As Admin

1. In production, configure `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `VITE_APP_ID`, and `JWT_SECRET`.
2. Open the deployed RAWAHEL Pulse URL.
3. Click **الدخول إلى نبض رواحل**.
4. Sign in through the configured OAuth portal.
5. Confirm the user has one of the internal roles: `super_admin`, `admin`, `editor`, or `viewer`.

Local development note: when `NODE_ENV` is not `production`, `OAUTH_SERVER_URL` is absent, and `RAWAHEL_DISABLE_LOCAL_ADMIN_FALLBACK` is not `1`, the server provides a local `super_admin` session for development/review only. Production does not grant this fallback.

### 2. How To Create/Edit An Entity

1. Open `/pulse#entities`.
2. Enter the Arabic entity name, stable key, entity type, owner name, color/icon, and description.
3. Select linked strategic tracks and goals.
4. Save the entity.
5. To edit, update the entity details from the same admin screen.
6. To archive, use the archive action. Archived entities stop appearing in active entry lists while historical records remain preserved.

### 3. How To Create A Report Period

1. Open `/reports`.
2. Click **تقرير جديد**.
3. Select year, month, period type, audience, and title if needed.
4. Save the report.
5. Open the report detail page to enter or review data.

### 4. How To Generate An External Submission Link

1. Open `/pulse/submission-links`.
2. Choose the target report period.
3. Choose the target entity.
4. Enter manager name and optional email/phone.
5. Click **إنشاء رابط خاص**.
6. Copy the generated `/submit/:token` URL immediately. RAWAHEL Pulse stores only the token hash, not the raw token.

### 5. How A Manager Submits Data

1. The manager opens `/submit/:token`.
2. The external page is standalone and has no sidebar, dashboard, admin, or internal navigation links.
3. The manager sees only the entity/report scoped to that token.
4. The manager enters KPI values, achievements, operational notes, support needs, and optional evidence/story links.
5. The manager may save a draft or submit final data.

### 6. How Admin Reviews And Approves Data

1. Open `/pulse/submission-links`.
2. Select the submitted link review action.
3. Review KPI values and donor-facing evidence.
4. Click approve to include the submission in official dashboard/donor report calculations.
5. Request revision when data needs correction.
6. Reject a submission when it should be preserved for audit but excluded from official calculations. Draft/submitted/rejected/non-approved external values do not enter official reports.

### 6.1 How To Create A KPI And Link It To A Goal

1. Open `/pulse#metrics`.
2. Create the KPI definition with Arabic name, unit, aggregation, donor-facing flag, and entity scope.
3. In the goal-linking area, select the strategic goal.
4. Choose only the KPI definitions that should contribute to this goal.
5. Save the mapping. Goal progress will be calculated only from explicit `goal_metric_links`.

### 7. How To Edit An Approved Value Safely

1. Use an `admin` or `super_admin` account.
2. Open the relevant approved metric value from the Pulse/admin workflow.
3. Enter the corrected value and a clear change reason.
4. Save the edit.
5. The audit log records previous and current values with the reason. Edits without a reason are rejected.

### 8. How To Archive/Cancel A Report

1. Open `/admin`.
2. In report management, choose **أرشفة التقرير** to preserve it outside active lists.
3. Choose **إلغاء التقرير** when a report period should not be used.
4. Choose **قفل التقرير** when the report is finalized and should not receive normal operational edits.
5. Choose **تكرار** to copy a report structure into a new draft period.
6. Archived/cancelled reports are hidden from active report lists but remain available when inactive reports are explicitly requested.

### 8.1 How To Manage Settings And Audit Log

1. Open `/admin`.
2. Update foundation name, Arabic display name, report colors, disclaimer, external submission base URL, and default link expiry from **الإعدادات والهوية**.
3. Only `super_admin` can change system settings.
4. Use **سجل العمليات** filters for actor, action, and resource type when auditing sensitive operations.

### 9. How To Export Donor PDF/PNG

1. Open a report preview at `/reports/:id/preview`.
2. Select **تقرير أثر الداعمين**.
3. Confirm the preview is using approved donor-facing data only.
4. Click **تصدير PDF** or **تصدير صورة PNG**.
5. The browser downloads a local export. Optional remote storage upload is best-effort and not required for full local export operation.

### 10. Role Permissions Summary

| Role | Summary |
|---|---|
| `super_admin` | All permissions, including user management and report deletion. |
| `admin` | Manage reports, entities, strategy, KPIs, approvals, approved-value edits, audit log, and exports. Cannot manage users. |
| `editor` | Create/update reports, enter metric values/evidence, and create exports. Cannot approve submissions or edit approved values. |
| `viewer` | Read-only access to authenticated dashboards/reports. Cannot edit, approve, export, or manage users. |

Server-side permission checks are enforced through `permissionProcedure`, `adminProcedure`, `editorProcedure`, and `protectedProcedure`.

### 11. Required Environment Variables

Use `.env.example` as the production setup template. Do not commit real values.

| Variable | Required | Notes |
|---|---:|---|
| `NODE_ENV` | Yes | Use `production` in production. |
| `JWT_SECRET` | Yes in production | Signs/verifies session cookies. Must be at least 32 characters. Production refuses the local fallback secret. |
| `DATABASE_URL` | Yes in production | MySQL connection. Without it, local in-memory data is used only outside production. |
| `OAUTH_SERVER_URL` | Production auth | OAuth backend URL. Absence disables OAuth and only allows local fallback outside production. |
| `VITE_OAUTH_PORTAL_URL` | Production auth UI | Frontend OAuth portal base URL. |
| `VITE_APP_ID` | Production auth | OAuth app/project id. |
| `OWNER_OPEN_ID` | Optional | Owner/bootstrap identity when used by deployment process. |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Optional | Remote export storage presign/upload service. Local browser export works without these. |
| `EXTERNAL_SUBMISSION_BASE_URL` | Recommended | Public base URL used by operators when sharing `/submit/:token` links. |
| `RAWAHEL_DISABLE_LOCAL_ADMIN_FALLBACK` | Optional | Set to `1` to disable the non-production local admin fallback. |

### 12. Local Export Fallback Behavior

PDF and PNG exports are generated in the browser. If remote storage is not configured or upload fails, the local file still downloads and the UI shows the local export result. This fallback is intentional for full solution readiness because report export must keep working without optional storage.

### 13. Production Deployment Notes

- Run database migrations before deployment.
- Seed baseline Pulse data before first operator use.
- Create/verify at least one active `super_admin`.
- Configure auth/session secrets before exposing `/admin` or `/pulse`.
- Configure `EXTERNAL_SUBMISSION_BASE_URL` for manager links.
- Confirm `NODE_ENV=production` so local admin fallback is disabled.
- Run `pnpm check`, `pnpm test`, `pnpm readiness:production`, and `pnpm build` before release.
- Verify no Manus/WZZRD runtime dependency is required.
- Verify no raw external submission tokens are logged or stored.
- Verify official dashboards/reports use approved data only.

## Deployment Readiness Checklist

- [ ] Database migrations applied.
- [ ] Seed data loaded.
- [ ] Super Admin user exists.
- [ ] Auth/session secret configured.
- [ ] Storage environment variables are optional and documented.
- [ ] Export local fallback documented.
- [ ] External submission base URL configured.
- [ ] `pnpm readiness:production` passes with the real production environment.
- [ ] Production build passes.
- [ ] No Manus/WZZRD dependencies are required at runtime.
- [ ] No raw tokens are logged or stored.
- [ ] No fake/draft/unapproved data appears in official reports.

## Admin Workflow — Premium Product Finish

### Add A New Initiative Or Entity

1. Open `/pulse#entities`.
2. Enter the Arabic entity name, stable key, type, owner, and short description.
3. Select the strategic tracks and goals that this entity contributes to.
4. Click **إضافة كيان**.
5. The entity immediately appears in KPI entry and entity detail screens. If archived later, it is removed from new active reports while historical values remain available.

### Link Strategic Goals To KPIs

1. Open `/pulse#metrics`.
2. Add any custom KPI needed for the selected entity.
3. In **ربط الهدف بالمؤشرات**, choose the strategic goal.
4. Select the KPI definitions that should calculate that goal.
5. Click **حفظ مؤشرات الهدف**.

Goal progress is intentionally explainable: RAWAHEL Pulse only calculates a strategic goal from explicitly linked KPI definitions in `goal_metric_links`. Unrelated metrics such as messages, hours, rates, or activities are not mixed into a goal unless selected.

### Enter Monthly KPI Values

1. Open `/pulse#values`.
2. Choose the monthly report.
3. Choose the entity.
4. Review the linked strategic goals shown beside the form.
5. Fill the KPI values for that entity only.
6. Click **حفظ مؤشرات الشهر**.
7. Use the missing-data warning to see whether visible KPIs still need values.

### Add Donor-Facing Evidence

1. Open `/pulse#evidence`.
2. Choose the same report and entity used for KPI entry.
3. Add a concise story title, evidence URL, and short Arabic description.
4. Save it as donor-facing evidence so it appears in the donor report.

### Create And Export A Donor Report

1. Open `/reports`.
2. Create or open the target report.
3. Open **معاينة التقرير**.
4. Choose the **Donor** template.
5. Review the premium donor report sections:
   - big impact numbers
   - strategic goal progress
   - active entity highlights
   - donor-facing stories and evidence
   - where support created impact
6. Click **تصدير PDF** or **تصدير صورة PNG**.

The export is browser-side and works locally. Remote upload/storage is optional and best-effort only.

### Generate Monthly Submission Links

1. Open `/pulse/submission-links`.
2. Choose the report period.
3. Choose the entity.
4. Enter the manager name and optional email/phone.
5. Click **إنشاء رابط خاص**.
6. Copy the generated `/submit/:token` link and send it manually to the manager.

The raw token is shown only when generated or regenerated. The database stores only `tokenHash`, not the raw token.

### Entity Manager Submission Flow

1. The manager opens `/submit/:token`.
2. The page is standalone: no sidebar, no dashboard, no internal navigation.
3. The manager sees only:
   - entity name
   - report period
   - linked strategic goals
   - KPIs available for that entity
   - achievements, notes, support needs, and evidence/story fields
4. The manager can click **حفظ مسودة** or **إرسال نهائي**.
5. Revoked or expired links show a friendly Arabic error page.

### Review And Approve External Submissions

1. Open `/pulse/submission-links`.
2. Select **مراجعة** beside a submitted link.
3. Review KPI values and donor-facing evidence.
4. Click **اعتماد البيانات** to make the values and evidence usable in dashboard/report calculations.
5. Click **طلب تعديل** if the manager needs to revise and resubmit.

Pending external values are not final report data. RAWAHEL Pulse includes submitted values/evidence in dashboard and donor reports only after approval. Internal manual entries remain approved by default.

### Submission Link Security Notes

- Each submission link is scoped to exactly one entity and one report.
- External form submissions always use the entity/report stored on the token record, never client-sent entity/report fields.
- RAWAHEL Pulse stores only a hashed token (`tokenHash`); the raw token is shown only when generated or regenerated.
- Regenerating a link invalidates the previous raw token.
- Revoked or expired links cannot be opened, saved as draft, or submitted.
- Official dashboards and donor reports include only approved external values and approved donor-facing evidence.
