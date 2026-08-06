// FILE: tsdown.config.ts
// Purpose: Builds the OmniMind server CLI and controls diagnostic source maps.
// Layer: Server build config
// Depends on: tsdown.

import { defineConfig } from "tsdown";

const sourcemapEnv = process.env.OMNIMIND_SERVICE_SOURCEMAP?.trim().toLowerCase();
const buildSourcemap = sourcemapEnv === "1" || sourcemapEnv === "true";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "opencode/acpSdkWorker": "src/opencode/acpSdkWorker.ts",
  },
  format: ["esm", "cjs"],
  checks: {
    legacyCjs: false,
  },
  outDir: "dist",
  sourcemap: buildSourcemap,
  clean: true,
  noExternal: (id) => id.startsWith("@omnimind/"),
  inlineOnly: false,
  banner: {
    js: "#!/usr/bin/env node\n",
  },
});
