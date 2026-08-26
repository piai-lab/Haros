import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "../../vitest.config";

const gitIntegrationTests = [
  "src/git/Layers/GitCore.integration.test.ts",
  "src/git/Layers/GitManager.integration.test.ts",
];

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      fileParallelism: true,
      maxWorkers: 4,
      silent: "passed-only",
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["src/**/*.test.ts"],
            exclude: ["src/**/*.integration.test.ts"],
            testTimeout: 10_000,
            hookTimeout: 10_000,
          },
        },
        {
          extends: true,
          test: {
            name: "integration",
            include: ["src/**/*.integration.test.ts", "integration/**/*.integration.test.ts"],
            exclude: gitIntegrationTests,
            testTimeout: 90_000,
            hookTimeout: 90_000,
          },
        },
        {
          extends: true,
          test: {
            name: "git-integration",
            include: gitIntegrationTests,
            sequence: {
              // Every case owns a scoped temporary repository. Running the
              // lifecycle cases concurrently cuts the former 78-second Git
              // bottleneck without duplicating the shared test harness.
              concurrent: true,
            },
            testTimeout: 90_000,
            hookTimeout: 90_000,
          },
        },
      ],
    },
  }),
);
