# RAWAHEL Pulse Full Solution Readiness Review

Audit date: 2026-06-21

Scope: full solution readiness and deployment-readiness review for RAWAHEL Pulse. This review intentionally avoids new major feature scope and focuses on proving the current complete operational solution is safe for Rawahel team use: access control, data integrity, submission links, export readiness, admin operations, README/operator guidance, and verification commands.

## 1. Access Control Review

Protected authenticated routes:

- `/`
- `/reports`
- `/reports/:id`
- `/reports/:id/preview`
- `/history`
- `/compare`
- `/items`
- `/entities/:id`
- `/goals/:id`
- `/pulse`
- `/pulse/submission-links`
- `/admin`
- `/admin/:section`
- `/integrations`

Public routes:

- `/submit/:token`
- `/submit/:token/success`
- `/404`

Protected API surfaces:

- `reports.*` procedures use `protectedProcedure` or permission-specific procedures.
- `pulse.dashboard`, `pulse.masterData`, `pulse.reportValues`, and `pulse.metricsForEntity` are authenticated.
- `pulse.create*`, `pulse.update*`, `pulse.archive*`, submission review/approval, and approved metric edits are permission-gated server-side.
- `admin.*` procedures are protected and permission-gated.

Public API surfaces:

- `pulse.getSubmissionByToken`
- `pulse.saveSubmissionDraft`
- `pulse.submitSubmissionFinal`
- `auth.me`
- `auth.logout`

Role permissions:

| Role | Permissions |
|---|---|
| `super_admin` | Full permissions, including user management and report deletion. |
| `admin` | Report create/update/archive/cancel, metric update including approved edits, submission approval/revision, entity/strategy/KPI management, audit log view, export create. |
| `editor` | Report create/update, metric update, export create. Cannot approve submissions or edit approved values. |
| `viewer` | Authenticated read-only role. Cannot edit, approve, export, or manage users. |

Acceptance result:

- Unauthenticated API callers are blocked from admin APIs.
- Production without OAuth/session does not receive the local admin fallback.
- External `/submit/:token` remains public and standalone.
- Viewer edit attempts are blocked server-side.
- Editor approval attempts are blocked server-side.
- Admin approval and approved-value edits are allowed when permission requirements are met.
- Super Admin user management is allowed.

Evidence:

- `shared/permissions.ts`
- `server/_core/trpc.ts`
- `server/_core/context.ts`
- `server/access-control.test.ts`
- `client/src/components/DashboardLayout.tsx`
- `client/src/pages/PublicSubmission.tsx`

## 2. Data Integrity Review

Official report inclusion rules:

- Official Pulse dashboard/report calculations include only `metric_values.submissionStatus === "approved"`.
- Draft external values are excluded.
- Submitted but unapproved values are excluded.
- Rejected and archived values are excluded because the dashboard filters approved-only values.
- Approved values are included.
- Donor-facing evidence is included only after approval and only when marked donor-facing.
- Approved metric edits require `changeReason`.
- Old/new approved-value changes are written to the audit log metadata.
- Archived and cancelled reports are excluded from active report lists.
- Historical records are preserved by status changes instead of deletion.

Evidence:

- `server/db.ts` `getPulseDashboard`, `upsertPulseMetricValue`, `updatePulseMetricValueWithReason`, `archivePulseMetricValue`, `listReports`, `archiveReport`, `cancelReport`
- `server/access-control.test.ts`
- `server/pulse.operations.test.ts`

## 3. Submission Links Review

Confirmed token and scope behavior:

- `createPulseSubmissionLink` generates a raw token and stores only `tokenHash`.
- Public list/review responses strip `tokenHash` through `publicSubmissionLink`.
- Regenerating a link replaces the hash, resets review/open timestamps, and invalidates the old raw token.
- Revoked tokens cannot open, save draft, or submit final data.
- Expired tokens cannot open, save draft, or submit final data.
- Invalid/expired/revoked tokens show friendly Arabic errors through the public tRPC error messages and standalone external page.
- External submission page has no sidebar, dashboard, admin, or internal navigation links.
- Submitted data is scoped to the token's entity/report; client-sent entity/report fields are ignored and out-of-scope metric ids are rejected.

Evidence:

- `server/db.ts` submission-link functions
- `server/routers/pulse.ts` public submission procedures
- `client/src/pages/PublicSubmission.tsx`
- `server/pulse.operations.test.ts`

## 4. Report Export Review

Export behavior:

- Donor report previews use the approved-only Pulse dashboard data from `pulse.dashboard`.
- Internal report preview can show operational warnings, including pending submissions.
- Board/strategic report template is available as the strategic/annual preview option and shows goal progress/completeness.
- PDF export button exists and uses browser-side export.
- PNG export button exists and uses browser-side export.
- Export filenames are clean: `rawahel-pulse-{templateKey}-{YYYY-MM}.{pdf|png}`.
- Arabic RTL is preserved by source-level RTL layout and Arabic template rendering.
- No browser-rendered clipping was found by automated source tests; full visual export QA should still be repeated manually against seeded production-like data before launch.

