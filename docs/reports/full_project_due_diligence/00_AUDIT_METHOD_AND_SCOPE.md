# Audit Method And Scope

Methodology: static source review, safe command discovery, route/API/schema/test/config inspection, secret pattern scan, artifact generation, and evidence-labeled analysis.

Inspected: root files, hidden config, package/lock files, React routes/pages/components, tRPC routers, server core/auth/env/session, DB layer, Drizzle schema/migrations, shared permissions/domain logic, tests, scripts, README/docs, generated current-state files, and git metadata.

Not inspected: live production database, real OAuth provider, real Forge storage, external monitoring, legal documents outside repository, and private infrastructure.

Evidence standards: file paths, commands, command outcomes, git metadata, and generated inventories. Claims are labeled or phrased as confirmed/inferred/not found/recommendation.

Source-code bundle methodology: current filesystem source files are included after excluding generated/dependency/private categories and running a secret scan.
