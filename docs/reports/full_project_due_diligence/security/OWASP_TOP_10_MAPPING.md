# OWASP Top 10 Mapping

- A01 Broken Access Control: RBAC middleware exists; keep object-level tests.
- A02 Cryptographic Failures: production JWT secret guard exists; real secret rotation not found.
- A03 Injection: Drizzle ORM helps; sheet/URL input validation should remain tested.
- A04 Insecure Design: approved-only workflow reduces reporting-integrity risk.
- A05 Security Misconfiguration: production readiness gate reduces missing-env risk; HTTP header/rate-limit hardening not found.
- A07 Identification/Auth Failures: OAuth/session flow exists; MFA policy not found.
- A09 Logging/Monitoring Failures: audit log exists; observability/alerts not found.
- A10 SSRF: optional storage/OAuth URLs require controlled env values.
