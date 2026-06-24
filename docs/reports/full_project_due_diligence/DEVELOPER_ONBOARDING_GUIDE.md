# Developer Onboarding Guide

Prerequisites: Node.js 22-compatible runtime, pnpm, MySQL for production-like work.

Setup: copy `.env.example` to local environment outside git; run `pnpm install`; use `pnpm dev` for local development.

Verification: `pnpm check`, `pnpm test`, `pnpm readiness:production` with real env values, and `pnpm build`.

Database: use `pnpm db:push` only against intended development/staging database; do not run production migrations without backup/change approval.

Conventions: keep RBAC server-side, preserve approved-only report rules, avoid storing raw submission tokens, update tests for permission/data-integrity changes.
