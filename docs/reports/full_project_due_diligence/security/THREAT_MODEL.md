# Threat Model

Trust boundaries: authenticated browser, public token submission page, Express/tRPC API, MySQL database, OAuth provider, optional Forge storage, production environment/secrets.

Top threats: public token guessing/abuse, unauthorized role escalation, draft data entering official reports, weak/missing production secrets, API abuse without rate limiting, large file/export misuse, audit-log retention gaps, dependency compromise.

Mitigations found: token hashing/scoping/expiry/revocation, server-side RBAC, approved-only calculations, production env readiness gate, audit logs, test coverage.

Recommended next mitigations: rate limiting, security headers, CI dependency scan, monitoring/alerts, backup/restore drills, retention policy.
