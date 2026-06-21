import { assertProductionEnv } from "../server/_core/env";

const result = assertProductionEnv();

console.log("RAWAHEL Pulse production readiness: environment checks passed.");
for (const warning of result.warnings) {
  console.warn(`Warning: ${warning}`);
}
