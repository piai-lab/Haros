import {
  USAGE_HISTORY_UNKNOWN_MODEL,
  USAGE_HISTORY_UNKNOWN_WORKSPACE,
  type UsageHistoryRow,
} from "@harnessos/contracts";
import { describe, expect, it } from "vitest";

import { historyStatusKey, usageHistoryDimensionLabel } from "./ProviderUsageSettingsPanel";

const row = (overrides: Partial<UsageHistoryRow>): UsageHistoryRow => ({
  key: "key",
  sessionCount: 1,
  inputTokens: 1,
  outputTokens: 1,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  totalTokens: 2,
  estimateUncertain: true,
  ...overrides,
});
const translateTestKey = (key: string) => `translated:${key}`;

describe("ProviderUsageSettingsPanel history presentation", () => {
  it("does not collapse an intentionally cleared index into ready", () => {
    expect(historyStatusKey("idle")).toBe("settings.usageHistoryIdle");
  });

  it("localizes semantic unknown values and formats provider identities", () => {
    expect(usageHistoryDimensionLabel(row({ provider: "codex" }), translateTestKey)).toBe("Codex");
    expect(
      usageHistoryDimensionLabel(row({ model: USAGE_HISTORY_UNKNOWN_MODEL }), translateTestKey),
    ).toBe("translated:settings.usageHistoryUnknownModel");
    expect(
      usageHistoryDimensionLabel(
        row({ workspace: USAGE_HISTORY_UNKNOWN_WORKSPACE }),
        translateTestKey,
      ),
    ).toBe("translated:settings.usageHistoryUnknownWorkspace");
  });
});
