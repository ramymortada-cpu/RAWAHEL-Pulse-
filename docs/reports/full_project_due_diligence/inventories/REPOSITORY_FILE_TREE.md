# Repository File Tree

Status: Confirmed from repository.

Important folders:
- `client/src`: React frontend, routes, pages, components, export UI.
- `server`: Express/tRPC backend, auth, routers, DB/data functions, tests.
- `shared`: shared permissions, domain constants, aggregation logic, report naming.
- `drizzle`: MySQL schema and migrations.
- `scripts`: operational readiness script.
- `docs`: solution readiness documentation and this audit pack.

Generated/dependency/local folders excluded from the source bundle: `.git/`, `node_modules/`, `dist/`, `.next/`, and `docs/reports/full_project_due_diligence/`.

Git working tree status:

```
## main...origin/main
 M README.md
 M docs/FULL_SOLUTION_READINESS_REVIEW.md
 M package.json
 M server/_core/env.ts
 M server/_core/index.ts
 M server/_core/session.ts
?? .env.example
?? scripts/
?? server/production-hardening.test.ts
```

Files discovered for source evidence:

```
.gitkeep
patches/wouter@3.7.1.patch
pnpm-lock.yaml
```
