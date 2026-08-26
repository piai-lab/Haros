import {
  browserGeometryTestFiles,
  browserStableTestFiles,
  createBrowserTestConfig,
} from "./vitest.browser.config";

export default await createBrowserTestConfig({
  suite: "stable",
  include: browserStableTestFiles,
  exclude: browserGeometryTestFiles,
  fileParallelism: true,
  maxWorkers: 2,
  timeoutMs: 45_000,
});
