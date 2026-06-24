# Deployment Runbook

1. Set real env from .env.example.
2. Run `pnpm check`, `pnpm test`, `pnpm readiness:production`, `pnpm build`.
3. Apply Drizzle migrations to staging/production database.
4. Seed baseline Pulse data.
5. Verify super_admin exists.
6. Start server with `NODE_ENV=production`.
7. Smoke login, admin, submit link, approval, dashboard, PDF/PNG export.
8. Confirm backup and rollback plan.