Manual export smoke test result:

- Source-level export smoke: passed by static/template test coverage.
- Browser click/download smoke: passed on local dev server using report `1000`.
- PNG download filename: `rawahel-pulse-monthly-2026-06.png`.
- PDF download filename: `rawahel-pulse-monthly-2026-06.pdf`.
- RTL signal: preview HTML rendered with `dir="rtl"`.
- Expected storage warning: remote upload returned a storage configuration error because `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` were not configured. Local PDF/PNG downloads still completed, confirming the documented full-solution local export fallback.

Evidence:

- `client/src/pages/Preview.tsx`
- `client/src/lib/pdf.ts`
- `shared/pulse.ts`
- `server/report.templates.test.ts`

## 5. Admin Portal Review

Admin operations checklist:

- Create/edit/archive entity: implemented through `/pulse` and `pulse.createEntity`, `pulse.updateEntity`, `pulse.archiveEntity`.
- Manage strategic goals/tracks: implemented through `/pulse` and `pulse.createTrack`, `pulse.updateTrack`, `pulse.createGoal`, `pulse.updateGoal`.
- Manage KPI definitions: implemented through `/pulse` and `pulse.createMetricDefinition`.
- Link KPIs to goals: implemented through `pulse.linkGoalMetrics`.
- Create report: implemented through `reports.create`.
- Archive report: implemented through `/admin` and `reports.archive`.
- Cancel report: implemented through `/admin` and `reports.cancel`.
- Lock report: implemented through `/admin` and `reports.lock`.
- Duplicate report: implemented through `/admin` and `reports.duplicate`.
- Review external submission: implemented through `/pulse/submission-links` and `pulse.getSubmissionReview`.
- Approve/reject/request revision: implemented. Rejected submissions are preserved for audit and their metric/evidence rows are marked `rejected`, so they are excluded from official dashboards and donor reports.
- Edit approved metric with reason: implemented through `pulse.updateMetricValue`.
- View audit log: implemented through `/admin` and `admin.auditLog`.
- Manage users as Super Admin: implemented through `/admin` and `admin.createUser`/`admin.updateUser`.
- Manage settings as Super Admin: implemented through `/admin` and `admin.settings`/`admin.updateSettings`.
- Audit filters: implemented through `admin.auditLog` filters for actor/action/resource type.
- Export PDF/PNG: implemented through `/reports/:id/preview`.

Evidence:

- `client/src/pages/PulseAdmin.tsx`
- `client/src/pages/SubmissionLinks.tsx`
- `client/src/pages/AdminPortal.tsx`
- `client/src/pages/Preview.tsx`
- `server/routers/pulse.ts`
- `server/routers/admin.ts`
- `server/routers/reports.ts`

## 6. Deployment Readiness

Checklist:

- Database migrations applied: required before deployment.
- Seed data loaded: required before first operator use.
- Super Admin user exists: required before team use.
- Auth/session secret configured: required in production.
- Storage env vars optional but documented: confirmed.
- Export local fallback documented: confirmed.
- External submission base URL configured: recommended before sending links.
- Production build passes: verify with `pnpm build`.
- No Manus/WZZRD dependencies: no runtime dependency found in `package.json`.
- No raw tokens logged/stored: raw token is returned only at generation/regeneration; stored token is a hash.
- No fake data shown in official reports: official Pulse calculations use approved-only values.

## 7. Verification Matrix

| Requirement | Evidence |
|---|---|
| Unauthenticated cannot access admin API | `server/access-control.test.ts` |
| Viewer cannot edit | `server/access-control.test.ts` |
| Editor cannot approve | `server/access-control.test.ts` |
| Admin can approve | `server/access-control.test.ts` |
| Super Admin can manage users | `server/access-control.test.ts` |
| Archived metric value excluded from donor/dashboard report | `server/access-control.test.ts` |
| Cancelled report excluded from active list | `server/access-control.test.ts` |
| Approved value edit requires reason | `server/access-control.test.ts` |
| Audit log records old/new approved value change | `server/access-control.test.ts` |
| External route works without admin login | `server/access-control.test.ts`, `server/pulse.operations.test.ts` |
| External token cannot submit another entity/report | `server/pulse.operations.test.ts` |
| PDF/PNG export buttons render | `server/report.templates.test.ts` |

## 8. Remaining Risks

- Browser-level manual PDF/PNG export smoke should be repeated with a running app and representative seeded data before production.
- Production depends on correct OAuth, session secret, database, and initial Super Admin setup.
- Optional remote storage is best-effort; local browser export is the safe fallback for full solution readiness.
- The app is full-solution ready for controlled internal use after deployment checklist completion; the remaining work is production hardening and enterprise compliance evidence, not core solution completion.
