import { fileURLToPath } from "node:url";
import { defineBrowserCommand, playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));

interface ChromiumCdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
}

const collectBrowserHeap = defineBrowserCommand(async ({ provider, sessionId }) => {
  const session = (await provider.getCDPSession?.(sessionId)) as ChromiumCdpSession | undefined;
  if (!session) {
    throw new Error("The browser profile requires Chromium CDP heap access.");
  }
  await session.send("HeapProfiler.collectGarbage");
  return session.send("Runtime.getHeapUsage");
});

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      alias: {
        "~": srcPath,
      },
    },
    test: {
      include: [
        "src/components/**/*.browser.tsx",
        "src/lib/**/*.browser.ts",
        "src/lib/**/*.browser.tsx",
      ],
      // Performance proofs require their dedicated command surface, serial execution,
      // host metadata and longer budgets. The performance profile explicitly re-enables
      // these exact files after inheriting this default exclusion.
      exclude: [
        "src/components/chat/ConversationPerformance.browser.tsx",
        "src/components/WorkbenchPerformance.browser.tsx",
        "src/components/ProductRoutePerformance.browser.tsx",
      ],
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: "chromium" }],
        headless: true,
        commands: { collectBrowserHeap },
        api: {
          // Vitest's default 63315 falls inside common Windows/Hyper-V
          // excluded-port ranges. Keep the local browser harness on IPv4 and
          // allow CI or developers to override the fallback port.
          host: process.env.VITEST_BROWSER_API_HOST ?? "127.0.0.1",
          port: Number(process.env.VITEST_BROWSER_API_PORT ?? 51_100),
        },
      },
      // The full desktop route graph can take more than 30 seconds to compile
      // on a cold Windows cache before an individual browser test can proceed.
      testTimeout: 90_000,
      hookTimeout: 90_000,
    },
  }),
);
