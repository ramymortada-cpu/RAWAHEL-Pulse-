# Source Code Exclusions

Excluded categories:

- Git internals: `.git/`
- Dependency installs: `node_modules/`
- Build outputs: `dist/`, `.next/`, `coverage/`
- Generated audit pack itself: `docs/reports/full_project_due_diligence/`
- Real environment files: `.env`, `.env.*`; `.env.example` is intentionally included as a safe template
- Private keys/certificates: `*.pem`, `*.key`, `*.crt`, `*.p12`, `*.pfx`
- Logs and local OS metadata

Included file count: 159.

The bundle reflects the current working tree, including safe uncommitted hardening files, because the audit is current-state based.
