import { describe, expect, it } from "vitest";

import { EN_MESSAGES, ZH_CN_MESSAGES } from "../i18n";

describe("OmniMind Agent ecosystem product copy", () => {
  it("keeps the package surface bilingual and bound to OmniMind Agent", () => {
    expect(EN_MESSAGES["library.packageTitle"]).toBe("OmniMind Agent packages");
    expect(ZH_CN_MESSAGES["library.packageTitle"]).toBe("OmniMind Agent 扩展包");
    expect(EN_MESSAGES["library.manageResources"]).toBe("Manage resources");
    expect(ZH_CN_MESSAGES["library.manageResources"]).toBe("管理资源");
    expect(EN_MESSAGES["library.reloadResources"]).toBe("Reload resources");
    expect(ZH_CN_MESSAGES["library.reloadResources"]).toBe("重新加载资源");
  });
});
