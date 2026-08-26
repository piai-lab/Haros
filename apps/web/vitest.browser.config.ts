import { fileURLToPath } from "node:url";

import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import { resolveBrowserTestPort } from "./browserTestPort";
import viteConfig from "./vite.config";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));

export const browserStableTestFiles = [
  "src/components/**/*.browser.tsx",
  "src/hooks/**/*.browser.tsx",
  "src/lib/**/*.browser.ts",
  "src/lib/**/*.browser.tsx",
];

export const browserGeometryTestFiles = [
  "src/components/**/*.geometry.browser.tsx",
  "src/hooks/**/*.geometry.browser.tsx",
  "src/lib/**/*.geometry.browser.ts",
  "src/lib/**/*.geometry.browser.tsx",
];

interface BrowserTestConfigOptions {
  suite: "all" | "stable" | "geometry";
  include: string[];
  exclude?: string[];
  fileParallelism: boolean;
  maxWorkers: number;
  timeoutMs: number;
}

export async function createBrowserTestConfig(options: BrowserTestConfigOptions) {
  const host = process.env.VITEST_BROWSER_API_HOST ?? "127.0.0.1";
  const port = await resolveBrowserTestPort({ host, suite: options.suite });

  return mergeConfig(
    viteConfig,
    defineConfig({
      // Stable, geometry, and all have different Vitest/Vite configs. Sharing
      // the default optimizer directory makes switching suites invalidate the
      // previous suite's dependency cache on every inner-loop run.
      cacheDir: `node_modules/.vite-browser-${options.suite}`,
      resolve: {
        alias: {
          "~": srcPath,
        },
      },
      test: {
        include: options.include,
        ...(options.exclude ? { exclude: options.exclude } : {}),
        maxWorkers: options.maxWorkers,
        browser: {
          enabled: true,
          provider: playwright(),
          instances: [{ browser: "chromium" }],
          headless: true,
          fileParallelism: options.fileParallelism,
          api: { host, port },
        },
        testTimeout: options.timeoutMs,
        hookTimeout: options.timeoutMs,
      },
    }),
  );
}

export default await createBrowserTestConfig({
  suite: "all",
  include: browserStableTestFiles,
  fileParallelism: true,
  maxWorkers: 2,
  timeoutMs: 90_000,
});
