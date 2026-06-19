# رواحل - التقارير الشهرية | Project TODO

## Setup & Branding
- [x] Brand theme in index.css (navy #1B2A5E, light blue #4A90D9, gold #D4A843, beige bg)
- [x] Arabic RTL layout globally (dir="rtl", Cairo/Tajawal font)
- [x] Rawahel logo uploaded to webdev storage + embedded base64 for PDF
- [x] Islamic geometric pattern background (SVG vector)

## Database & Backend
- [x] Schema: reports table (month, year, status, pdf key, summary JSON)
- [x] Schema: department_data table (per department metrics, JSON)
- [x] Schema: sheet_config table (Google Sheets link)
- [x] DB helpers in server/db.ts
- [x] tRPC router: reports.list / create / get / delete
- [x] tRPC router: saveDepartment / refreshSummary
- [x] tRPC router: summary computed from department data
- [x] PDF storage via storagePut (uploadPdf + markGenerated)

## Frontend - Dashboard
- [x] DashboardLayout with RTL sidebar
- [x] Summary KPIs dashboard (5 KPIs + trend indicators)
- [x] Reports list / create new month report

## Frontend - Data Entry
- [x] Data entry forms for 9 departments:
  - [x] المكتب العلمي (Scientific Office)
  - [x] المكتب التربوي (Educational Office)
  - [x] المعاهد والمراكز (Institutes)
  - [x] المبادرات التربوية (Educational Initiatives)
  - [x] الإعلام والتواصل (Media & Communications)
  - [x] المكتب التطوعي (Volunteer Office)
  - [x] العلاقات العامة (PR)
  - [x] الموارد البشرية (HR)
  - [x] الحسابات والمالية (Finance)

## Infographic Report Generator
- [x] Professional infographic layout (Canva/Behance quality)
- [x] KPI cards section
- [x] Progress bars per department goal achievement
- [x] Pie chart (beneficiary distribution)
- [x] Bar chart (monthly beneficiary growth, falls back to programs per dept)
- [x] Department achievement cards
- [x] Islamic geometric pattern + logo + brand colors
- [x] In-browser preview before export

## PDF Export & History
- [x] PDF export of infographic (full branding, modern-screenshot + jsPDF)
- [x] Report history page (view + re-download)
- [x] Cloud storage retrieval

## Google Sheets Integration
- [x] Connect & import department data from Google Sheets (CSV public export)
- [x] Sync from sheet (long/wide format support)
- [x] Monthly auto-sync toggle (Heartbeat scheduled handler /api/scheduled/monthlySync)
- [x] growthSeries procedure for monthly beneficiary growth chart

## Testing & Polish
- [x] Vitest tests for backend procedures (15 tests passing)
- [x] Visual verification of infographic & PDF (2-page A4)
- [x] Save checkpoint

## New Features (Round 2 - confirmed)
- [x] PNG export of the infographic (social/WhatsApp) alongside PDF
- [x] Side-by-side two-month comparison page (Compare nav + reports.compare procedure)
- [x] Shared computeDelta/computeDepartmentComparison helpers in shared/comparison.ts
- [x] Tests for new logic (20 vitest passing) + visual PNG verification
- [~] Multi-user role-based access: DEFERRED by user request ("مش لازم الصلاحيات دلوقتي")

## New Features (Round 3 - Deep Data Model: named sub-items per department)
- [x] Build full named-items catalog in shared/items.ts (institutes, initiatives, courses, social platforms) with metric field defs + baseline numbers from profile PDF
- [x] Add department_items table to drizzle/schema.ts (reportId, departmentKey, itemKey, itemNameAr, itemType, metrics JSON, notes, sortOrder)
- [x] Generate migration + apply via webdev_execute_sql
- [x] DB helpers: getItemsByReport, upsertItem, deleteItem (item-aware)
- [x] Router procedures: listItems, saveItem, deleteItem, seedBaseline; summary rolls up from items
- [x] Update sheetSync to aggregate item-level data + sync department_data from items
- [x] Rebuild data entry as DepartmentItemsForm (each named item with own metric fields + baseline prefill)
- [x] Update ReportDetail to shape item data and show per-department named items + seed-all button
- [x] Seed real baseline numbers (seedBaseline / per-item / per-department)
- [x] Update Infographic to show top named items per department with their numbers
- [x] Compare page keeps working with item-aggregated department totals (no change needed)
- [x] Write/update vitest tests for item-level aggregation (37 tests passing)
- [x] Visual verification (infographic + PDF + PNG) and save checkpoint

## New Features (Round 4 - Overview, Reorder, Custom KPIs)
- [x] Backend: persist custom metric defs per item via __custom JSON inside metrics (survives save/normalize)
- [x] Backend: reorderItems procedure to persist sortOrder per department
- [x] Frontend: reuse listItems query for org-wide overview (computed beneficiaries client-side)
- [x] Frontend: Items Overview page with sortable table (by beneficiaries / department / name) + search + totals
- [x] Frontend: drag-and-drop reordering of item cards within each department (persist sortOrder, native HTML5 DnD)
- [x] Frontend: "add custom KPI" UI on each item card (label + isBeneficiary flag), included in saved metrics
- [x] Register Overview route (/items) + sidebar nav entry
- [x] Tests for custom metric aggregation (6 new, 43 total passing)
- [x] Type check passing + save checkpoint

## New Features (Round 5 - Expressive Icons)
- [x] Add ITEM_TYPE_ICON map + per-item icon overrides + itemIconName() helper in shared/items.ts
- [x] Infographic: render expressive icon badge per named item (instead of a dot)
- [x] DepartmentItemsForm: expressive icon in each item card header
- [x] ItemsOverview: expressive icon next to item name in the table
- [x] Tests for itemIconName resolution (4 new, 47 total passing)
- [x] Type check passing + save checkpoint

## New Features (Round 6 - Profile Audit & Baseline Corrections)
- [x] Audit original profile PDF (14 pages) and reconcile baselines line-by-line
- [x] Correct media/social numbers, Mahattat Sabaa metrics, scientific office production
- [x] Fix 9 mismatched item icon override keys
- [x] Profile integrity + icon validity tests (56 total passing)

## New Features (Round 7 - Growth column + highlight field)
- [x] Backend: prevReportItems procedure returns previous-month items by report date
- [x] Backend: persist `highlight` (أبرز إنجاز هذا الشهر) text per item via metrics __highlight
- [x] shared/items.ts: HIGHLIGHT_KEY + getItemHighlight helper
- [x] Items Overview: "مقارنةً بالشهر السابق" column (green/red %, "جديد", "ثابت", "—")
- [x] Item form: "أبرز إنجاز هذا الشهر" text field per item
- [x] Infographic: show the highlight text under each item (gold Award icon)
- [x] Tests for highlight persistence + no leak into aggregation (59 total passing)
- [x] Type check passing + save checkpoint
