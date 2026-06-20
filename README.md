# RAWAHEL Pulse — نبض رواحل

RAWAHEL Pulse is an Arabic-first impact measurement and reporting system for Rawahel Foundation. It turns the old monthly infographic demo into a flexible MVP for strategic tracks, strategic goals, execution entities, KPI entry, evidence links, premium report preview, and PDF/PNG export.

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
pnpm build
pnpm dev
```

RAWAHEL Pulse does not require any platform-specific runtime, Vite runtime plugin, or injected browser debug assets. If OAuth environment variables are absent, the server provides a local admin session for MVP/demo operation.

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
4. External storage upload is best-effort only and is not required for MVP operation.

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
pnpm build
```

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
