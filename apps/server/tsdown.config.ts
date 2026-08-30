// FILE: tsdown.config.ts
// Purpose: Builds the Haros server CLI and controls diagnostic source maps.
// Layer: Server build config
// Depends on: tsdown.

import { defineConfig } from "tsdown";

const sourcemapEnv = process.env.HARNESSOS_SERVER_SOURCEMAP?.trim().toLowerCase();
const buildSourcemap = sourcemapEnv === "1" || sourcemapEnv === "true";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    restoreMigrationBackup: "src/restoreMigrationBackup.ts",
    usageHistoryIndexer: "src/usageHistory/indexerProcess.ts",
  },
  format: ["esm", "cjs"],
  checks: {
    legacyCjs: false,
  },
  outDir: "dist",
  // Bun builtins only resolve at runtime under Bun; MigrationBackup.ts guards
  // the import behind a `process.versions.bun` check.
  // `jsonc-parser` advertises a UMD file as `main`. Bundling that file into a
  // lazy server chunk preserves its relative `require("./impl/*")` calls while
  // dropping the sibling implementation files, so the packaged Electron/Node
  // server cannot load the Haros Pi runtime. Keep the package intact and let
  // the desktop dependency closure ship it with its relative files.
  external: [/^bun:/u, /^jsonc-parser(?:\/|$)/u],
  sourcemap: buildSourcemap,
  clean: true,
  noExternal: (id) => id.startsWith("@harnessos/"),
  inlineOnly: false,
  banner: {
    js: "#!/usr/bin/env node\n",
  },
});
