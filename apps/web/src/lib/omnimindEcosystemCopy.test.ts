import { describe, expect, it } from "vitest";

import { EN_MESSAGES, ZH_CN_MESSAGES } from "../i18n";

describe("OmniMind Agent ecosystem product copy", () => {
  it("keeps the package surface bilingual and bound to OmniMind Agent", () => {
    expect(EN_MESSAGES["library.packageTitle"]).toBe("OmniMind Agent packages");
    expect(ZH_CN_MESSAGES["library.packageTitle"]).toBe("OmniMind Agent 扩展包");
    expect(EN_MESSAGES["library.manageResources"]).toBe("Manage resources");
    expect(ZH_CN_MESSAGES["library.manageResources"]).toBe("管理资源");
    expect(EN_MESSAGES["library.reloadActiveTaskResources"]).toBe("Reload current task");
    expect(ZH_CN_MESSAGES["library.reloadActiveTaskResources"]).toBe("重新加载当前任务");
    expect(EN_MESSAGES["library.reloadState.different_engine"]).toBe(
      "This task is not using OmniMind Agent.",
    );
    expect(ZH_CN_MESSAGES["library.reloadState.different_engine"]).toBe(
      "此任务没有使用 OmniMind Agent。",
    );
    expect(EN_MESSAGES["library.reloadState.no_active_session"]).toBe(
      "This task is no longer running. Reopen it and try again.",
    );
    expect(ZH_CN_MESSAGES["library.reloadState.no_active_session"]).toBe(
      "此任务当前未运行，请重新打开任务后再试。",
    );
    expect(EN_MESSAGES["library.removePackageTitle"]).toBe("Remove {package}?");
    expect(ZH_CN_MESSAGES["library.removePackageTitle"]).toBe("移除 {package}？");
  });
});
