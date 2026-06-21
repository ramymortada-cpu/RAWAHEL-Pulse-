# RAWAHEL Pulse Render + Aiven Deployment Runbook

Baseline commit: `834e500` or later.

## Production Login Decision

RAWAHEL Pulse supports two production login modes:

1. OAuth login.
2. Local email/password login.

For a free Render + Aiven deployment without an OAuth provider, use local login:

```env
LOCAL_AUTH_ENABLED=1
OAUTH_SERVER_URL=
VITE_OAUTH_PORTAL_URL=
```

There is no production local admin fallback. `NODE_ENV=production` never creates an automatic admin session.

## Required Render Environment Variables

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=mysql://USER:PASSWORD@AIVEN_HOST:AIVEN_PORT/DB_NAME?ssl-mode=REQUIRED
JWT_SECRET=replace-with-at-least-32-random-characters
VITE_APP_ID=rawahel-pulse
LOCAL_AUTH_ENABLED=1
EXTERNAL_SUBMISSION_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com
RAWAHEL_DISABLE_LOCAL_ADMIN_FALLBACK=1
```

Browser-local PDF/PNG export only:

```env
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
```

## OAuth Alternative

If you have OAuth, use:

```env
OAUTH_SERVER_URL=https://your-oauth-api.example.com
VITE_OAUTH_PORTAL_URL=https://your-oauth-portal.example.com
VITE_APP_ID=rawahel-pulse
LOCAL_AUTH_ENABLED=0
```

`OAUTH_SERVER_URL` is the backend OAuth API used by the server to exchange codes and validate JWTs.

`VITE_OAUTH_PORTAL_URL` is the browser-facing portal used by the frontend login button.

`VITE_APP_ID` is the OAuth app/project id and is also stored in the session token.

## Render Commands

Build command:

```bash
pnpm install && pnpm check && pnpm test && pnpm readiness:production && pnpm build
```

Start command:

```bash
pnpm start
```

## Apply Database Migrations

Run migrations against Aiven MySQL before first use:

```bash
pnpm db:push
```

Confirm this migration is included:

```text
drizzle/0007_full_solution_controls.sql
```

## Create First Super Admin

After `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, and `LOCAL_AUTH_ENABLED=1` are set:

```bash
SUPER_ADMIN_EMAIL=admin@example.com \
SUPER_ADMIN_PASSWORD='Use-A-Strong-Password-123' \
SUPER_ADMIN_NAME='مدير نبض رواحل' \
pnpm create:super-admin
```

The password is stored as a `scrypt` hash in `users.passwordHash`.

## Confirm Production Safety

Run:

```bash
pnpm readiness:production
```

Expected:

- Passes when `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, and either OAuth or `LOCAL_AUTH_ENABLED=1` are configured.
- Fails if `JWT_SECRET` is missing/weak.
- Fails if neither OAuth nor local auth is enabled.
- Warns only if optional remote storage is not configured.

## Login URL

```text
/admin
```

With local auth, enter the first super admin email/password.

## Export Behavior

When remote storage variables are empty, PDF and PNG are downloaded directly by the browser. Nothing is uploaded to remote storage.

## First Operating Workflow

1. Open `/admin`.
2. Login with the super admin email/password.
3. Create a report from `/reports`.
4. Enter values from `/pulse#values`.
5. Generate external link from `/pulse/submission-links`.
6. Manager opens `/submit/:token` and submits.
7. Admin reviews and approves from `/pulse/submission-links`.
8. Export donor report from `/reports/:id/preview`.
