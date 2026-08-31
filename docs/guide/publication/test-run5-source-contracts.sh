#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$repo_root"

bun run test:focused -- \
  apps/server/src/diagnostics/Layers/ThreadDiagnosticsQuery.integration.test.ts \
  apps/server/src/engineUsage/registry.test.ts \
  apps/server/src/usageHistory/UsageHistory.integration.test.ts \
  apps/server/src/profileStatsArchive.integration.test.ts \
  apps/server/src/threadRetention.test.ts \
  apps/server/src/managedWorktrees.integration.test.ts \
  apps/server/src/engine/engineMaintenance.integration.test.ts \
  apps/server/src/externalMcp/Layers/ExternalMcpGateway.e2e.integration.test.ts \
  apps/server/src/externalMcp/Layers/ExternalMcpService.integration.test.ts \
  apps/server/src/externalMcp/bridge.integration.test.ts \
  apps/server/src/externalMcp/executionAdmission.test.ts \
  apps/server/src/externalMcp/runtimePolicy.test.ts \
  apps/server/src/engine/engineAdapterConformance.test.ts \
  apps/server/src/engine/Layers/EngineAdapterRegistry.test.ts \
  apps/server/src/engine/Layers/EngineDiscoveryService.integration.test.ts \
  apps/web/src/engineOrdering.test.ts \
  scripts/build-desktop-artifact.test.ts \
  scripts/verify-packaged-desktop.test.ts \
  scripts/lib/packaged-legal-closure.test.ts

node scripts/check-public-identity.mjs
node scripts/check-source-adoptions.mjs

echo "run5-source-contracts=PASS test_files=19 identity=PASS source_adoptions=PASS"
