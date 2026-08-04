import { describe, expect, it } from "vitest";

import {
  getWorkbenchCopy,
  localizeWorkbenchTraitLabel,
  resolveWorkbenchLocale,
} from "./workbenchCopy";

const CRITICAL_KEYS = [
  "agent",
  "chat",
  "newAgent",
  "newChat",
  "settings",
  "handOff",
  "handOffThread",
  "unsentDraft",
  "projects",
  "groups",
  "groupsUnavailable",
  "recent",
  "queueMessage",
  "queueQueuedFollowUp",
  "queueCodeBlock",
  "queueSteer",
  "queueMoveNext",
  "queueEditing",
  "queueCancelEdit",
  "queueDeleteFollowUp",
  "queueActions",
  "queueEditPrompt",
  "queueDeletePrompt",
  "queueDeleteError",
  "queueReorderError",
  "queuePutError",
  "composerApproval",
  "composerQuestion",
  "composerQuestionWithOptions",
  "composerPlanFeedback",
  "composerSubagent",
  "composerFollowUp",
  "composerFollowUpWithAttachments",
  "composerDefault",
  "permissionApprovalLabel",
  "permissionAutoLabel",
  "permissionFullAccessLabel",
  "thinkingMedium",
  "productLoadingTitle",
  "productUnavailableTitle",
  "executionUnavailableTitle",
  "systemHealthServiceRecovering",
  "systemHealthHostCircuitOpen",
  "systemHealthHostRestarting",
  "systemHealthExecutionUnavailable",
  "systemHealthRetryHost",
  "productRejectedTitle",
  "productDeliveryUnknownTitle",
  "productOutcomeUnknownTitle",
  "conversationMissingTitle",
  "backToChatRecent",
  "startNewConversation",
  "models",
  "agents",
  "packages",
  "agentsBoundary",
  "packagesBoundary",
] as const;

describe("Workbench critical locale matrix", () => {
  it("resolves English and Simplified Chinese explicitly", () => {
    expect(resolveWorkbenchLocale("en-US")).toBe("en");
    expect(resolveWorkbenchLocale("zh-CN")).toBe("zh-CN");
  });

  it("keeps every new route and boundary state authored in both locales", () => {
    const english = getWorkbenchCopy("en");
    const chinese = getWorkbenchCopy("zh-CN");
    for (const key of CRITICAL_KEYS) {
      expect(english[key].trim().length, `missing en ${key}`).toBeGreaterThan(0);
      expect(chinese[key].trim().length, `missing zh-CN ${key}`).toBeGreaterThan(0);
      if (!["agent", "chat"].includes(key)) {
        expect(chinese[key], `untranslated zh-CN ${key}`).not.toBe(english[key]);
      }
    }
  });

  it("localizes stable thinking-level labels without rewriting provider-specific options", () => {
    expect(localizeWorkbenchTraitLabel("Medium", "zh-CN")).toBe("中");
    expect(localizeWorkbenchTraitLabel("xhigh", "zh-CN")).toBe("超高");
    expect(localizeWorkbenchTraitLabel("Provider special", "zh-CN")).toBe("Provider special");
  });
});
