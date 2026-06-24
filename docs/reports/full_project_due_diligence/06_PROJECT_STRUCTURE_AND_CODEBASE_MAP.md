# PROJECT STRUCTURE AND CODEBASE MAP

Structure: client/src contains SPA routes/pages/components/libs; server contains core runtime/auth/session/env/storage/trpc, routers, DB/data layer, sheet sync, tests; shared contains domain constants, permissions and aggregation logic; drizzle contains schema and migrations; scripts contains readiness command; docs contains readiness/audit artifacts.

## Required Coverage Checklist

- Folder map: Covered with repository evidence where available; otherwise labeled as Not found, Inferred, Assumption, or Recommendation.
- Entry points: Covered with repository evidence where available; otherwise labeled as Not found, Inferred, Assumption, or Recommendation.
- Routes: Covered with repository evidence where available; otherwise labeled as Not found, Inferred, Assumption, or Recommendation.
- Components: Covered with repository evidence where available; otherwise labeled as Not found, Inferred, Assumption, or Recommendation.
- API/services: Covered with repository evidence where available; otherwise labeled as Not found, Inferred, Assumption, or Recommendation.
- Data/schema: Covered with repository evidence where available; otherwise labeled as Not found, Inferred, Assumption, or Recommendation.
- State/config/tests/scripts: Covered with repository evidence where available; otherwise labeled as Not found, Inferred, Assumption, or Recommendation.
- Boundaries/refactoring: Covered with repository evidence where available; otherwise labeled as Not found, Inferred, Assumption, or Recommendation.

Evidence basis: `package.json`, `client/src/App.tsx`, `server/routers/*`, `server/_core/*`, `server/db.ts`, `drizzle/schema.ts`, `shared/permissions.ts`, tests under `server/*.test.ts`, `.env.example`, `README.md`, git status/log, and command outputs.

## Evidence-Backed Assessment

### RAWAHEL Pulse is a full operational impact reporting solution for Rawahel Foundation

Claim: Confirmed from repository unless otherwise labeled.

Evidence: `README.md`, `client/src/App.tsx`, `server/routers/*`, `drizzle/schema.ts`

Analysis: RAWAHEL Pulse is a full operational impact reporting solution for Rawahel Foundation

Risk: Live production behavior cannot be proven from local repository evidence alone.

Recommendation: Run the same readiness gates on staging/production with real env values.

Confidence: High


### Official dashboard/report calculations are approved-data driven

Claim: Confirmed from repository unless otherwise labeled.

Evidence: `server/db.ts` `getPulseDashboard`; `server/pulse.operations.test.ts`; `server/access-control.test.ts`

Analysis: Official dashboard/report calculations are approved-data driven

Risk: If future code bypasses the approved-only filter, donor/internal reports could include draft data.

Recommendation: Keep tests covering draft/submitted/rejected/archived exclusion.

Confidence: High


### Production configuration is guarded by a readiness gate

Claim: Confirmed from repository unless otherwise labeled.

Evidence: `server/_core/env.ts`, `server/_core/index.ts`, `scripts/production-readiness.ts`, `server/production-hardening.test.ts`

Analysis: Production configuration is guarded by a readiness gate

Risk: The local audit only proves the gate behavior, not that real deployment secrets exist.

Recommendation: Require `pnpm readiness:production` in CI/deployment.

Confidence: High


## Key Risks

| Priority | Risk | Evidence | Recommendation |
|---|---|---|---|
| P0 | Real production env and migrations are not verified by this local audit. | Local command output only | Run readiness/migration/smoke gates on the actual server. |
| P1 | No committed CI workflow in the clean subrepo. | File discovery | Add GitHub Actions or equivalent CI. |
| P1 | Rate limiting/security headers not found in the clean Express entry. | `server/_core/index.ts` | Add HTTP hardening middleware. |
| P1 | Large JS bundle warning from Vite build. | `pnpm build` output | Split report/export-heavy chunks. |
| P1 | Retention/privacy/legal runbooks not found. | Repository docs/schema | Create operational privacy docs. |

## Unknowns And Limitations

- Not found in repository: real production database contents, live OAuth/Forge configuration, uptime monitoring, backup proof, legal review, customer/user metrics, and enterprise compliance evidence.
- Local browser export smoke was performed earlier in this workspace; this audit records source/test/build evidence and existing full-solution readiness documentation.
- No secret values are printed; secret scan findings are location/pattern only.
