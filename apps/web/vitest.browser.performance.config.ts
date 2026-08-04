import os from "node:os";
import { defineBrowserCommand } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import browserConfig from "./vitest.browser.config";

interface ChromiumCdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

const collectBrowserHeap = defineBrowserCommand(async ({ provider, sessionId }) => {
  const session = (await provider.getCDPSession?.(sessionId)) as ChromiumCdpSession | undefined;
  if (!session) {
    throw new Error("The performance profile requires Chromium CDP heap access.");
  }

  await session.send("HeapProfiler.collectGarbage");
  const usage = (await session.send("Runtime.getHeapUsage")) as {
    usedSize: number;
    totalSize: number;
    embedderHeapUsedSize?: number;
    backingStorageSize?: number;
  };
  return usage;
});

const readPerformanceHost = defineBrowserCommand(() => {
  const cpus = os.cpus();
  return {
    platform: os.platform(),
    architecture: os.arch(),
    cpuModel: cpus[0]?.model ?? "unknown",
    logicalCpuCount: cpus.length,
    totalMemoryBytes: os.totalmem(),
  };
});

const performanceConfig = mergeConfig(
  browserConfig,
  defineConfig({
    test: {
      browser: {
        commands: {
          collectBrowserHeap,
          readPerformanceHost,
        },
        fileParallelism: false,
        viewport: { width: 1_440, height: 900 },
        screenshotFailures: false,
      },
      hookTimeout: 120_000,
      testTimeout: 120_000,
    },
  }),
);

// mergeConfig intentionally concatenates arrays. Performance must replace the broad browser
// include rather than append to it, otherwise this command silently runs the entire UI suite.
performanceConfig.test ??= {};
performanceConfig.test.include = [
  "src/components/chat/ConversationPerformance.browser.tsx",
  "src/components/WorkbenchPerformance.browser.tsx",
];

export default performanceConfig;
