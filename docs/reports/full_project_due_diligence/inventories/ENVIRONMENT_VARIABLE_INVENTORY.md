# Environment Variable Inventory

Do not print real secret values. Evidence: `server/_core/env.ts`, `server/_core/session.ts`, `.env.example`, `client/src/const.ts`.

| Variable | Source file(s) | Purpose | Required/optional | Client/server exposure risk | Secret/non-secret | Example present | Recommendation |
|---|---|---|---|---|---|---|---|
