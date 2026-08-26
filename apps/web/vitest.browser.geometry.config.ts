import { browserGeometryTestFiles, createBrowserTestConfig } from "./vitest.browser.config";

export default await createBrowserTestConfig({
  suite: "geometry",
  include: browserGeometryTestFiles,
  fileParallelism: false,
  maxWorkers: 1,
  timeoutMs: 90_000,
});
